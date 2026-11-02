/**
 * Affiliate shop attribution (VP-815).
 *
 * A bike shop links to any velopass.com page with ?shopID=<publicId>.
 * We normalise it (trim + lowercase, ^[a-z0-9]{1,64}$), keep it 30 days in
 * localStorage (last click wins) and fall back to memory when storage fails.
 * It is never cleared after an order and never blocks checkout.
 */

export const STORAGE_KEY = "vp_affiliate_shop";
export const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const PUBLIC_ID_RE = /^[a-z0-9]{1,64}$/;

type Stored = { shopId: string; ts: number };
export type ShopBadge = { name: string; logoUrl?: string };

let memory: Stored | null = null;

/** Trim + lowercase; returns null when the value fails the publicId format. */
export function normalizeShopId(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim().toLowerCase();
  return PUBLIC_ID_RE.test(v) ? v : null;
}

/** Demo/test ids (preview only) are URL-only and never remembered. */
export function isDemoId(id: string): boolean {
  return /^vpdemo/.test(id);
}

function getStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function readStoredShopId(now = Date.now(), storage = getStorage()): string | null {
  let entry: Stored | null = memory;
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (raw) entry = JSON.parse(raw) as Stored;
  } catch {
    /* fall back to memory */
  }
  const id = normalizeShopId(entry?.shopId);
  if (!id || typeof entry?.ts !== "number" || now - entry.ts > TTL_MS) {
    try { storage?.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    memory = null;
    return null;
  }
  return id;
}

export function storeShopId(id: string, now = Date.now(), storage = getStorage()): void {
  if (isDemoId(id)) return;
  const entry: Stored = { shopId: id, ts: now };
  memory = entry;
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    /* memory fallback already set */
  }
}

/** Read ?shopID= from a query string; a valid value replaces the stored one. */
export function captureShopFromSearch(search: string, now = Date.now(), storage = getStorage()): string | null {
  let raw: string | null = null;
  try {
    raw = new URLSearchParams(search).get("shopID");
  } catch {
    return null;
  }
  const id = normalizeShopId(raw);
  if (id) storeShopId(id, now, storage);
  return id;
}

/** Call once per page load (root layout, after hydration). */
export function captureShopFromUrl(): void {
  if (typeof window === "undefined") return;
  captureShopFromSearch(window.location.search);
}

/** URL value wins (incl. demo ids); otherwise the non-expired stored value. */
export function resolveActiveShopId(): string | null {
  if (typeof window === "undefined") return null;
  return captureShopFromSearch(window.location.search) ?? readStoredShopId();
}

const STUB_SHOPS: Record<string, ShopBadge> = {
  vpdemologo: { name: "Fietsen De Ronde", logoUrl: "https://dummyimage.com/96x96/0D1F3C/2ECC8A.png&text=DR" },
  vpdemonologo: { name: "Velo Atelier Gent" },
};

function isProductionHost(): boolean {
  if (typeof window === "undefined") return true;
  return /(^|\.)velopass\.com$/.test(window.location.hostname) || window.location.hostname === "velo-joy-forge.lovable.app";
}

/** Cosmetic lookup; any failure returns null so no badge is shown. */
export async function resolveShop(shopId: string): Promise<ShopBadge | null> {
  const id = normalizeShopId(shopId);
  if (!id) return null;
  if (isDemoId(id)) return isProductionHost() ? null : STUB_SHOPS[id] ?? null;
  try {
    const res = await fetch(`/api/public/shop-badge?shop=${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<ShopBadge> | null;
    const name = typeof data?.name === "string" ? data.name.trim() : "";
    if (!name) return null;
    const logoUrl = typeof data?.logoUrl === "string" && /^https:\/\//.test(data.logoUrl) ? data.logoUrl : undefined;
    return logoUrl ? { name, logoUrl } : { name };
  } catch {
    return null;
  }
}
