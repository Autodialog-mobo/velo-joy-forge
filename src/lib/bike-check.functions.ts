import { createServerFn } from "@tanstack/react-start";

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

export const checkBike = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string }) => {
    if (!input || typeof input.code !== "string" || !input.code.trim()) {
      throw new Error("code_required");
    }
    return { code: input.code.trim() };
  })
  .handler(async ({ data }): Promise<BikeCheckResult> => {
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
