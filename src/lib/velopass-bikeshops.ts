// Pure helpers for VP-887: POST /api/v1/bike-shops on the Velopass Third Party API.
// Kept free of server imports so the request/response rules can be unit-tested.

export type GeoPoint = { lat: number; lng: number };

/** A usable shop location: finite numbers, inside range, and never (0, 0). */
export function isValidLocation(p: Partial<GeoPoint> | null | undefined): p is GeoPoint {
  if (!p) return false;
  const { lat, lng } = p;
  if (typeof lat !== "number" || typeof lng !== "number") return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return false;
  return !(lat === 0 && lng === 0);
}

export type BikeShopUser = { email: string; firstName: string; lastName: string; languageCode: string; phone?: string };
export type CreateBikeShopBody = {
  name: string; phone: string; companyNumber: string; vatNumber: string;
  email: string; transferOfOwnershipEmail: string; languageCode: string;
  siteUrl?: string; siteName?: string;
  street: string; postalCode: string; city: string; country: string;
  lat: number; lng: number;
  user: BikeShopUser;
};

export type CreateBikeShopOutcome =
  | { kind: "created"; organisationId: string; publicId: string | null; proUserId: string }
  | { kind: "conflict"; organisationId: string | null; organisationPublicId: string | null; userEmailTaken: boolean; codes: string[]; message: string }
  | { kind: "validation"; message: string; errors: Record<string, string[]> }
  | { kind: "error"; status: number; message: string };

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

/** Map a bike-shops response (status + parsed JSON body) to an outcome. */
export function interpretCreateBikeShopResponse(status: number, body: unknown): CreateBikeShopOutcome {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, any>;
  if (status === 201 || status === 200) {
    const organisationId = str(b.organisationId);
    const proUserId = str(b.proUserId);
    if (organisationId && proUserId) return { kind: "created", organisationId, publicId: str(b.publicId), proUserId };
    return { kind: "error", status, message: "Velopass bevestigde de aanmaak, maar gaf geen organisationId/proUserId terug." };
  }
  if (status === 409) {
    const conflicts: any[] = Array.isArray(b.conflicts) ? b.conflicts : [];
    const codes = conflicts.map((c) => str(c?.code)).filter((c): c is string => !!c);
    const org = conflicts.find((c) => str(c?.organisationId) || str(c?.organisationPublicId));
    return {
      kind: "conflict",
      organisationId: str(org?.organisationId),
      organisationPublicId: str(org?.organisationPublicId),
      userEmailTaken: codes.includes("bike-shops/user-email-taken"),
      codes,
      message: str(b.detail) ?? str(b.title) ?? "Conflict met een bestaande winkel of gebruiker.",
    };
  }
  if (status === 400) {
    const errors: Record<string, string[]> = {};
    if (b.errors && typeof b.errors === "object") {
      for (const [k, v] of Object.entries(b.errors)) errors[k] = Array.isArray(v) ? v.map(String) : [String(v)];
    }
    const first = Object.entries(errors).map(([k, v]) => `${k}: ${v.join(", ")}`);
    return { kind: "validation", errors, message: first.join(" · ") || str(b.detail) || str(b.title) || "Velopass weigerde de gegevens (400)." };
  }
  const message = str(b.detail) ?? str(b.title) ?? (typeof body === "string" ? body.slice(0, 300) : "") ?? "";
  return { kind: "error", status, message: message || `Velopass gaf status ${status}.` };
}

/** Country as Velopass accepts it: two-letter ISO code (BE) or English name. */
export function velopassCountry(raw: string | null | undefined): string {
  const v = (raw ?? "").trim();
  if (/^[a-z]{2}$/i.test(v)) return v.toUpperCase();
  const key = v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z]/g, "");
  const map: Record<string, string> = {
    BELGIE: "BE", BELGIUM: "BE", BELGIQUE: "BE", BELGIEN: "BE",
    NEDERLAND: "NL", NETHERLANDS: "NL", THENETHERLANDS: "NL", HOLLAND: "NL", PAYSBAS: "NL",
    FRANCE: "FR", FRANKRIJK: "FR", FRANKREICH: "FR",
    LUXEMBOURG: "LU", LUXEMBURG: "LU",
    GERMANY: "DE", DUITSLAND: "DE", DEUTSCHLAND: "DE", ALLEMAGNE: "DE",
    SPAIN: "ES", SPANJE: "ES", ESPANA: "ES",
  };
  return map[key] ?? v;
}
