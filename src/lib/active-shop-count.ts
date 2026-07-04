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

/** Recomputes from the currently loaded shops.json module. */
/** Returns the deduped active shop list — single source of truth. */
export function getActiveShops<T extends RawShop = RawShop>(): T[] {
  return dedupeShopsByAddress(shopsData as RawShop[]) as unknown as T[];
}

/** Recomputes from the currently loaded shops.json module. */
export function getActiveShopCount(): number {
  return getActiveShops().length;
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
