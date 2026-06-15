import BIKE_BRANDS from "@/data/bike-brands.json";
import BRAND_ALIASES from "@/data/brand-aliases.json";

const BRANDS = BIKE_BRANDS as string[];
const ALIASES = BRAND_ALIASES as Record<string, string[]>;

/** Strip diacritics, lowercase, remove non-alphanumerics. */
export function normalizeBrandKey(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// Pre-build alias -> canonical map (alias keys normalized).
const ALIAS_TO_CANONICAL = new Map<string, string>();
for (const [canonical, list] of Object.entries(ALIASES)) {
  for (const a of list) ALIAS_TO_CANONICAL.set(normalizeBrandKey(a), canonical);
  ALIAS_TO_CANONICAL.set(normalizeBrandKey(canonical), canonical);
}

// Brand key -> canonical name (for canonical matches).
const BRAND_BY_KEY = new Map<string, string>();
for (const b of BRANDS) BRAND_BY_KEY.set(normalizeBrandKey(b), b);

/** Resolve a free-typed brand to its canonical form if possible. */
export function resolveCanonicalBrand(input: string): string {
  const key = normalizeBrandKey(input);
  if (!key) return input.trim();
  return ALIAS_TO_CANONICAL.get(key) ?? BRAND_BY_KEY.get(key) ?? input.trim();
}

export interface BrandSuggestion {
  name: string;
  /** 0 = exact, 1 = prefix, 2 = substring */
  rank: number;
}

export function searchBrands(query: string, limit = 8): BrandSuggestion[] {
  const q = normalizeBrandKey(query);
  if (!q) return [];
  const out: BrandSuggestion[] = [];
  for (const b of BRANDS) {
    const k = normalizeBrandKey(b);
    if (k === q) out.push({ name: b, rank: 0 });
    else if (k.startsWith(q)) out.push({ name: b, rank: 1 });
    else if (k.includes(q)) out.push({ name: b, rank: 2 });
  }
  out.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
  return out.slice(0, limit);
}
