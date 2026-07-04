// Single source of truth for the "aantal actieve fietswinkels" counter used
// across the site. Everything derives from src/data/shops.json via the same
// deduplication rules as the shop list, so any change to the source is
// reflected everywhere on the next render / reload / HMR update.

import { useMemo, useSyncExternalStore } from "react";
import shopsData from "@/data/shops.json";
import { dedupeShopsByAddress, type DedupeShop } from "@/lib/dedupe-shops";

export type RawShop = DedupeShop & {
  status: string;
  address: string;
  country: string;
  city: string;
  lat: number;
  lng: number;
  brands?: string[];
};

// Module-level cache: `shopsData` is a static JSON import, so dedupe once
// per module instance and reuse the result for every getActiveShops() /
// getActiveShopCount() call (MCP tool requests, React renders, ...). The
// cache is invalidated by the HMR handler below when shops.json is hot-
// replaced in dev, and naturally reset in prod on every process boot.
let cachedShops: RawShop[] | null = null;

function computeActiveShops(): RawShop[] {
  if (cachedShops === null) {
    // Equivalent to: dedupeShopsByAddress(shopsData as RawShop[]).length
    cachedShops = dedupeShopsByAddress(shopsData as RawShop[]) as RawShop[];
  }
  return cachedShops;
}

/** Returns the deduped active shop list — single source of truth. */
export function getActiveShops<T extends RawShop = RawShop>(): T[] {
  return computeActiveShops() as unknown as T[];
}

/** Recomputes from the currently loaded shops.json module. */
export function getActiveShopCount(): number {
  return computeActiveShops().length;
}

// --- HMR: notify subscribers when shops.json is hot-replaced in dev ---
type Listener = () => void;
const listeners = new Set<Listener>();
let version = 0;
const snapshot = () => version;
const subscribe = (l: Listener) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

if (import.meta.hot) {
  import.meta.hot.accept("@/data/shops.json", () => {
    cachedShops = null;
    version += 1;
    listeners.forEach((l) => l());
  });
}

/**
 * Reactive hook: returns the current active shop count and re-renders when
 * shops.json is updated (HMR in dev, natural remount on full reload in prod).
 * Uses the same dedupe logic as the shop list so the number always matches.
 */
export function useActiveShopCount(): number {
  const v = useSyncExternalStore(subscribe, snapshot, snapshot);
  return useMemo(() => getActiveShopCount(), [v]);
}
