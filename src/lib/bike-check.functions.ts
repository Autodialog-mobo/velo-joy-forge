import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/react-start/server";

export type BikeCheckStatus = "ALL_CLEAR" | "REPORTED";

export interface BikeCheckResult {
  found: boolean;
  status: BikeCheckStatus | null;
  brand: string | null;
  model: string | null;
  primaryColor: string | null;
  bikeType: string | null;
  yearOfCreation: number | null;
}

function pick<T = unknown>(obj: Record<string, unknown>, keys: string[]): T | null {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") {
      return obj[k] as T;
    }
  }
  return null;
}

// Simple in-memory rate limiter: max 10 requests per IP per minute.
// Note: state is per Worker isolate, so the cap is best-effort across the fleet.
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;
const rateBuckets = new Map<string, number[]>();

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const hits = (rateBuckets.get(ip) ?? []).filter((t) => t > cutoff);
  if (hits.length >= RATE_LIMIT_MAX) {
    rateBuckets.set(ip, hits);
    return false;
  }
  hits.push(now);
  rateBuckets.set(ip, hits);
  return true;
}

async function verifyTurnstile(token: string, remoteip: string | undefined): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  // If no secret is configured yet (placeholder phase), skip verification.
  // Once the real secret is added, every call is enforced.
  if (!secret) return true;
  if (!token) return false;
  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  if (remoteip) body.set("remoteip", remoteip);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });
  if (!res.ok) return false;
  const json = (await res.json()) as { success?: boolean };
  return Boolean(json.success);
}

export const checkBike = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string; turnstileToken?: string }) => {
    if (!input || typeof input.code !== "string" || !input.code.trim()) {
      throw new Error("code_required");
    }
    return {
      code: input.code.trim(),
      turnstileToken: typeof input.turnstileToken === "string" ? input.turnstileToken : "",
    };
  })
  .handler(async ({ data }): Promise<BikeCheckResult> => {
    const ip = getRequestIP({ xForwardedFor: true }) ?? "unknown";

    if (!rateLimit(ip)) {
      const err = new Error("rate_limited") as Error & { statusCode?: number };
      err.statusCode = 429;
      throw err;
    }

    const captchaOk = await verifyTurnstile(data.turnstileToken, ip);
    if (!captchaOk) throw new Error("captcha_failed");

    const apiKey = process.env.VELOPASS_API_KEY;
    if (!apiKey) throw new Error("server_misconfigured");

    const url = `https://thirdpartyapi.prod.velopass.com/api/Bicycles?StickerCode=${encodeURIComponent(data.code)}`;
    const res = await fetch(url, {
      method: "GET",
      headers: { "X-Api-Key": apiKey, Accept: "application/json" },
    });

    if (res.status === 404) {
      return {
        found: false,
        status: null,
        brand: null,
        model: null,
        primaryColor: null,
        bikeType: null,
        yearOfCreation: null,
      };
    }
    if (!res.ok) throw new Error(`upstream_error_${res.status}`);

    const raw = (await res.json()) as unknown;
    const bike = (Array.isArray(raw) ? raw[0] : raw) as Record<string, unknown> | null;

    if (!bike || typeof bike !== "object") {
      return {
        found: false,
        status: null,
        brand: null,
        model: null,
        primaryColor: null,
        bikeType: null,
        yearOfCreation: null,
      };
    }

    const reported = Boolean(
      pick(bike, ["isReported", "reportedAsStolen", "isStolen", "reported", "isMissing"]) ||
        String(pick(bike, ["status", "state"]) ?? "")
          .toUpperCase()
          .includes("REPORT") ||
        String(pick(bike, ["status", "state"]) ?? "")
          .toUpperCase()
          .includes("STOLEN"),
    );

    const year = pick<number | string>(bike, ["yearOfCreation", "year", "buildYear"]);
    const yearNum = year === null ? null : Number(year);

    return {
      found: true,
      status: reported ? "REPORTED" : "ALL_CLEAR",
      brand: pick<string>(bike, ["brand", "brandName", "make"]),
      model: pick<string>(bike, ["model", "modelName", "type"]),
      primaryColor: pick<string>(bike, ["primaryColor", "color", "mainColor"]),
      bikeType: pick<string>(bike, ["bikeType", "category", "frameType"]),
      yearOfCreation: yearNum !== null && !Number.isNaN(yearNum) ? yearNum : null,
    };
  });
