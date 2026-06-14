import { createServerFn } from "@tanstack/react-start";
import { getRequestIP, getRequestHeader } from "@tanstack/react-start/server";
import BIKE_BRANDS from "@/data/bike-brands.json";

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

async function normalizeBrand(raw: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return raw;
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 20,
        system:
          `You are a bicycle brand normalizer. Match the user's input to the closest brand from this list: [${(BIKE_BRANDS as string[]).join(", ")}]. If the input clearly matches one of these brands (even with spelling or phonetic errors), return that exact brand name. If it does not match any brand in the list, return the input unchanged. Return ONLY the brand name, nothing else.`,
        messages: [{ role: "user", content: raw }],
      }),
    });
    if (!response.ok) return raw;
    const data = (await response.json()) as { content?: Array<{ text?: string }> };
    const text = data?.content?.[0]?.text?.trim();
    return text && text.length > 0 ? text : raw;
  } catch {
    return raw;
  }
}

function mapBikePayload(raw: unknown): BikeCheckResult {
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
      String(pick(bike, ["status", "state"]) ?? "").toUpperCase().includes("REPORT") ||
      String(pick(bike, ["status", "state"]) ?? "").toUpperCase().includes("STOLEN"),
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
}

async function fetchByBrandFrame(
  apiKey: string,
  brand: string,
  frameNumber: string,
): Promise<BikeCheckResult | null> {
  const url = `https://thirdpartyapi.prod.velopass.com/api/Bicycles?Brand=${encodeURIComponent(brand)}&FrameNumber=${encodeURIComponent(frameNumber)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "X-Api-Key": apiKey, Accept: "application/json" },
    cache: "no-store",
    // @ts-expect-error Cloudflare Workers-specific fetch option
    cf: { cacheTtl: 0, cacheEverything: false },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`upstream_error_${res.status}`);
  const raw = (await res.json()) as unknown;
  if (Array.isArray(raw) && raw.length === 0) return null;
  const mapped = mapBikePayload(raw);
  return mapped.found ? mapped : null;
}

const NOT_FOUND: BikeCheckResult = {
  found: false,
  status: null,
  brand: null,
  model: null,
  primaryColor: null,
  bikeType: null,
  yearOfCreation: null,
};

export const checkBikeByFrame = createServerFn({ method: "POST" })
  .inputValidator((input: { brand: string; frameNumber: string; turnstileToken?: string }) => {
    if (!input || typeof input.brand !== "string" || !input.brand.trim()) {
      throw new Error("brand_required");
    }
    if (typeof input.frameNumber !== "string" || !input.frameNumber.trim()) {
      throw new Error("frame_required");
    }
    return {
      brand: input.brand.trim(),
      frameNumber: input.frameNumber.trim(),
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
    const host = (getRequestHeader("host") ?? "").toLowerCase();
    const isPreviewHost =
      host.startsWith("localhost") ||
      host.includes("id-preview--") ||
      host.includes("-dev.lovable.app");
    if (!isPreviewHost) {
      const captchaOk = await verifyTurnstile(data.turnstileToken, ip);
      if (!captchaOk) throw new Error("captcha_failed");
    }
    const apiKey = process.env.VELOPASS_API_KEY;
    if (!apiKey) throw new Error("server_misconfigured");

    // First attempt: raw brand.
    const first = await fetchByBrandFrame(apiKey, data.brand, data.frameNumber);
    if (first) return first;

    // Fallback: normalize brand via Claude, retry once if it changed.
    const normalized = await normalizeBrand(data.brand);
    if (normalized && normalized.toLowerCase() !== data.brand.toLowerCase()) {
      const second = await fetchByBrandFrame(apiKey, normalized, data.frameNumber);
      if (second) return second;
    }
    return NOT_FOUND;
  });

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

    // Skip captcha enforcement on localhost / Lovable preview domains where the
    // Turnstile site key is not whitelisted (widget returns no token).
    const host = (getRequestHeader("host") ?? "").toLowerCase();
    const isPreviewHost =
      host.startsWith("localhost") ||
      host.includes("id-preview--") ||
      host.includes("-dev.lovable.app");
    if (!isPreviewHost) {
      const captchaOk = await verifyTurnstile(data.turnstileToken, ip);
      if (!captchaOk) throw new Error("captcha_failed");
    }

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
