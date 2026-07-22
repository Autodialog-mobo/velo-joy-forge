// Client-side A/B experiment assignment.
// Deterministic, cookie-based bucketing so a visitor keeps the same variant
// across visits. No server round-trip needed to decide the variant.

export type Variant = "A" | "B";

// The running experiment. Bump the key to start a fresh experiment (resets
// buckets). "A" is control (current page), "B" is the treatment.
export const EXPERIMENT = {
  key: "bundle_default_v1",
  variants: ["A", "B"] as Variant[],
};

const VID_COOKIE = "vp_vid";
const VID_MAX_AGE = 60 * 60 * 24 * 180; // 180 days

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, maxAge: number) {
  if (typeof document === "undefined") return;
  const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

function newVisitorId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {
    // fall through
  }
  return `v_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e9).toString(36)}`;
}

// Stable visitor id, created on first use and persisted in a cookie.
export function getVisitorId(): string {
  let vid = readCookie(VID_COOKIE);
  if (!vid) {
    vid = newVisitorId();
    writeCookie(VID_COOKIE, vid, VID_MAX_AGE);
  }
  return vid;
}

// Deterministic 50/50 split from the visitor id (FNV-1a style hash).
export function variantFor(visitorId: string): Variant {
  let h = 0x811c9dc5;
  for (let i = 0; i < visitorId.length; i++) {
    h ^= visitorId.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % 2 === 0 ? "A" : "B";
}

const FORCE_COOKIE = "vp_ab";
const FORCE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// QA/preview override. Visiting ?ab=A or ?ab=B forces that variant and remembers
// it (so it survives navigation into checkout); ?ab=off clears the override and
// returns to normal deterministic bucketing.
function forcedVariant(): Variant | null {
  if (typeof window === "undefined") return null;
  let q: string | null = null;
  try {
    q = new URLSearchParams(window.location.search).get("ab");
  } catch {
    q = null;
  }
  if (q === "A" || q === "B") writeCookie(FORCE_COOKIE, q, FORCE_MAX_AGE);
  else if (q === "off" || q === "clear" || q === "reset") writeCookie(FORCE_COOKIE, "", 0);
  const forced = readCookie(FORCE_COOKIE);
  return forced === "A" || forced === "B" ? forced : null;
}

// Resolve (and persist) this visitor's id + variant for the current experiment.
export function assignVariant(): { visitorId: string; variant: Variant } {
  const visitorId = getVisitorId();
  const variant = forcedVariant() ?? variantFor(visitorId);
  return { visitorId, variant };
}
