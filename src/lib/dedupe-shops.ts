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
  return a.trim().toLowerCase().replace(/\s+/g, " ").replace(/,+/g, ",");
}

export function dedupeShopsByAddress<T extends DedupeShop>(shops: readonly T[]): T[] {
  const byAddr = new Map<string, T>();
  for (const s of shops) {
    if (s.status !== "active") continue;
    const raw = (s.address ?? "").trim();
    const key = raw ? normalizeAddress(raw) : `${s.lat ?? ""},${s.lng ?? ""}`;
    const existing = byAddr.get(key);
    if (!existing) {
      byAddr.set(key, s);
      continue;
    }
    const a = existing.brands?.length ?? 0;
    const b = s.brands?.length ?? 0;
    if (b > a) byAddr.set(key, s);
  }
  return Array.from(byAddr.values());
}
