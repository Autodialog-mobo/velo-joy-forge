// Deduplicates shops by normalized street address.
// Rules:
//   - Only "active" shops are considered.
//   - Address is normalized: trimmed, lowercased, whitespace collapsed,
//     repeated commas collapsed. Falls back to "lat,lng" when address is empty.
//   - When two entries share the same normalized address, the one with the
//     most brands wins. Ties keep the first one seen (stable).
//   - If neither has brands, only one is kept.

export type DedupeShop = {
  status?: string;
  address?: string;
  lat?: number;
  lng?: number;
  brands?: string[];
  [key: string]: unknown;
};

export function normalizeAddress(a: string): string {
  return a
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ",")
    .replace(/,+/g, ",");
}

export function dedupeShopsByAddress<T extends DedupeShop>(shops: readonly T[]): T[] {
  function pick(existing: T, next: T) {
    const a = existing.brands?.length ?? 0;
    const b = next.brands?.length ?? 0;
    return b > a ? next : existing;
  }

  // Pass 1: dedupe by normalized address (fallback to lat,lng when empty).
  const byAddr = new Map<string, T>();
  for (const s of shops) {
    if (s.status !== "active") continue;
    const raw = (s.address ?? "").trim();
    const key = raw ? normalizeAddress(raw) : `${s.lat ?? ""},${s.lng ?? ""}`;
    const existing = byAddr.get(key);
    byAddr.set(key, existing ? pick(existing, s) : s);
  }

  // Pass 2: collapse remaining entries that share identical coordinates
  // (e.g. same shop with slightly different address strings).
  const byCoord = new Map<string, T>();
  for (const s of byAddr.values()) {
    const key = `${s.lat ?? ""},${s.lng ?? ""}`;
    if (!s.lat || !s.lng) {
      byCoord.set(`${key}-${Math.random()}`, s);
      continue;
    }
    const existing = byCoord.get(key);
    byCoord.set(key, existing ? pick(existing, s) : s);
  }
  return Array.from(byCoord.values());
}
