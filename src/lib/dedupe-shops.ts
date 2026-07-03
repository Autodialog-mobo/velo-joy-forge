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

export type DedupeReason = "same-address" | "same-coordinates";

export type DedupeMergeGroup<T> = {
  keeper: T;
  dropped: T[];
  reason: DedupeReason;
  key: string;
};

export type DedupeAudit<T> = {
  rawTotal: number;
  activeTotal: number;
  uniqueTotal: number;
  droppedInactive: number;
  kept: T[];
  merges: DedupeMergeGroup<T>[];
};

export function dedupeShopsByAddressWithAudit<T extends DedupeShop>(
  shops: readonly T[],
): DedupeAudit<T> {
  function pick(existing: T, next: T) {
    const a = existing.brands?.length ?? 0;
    const b = next.brands?.length ?? 0;
    return b > a ? next : existing;
  }

  const activeShops = shops.filter((s) => s.status === "active");

  // Pass 1: group by normalized address (fallback lat,lng when empty).
  const addrGroups = new Map<string, T[]>();
  for (const s of activeShops) {
    const raw = (s.address ?? "").trim();
    const key = raw ? normalizeAddress(raw) : `coord:${s.lat ?? ""},${s.lng ?? ""}`;
    const list = addrGroups.get(key);
    if (list) list.push(s);
    else addrGroups.set(key, [s]);
  }

  const merges: DedupeMergeGroup<T>[] = [];
  const pass1Kept: T[] = [];
  for (const [key, group] of addrGroups) {
    let keeper = group[0];
    for (let i = 1; i < group.length; i++) keeper = pick(keeper, group[i]);
    pass1Kept.push(keeper);
    if (group.length > 1) {
      merges.push({
        keeper,
        dropped: group.filter((s) => s !== keeper),
        reason: "same-address",
        key,
      });
    }
  }

  // Pass 2: group pass1 results by identical coordinates.
  const coordGroups = new Map<string, T[]>();
  const noCoord: T[] = [];
  for (const s of pass1Kept) {
    if (!s.lat || !s.lng) {
      noCoord.push(s);
      continue;
    }
    const key = `${s.lat},${s.lng}`;
    const list = coordGroups.get(key);
    if (list) list.push(s);
    else coordGroups.set(key, [s]);
  }

  const kept: T[] = [...noCoord];
  for (const [key, group] of coordGroups) {
    let keeper = group[0];
    for (let i = 1; i < group.length; i++) keeper = pick(keeper, group[i]);
    kept.push(keeper);
    if (group.length > 1) {
      merges.push({
        keeper,
        dropped: group.filter((s) => s !== keeper),
        reason: "same-coordinates",
        key,
      });
    }
  }

  return {
    rawTotal: shops.length,
    activeTotal: activeShops.length,
    uniqueTotal: kept.length,
    droppedInactive: shops.length - activeShops.length,
    kept,
    merges,
  };
}
