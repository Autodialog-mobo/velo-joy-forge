// Server-only client for the Velopass Third Party API (X-Api-Key auth).
// Staging/live is chosen by VELOPASS_THIRDPARTY_API_URL; key by VELOPASS_THIRDPARTY_API_KEY,
// falling back to the existing live key used for branding.
import { interpretCreateBikeShopResponse, type CreateBikeShopBody, type CreateBikeShopOutcome } from "./velopass-bikeshops";

export function thirdPartyConfig() {
  const baseUrl = (process.env["VELOPASS_THIRDPARTY_API_URL"] || "https://thirdpartyapi.prod.velopass.com").replace(/\/+$/, "");
  const apiKey = process.env["VELOPASS_THIRDPARTY_API_KEY"] || process.env["VELOPASS_BRANDING_API_KEY_LIVE"] || "";
  return { baseUrl, apiKey };
}

export async function createBikeShop(body: CreateBikeShopBody): Promise<CreateBikeShopOutcome & { rawStatus: number; raw: any }> {
  const { baseUrl, apiKey } = thirdPartyConfig();
  if (!apiKey) return { kind: "error", status: 0, message: "Velopass API-key ontbreekt op de server.", rawStatus: 0, raw: null };
  const res = await fetch(`${baseUrl}/api/v1/bike-shops`, {
    method: "POST",
    headers: { "X-Api-Key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: any = text;
  try { parsed = text ? JSON.parse(text) : null; } catch { /* keep text */ }
  if (!res.ok) console.warn("[bike-shops] create failed", { status: res.status, body: text.slice(0, 1000) });
  return { ...interpretCreateBikeShopResponse(res.status, parsed), rawStatus: res.status, raw: parsed };
}

/** Geocode an address via the Google Maps connector (Geocoding API). */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | { error: string }> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const gmapsKey = process.env["GOOGLE_MAPS_API_KEY"];
  if (!lovableKey || !gmapsKey) return { error: "Google Maps-koppeling ontbreekt op de server." };
  const res = await fetch(
    `https://connector-gateway.lovable.dev/google_maps/maps/api/geocode/json?address=${encodeURIComponent(address)}`,
    { headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": gmapsKey } },
  );
  if (res.status === 403) return { error: "Google Maps weigerde de adresopzoeking (403). Controleer de Maps-sleutel." };
  if (!res.ok) return { error: `Adresopzoeking mislukt [${res.status}]: ${(await res.text()).slice(0, 200)}` };
  const j: any = await res.json();
  const loc = j?.results?.[0]?.geometry?.location;
  if (j?.status !== "OK" || typeof loc?.lat !== "number") return { error: `Adres niet gevonden (${j?.status ?? "onbekend"}).` };
  return { lat: loc.lat, lng: loc.lng };
}
