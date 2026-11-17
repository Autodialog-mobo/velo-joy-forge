// Official Velopass branding lookup (Third Party API, OrdersApp policy). Server-only: uses the velopass.com key.
export const BRANDING_BASE = "https://thirdpartyapi.prod.velopass.com";
export type Branding = { name: string; city?: string; logoUrl?: string };

export async function fetchBranding(publicId: string, apiKey: string, fetchImpl: typeof fetch = fetch): Promise<Branding | null> {
  const res = await fetchImpl(`${BRANDING_BASE}/api/v1/organisations/${encodeURIComponent(publicId)}/branding`, {
    headers: { "X-Api-Key": apiKey, Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    signal: AbortSignal.timeout(3000),
  });
  if (res.status === 401 || res.status === 403) console.warn(`[shop-branding] ${res.status}: key missing or not an OrdersApp client`);
  if (!res.ok) return null;
  const d = (await res.json()) as { name?: unknown; city?: unknown; logoUrl?: unknown };
  const name = typeof d.name === "string" ? d.name.trim() : "";
  if (!name) return null;
  const out: Branding = { name };
  if (typeof d.city === "string" && d.city.trim()) out.city = d.city.trim();
  if (typeof d.logoUrl === "string" && /^https:\/\//.test(d.logoUrl)) out.logoUrl = d.logoUrl;
  return out;
}
