/**
 * Shop attribution for the order page.
 *
 * A shop can link to /nl/order?shop=<velopass-shop-id>. We keep that id for
 * 60 days in localStorage so the attribution survives the checkout flow and a
 * later return visit. URL param always wins over the stored value.
 */

const STORAGE_KEY = "vp_shop_attribution";
const TTL_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

type Stored = { shopId: string; ts: number };

export type ShopBadge = { name: string; logoUrl?: string };

function isValidId(id: unknown): id is string {
  return typeof id === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(id);
}

/** Demo/test ids resolve from the URL but are never remembered. */
export function isDemoId(id: string): boolean {
  return /^vp_demo_/i.test(id);
}

export function readStoredShopId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    if (!isValidId(parsed?.shopId) || typeof parsed.ts !== "number") return null;
    // Purge any legacy stored demo id so it never resurfaces on a plain /order.
    if (isDemoId(parsed.shopId)) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (Date.now() - parsed.ts > TTL_MS) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed.shopId;
  } catch {
    return null;
  }
}

export function storeShopId(shopId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ shopId, ts: Date.now() } satisfies Stored),
    );
  } catch {
    // storage unavailable (private mode) — attribution is best-effort
  }
}

/** URL param wins; otherwise the non-expired stored value. */
export function resolveActiveShopId(): string | null {
  if (typeof window === "undefined") return null;
  const fromUrl = new URLSearchParams(window.location.search).get("shop");
  if (isValidId(fromUrl)) {
    storeShopId(fromUrl);
    return fromUrl;
  }
  return readStoredShopId();
}

// TEMPORARY STUB — to be replaced by Tom's backend endpoint
// (edge function "shop-badge" returning { name, logoUrl? }).
// One example shop WITH a logo and one WITHOUT, so both render paths are testable:
//   /nl/order?shop=vp_demo_logo
//   /nl/order?shop=vp_demo_nologo
const STUB_SHOPS: Record<string, ShopBadge> = {
  vp_demo_logo: {
    name: "Fietsen De Ronde",
    logoUrl: "https://dummyimage.com/96x96/0D1F3C/2ECC8A.png&text=DR",
  },
  vp_demo_nologo: { name: "Velo Atelier Gent" },
};

/**
 * Resolve shop name + optional logo. Fails safe: returns null on any error or
 * empty result so the badge is simply not rendered (never show a raw id).
 */
function isDemoEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host.includes("localhost") || host.endsWith(".lovable.app");
}

export async function resolveShop(shopId: string): Promise<ShopBadge | null> {
  if (!isValidId(shopId)) return null;
  try {
    // TEMPORARY: stub lookup until the shop-badge endpoint is live.
    // Dev/preview only — demo data must never resolve on production.
    if (isDemoEnvironment()) {
      const stub = STUB_SHOPS[shopId];
      if (stub) return stub;
    }

    const res = await fetch(`/api/public/shop-badge?shop=${encodeURIComponent(shopId)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<ShopBadge> | null;
    const name = typeof data?.name === "string" ? data.name.trim() : "";
    if (!name) return null;
    const logoUrl =
      typeof data?.logoUrl === "string" && /^https?:\/\//.test(data.logoUrl)
        ? data.logoUrl
        : undefined;
    return logoUrl ? { name, logoUrl } : { name };
  } catch {
    return null;
  }
}
