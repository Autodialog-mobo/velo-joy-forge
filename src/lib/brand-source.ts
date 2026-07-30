import BIKE_BRANDS from "@/data/bike-brands.json";

// Active bike brands come from the live bikesearch API. The list changes rarely,
// so we cache it in sessionStorage for the browser session and fall back to the
// bundled static list on any failure (offline, CORS, error) so autofill never
// breaks.

const BRANDS_API = "https://bikesearchapi.prod.velopass.com/api/brands";
const CACHE_KEY = "vp_active_brands_v1";

let inflight: Promise<string[]> | null = null;

function readCache(): string[] | null {
  try {
    if (typeof sessionStorage === "undefined") return null;
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    return Array.isArray(arr) && arr.length ? (arr as string[]) : null;
  } catch {
    return null;
  }
}

function writeCache(list: string[]) {
  try {
    if (typeof sessionStorage !== "undefined") sessionStorage.setItem(CACHE_KEY, JSON.stringify(list));
  } catch {
    // storage full / unavailable — ignore, we still return the fetched list
  }
}

/**
 * Resolve the list of active bike brand names. Order of preference:
 * session cache → live API (then cached) → bundled static list.
 */
export async function getBrands(): Promise<string[]> {
  const cached = readCache();
  if (cached) return cached;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch(BRANDS_API, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`brands HTTP ${res.status}`);
      const data = await res.json();
      const names = (Array.isArray(data) ? data : [])
        .map((x: any) => (typeof x === "string" ? x : x?.label || x?.value || ""))
        .map((s: string) => (typeof s === "string" ? s.trim() : ""))
        .filter(Boolean);
      const unique = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
      if (!unique.length) throw new Error("empty brands response");
      writeCache(unique);
      return unique;
    } catch {
      return BIKE_BRANDS as string[];
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
