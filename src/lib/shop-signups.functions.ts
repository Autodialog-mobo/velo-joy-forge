import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireAuth0Admin } from "@/integrations/auth0/middleware";
import { z } from "zod";

// legacy Supabase role-assertion helper removed — Auth0 middleware now verifies b2b_admin.

export const listShopSignups = createServerFn({ method: "POST" })
  .middleware([requireAuth0Admin])
  .inputValidator((d: unknown) => d ?? {})
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("shop_signups")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      console.error("[shop-signups] list failed", { userId: context.userId, error });
      throw new Error(error.message);
    }
    return { rows: data ?? [] };
  });




export const setShopSignupManagementId = createServerFn({ method: "POST" })
  .middleware([requireAuth0Admin])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      // Empty string / null clears the link so the shop can be pushed again.
      managementId: z
        .union([z.string().trim().uuid("Ongeldig organisation-id (moet een UUID zijn)"), z.literal(""), z.null()])
        .transform((v) => (v === "" || v === null ? null : v)),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: before, error: fetchErr } = await (supabaseAdmin as any)
      .from("shop_signups")
      .select("id, pushed_to_pro_management_id, pushed_to_pro_at, shop_name, email")
      .eq("id", data.id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!before) throw new Error("Aanmelding niet gevonden");

    const nowIso = new Date().toISOString();
    const patch: any = {
      pushed_to_pro_management_id: data.managementId,
      updated_at: nowIso,
    };
    // If we're linking a management-id but the signup was never marked as pushed,
    // also stamp pushed_to_pro_at so the UI treats it as doorgestuurd.
    if (data.managementId && !before.pushed_to_pro_at) {
      patch.pushed_to_pro_at = nowIso;
      patch.pushed_to_pro_by = context.userId;
    }

    const { error } = await (supabaseAdmin as any)
      .from("shop_signups")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    const { writeAudit } = await import("@/lib/audit.server");
    await writeAudit(context, {
      action: data.managementId ? "shop_signup.set_management_id" : "shop_signup.clear_management_id",
      target_type: "shop_signup",
      target_id: data.id,
      metadata: {
        shop_name: before.shop_name ?? null,
        email: before.email ?? null,
        from: before.pushed_to_pro_management_id ?? null,
        to: data.managementId,
      },
    });

    return { ok: true as const, managementId: data.managementId };
  });

export const resetShopSignupProPush = createServerFn({ method: "POST" })
  .middleware([requireAuth0Admin])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: before, error: fetchErr } = await (supabaseAdmin as any)
      .from("shop_signups")
      .select("id, pushed_to_pro_management_id, pushed_to_pro_at, shop_name, email")
      .eq("id", data.id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!before) throw new Error("Aanmelding niet gevonden");

    const { error } = await (supabaseAdmin as any)
      .from("shop_signups")
      .update({
        pushed_to_pro_at: null,
        pushed_to_pro_by: null,
        pushed_to_pro_by_email: null,
        pushed_to_pro_by_name: null,
        pushed_to_pro_management_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    const { writeAudit } = await import("@/lib/audit.server");
    await writeAudit(context, {
      action: "shop_signup.reset_pro_push",
      target_type: "shop_signup",
      target_id: data.id,
      metadata: {
        shop_name: before.shop_name ?? null,
        email: before.email ?? null,
        previous_management_id: before.pushed_to_pro_management_id ?? null,
        previous_pushed_at: before.pushed_to_pro_at ?? null,
      },
    });

    return { ok: true as const };
  });


const nullableStr = (max: number) =>
  z.string().trim().max(max).nullable().optional().transform((v) => (v === "" ? null : v));

const updateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["new", "contacted", "converted", "rejected"]).optional(),
  admin_notes: z.string().max(4000).nullable().optional(),
  first_name: nullableStr(120),
  last_name: nullableStr(120),
  shop_name: nullableStr(200),
  email: z.string().trim().email().max(255).nullable().optional().transform((v) => (v === "" ? null : v)),
  phone: nullableStr(60),
  vat: nullableStr(60),
  address: nullableStr(500),
  country: nullableStr(120),
  lang: z.enum(["nl", "fr", "de", "en", "es"]).nullable().optional(),
  pos_system: nullableStr(120),
  pos_other: nullableStr(200),
  website: nullableStr(300),
});

const EDITABLE_FIELDS = [
  "first_name","last_name","shop_name","email","phone","vat","address","country",
  "lang","pos_system","pos_other","admin_notes","website",
] as const;

export const updateShopSignup = createServerFn({ method: "POST" })
  .middleware([requireAuth0Admin])
  .inputValidator((d: unknown) => updateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch previous values for diff logging.
    const { data: before, error: fetchErr } = await (supabaseAdmin as any)
      .from("shop_signups")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (fetchErr) {
      console.error("[shop-signups] fetch before update failed", fetchErr);
      throw new Error(fetchErr.message);
    }
    if (!before) throw new Error("Aanmelding niet gevonden");

    const patch: any = { updated_at: new Date().toISOString() };
    const changes: Record<string, { from: unknown; to: unknown }> = {};

    if (data.status !== undefined && data.status !== before.status) {
      patch.status = data.status;
      patch.status_updated_at = new Date().toISOString();
      patch.status_updated_by = context.userId;
      changes.status = { from: before.status, to: data.status };
    }
    for (const f of EDITABLE_FIELDS) {
      const val = (data as any)[f];
      if (val === undefined) continue;
      if ((before as any)[f] !== val) {
        patch[f] = val;
        changes[f] = { from: (before as any)[f] ?? null, to: val ?? null };
      }
    }

    if (Object.keys(changes).length === 0) {
      return { ok: true, changed: false };
    }

    const { error } = await (supabaseAdmin as any)
      .from("shop_signups")
      .update(patch)
      .eq("id", data.id);
    if (error) {
      console.error("[shop-signups] update failed", {
        id: data.id,
        userId: context.userId,
        error,
      });
      throw new Error(error.message);
    }

    const { writeAudit } = await import("@/lib/audit.server");
    await writeAudit(context, {
      action: "shop_signup.update",
      target_type: "shop_signup",
      target_id: data.id,
      metadata: { changes, shop_name: before.shop_name ?? null, email: before.email ?? null },
    });

    return { ok: true, changed: true };
  });

// ---------------------------------------------------------------------------
// Push a shop signup to the velopass.pro management API.
// Creates an Organisation on managementapi.prod.velopass.com by forwarding the
// admin's Auth0 bearer token (same audience as the management API).
// ---------------------------------------------------------------------------

export const pushShopSignupToVelopassPro = createServerFn({ method: "POST" })
  .middleware([requireAuth0Admin])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const request = getRequest();
    const bearer = request?.headers?.get("authorization") ?? "";
    if (!bearer.startsWith("Bearer ")) {
      return {
        ok: false as const,
        stage: "auth" as const,
        message: "Geen geldige Auth0-token beschikbaar om door te sturen. Log opnieuw in en probeer het nog eens.",
      };
    }

    const managementApiUrl =
      (process.env.VELOPASS_MANAGEMENT_API_URL || "https://managementapi.prod.velopass.com").replace(/\/+$/, "");
    const managementEndpoint = (path: string) =>
      `${managementApiUrl}${managementApiUrl.endsWith("/api") ? "" : "/api"}/${path.replace(/^\/+/, "")}`;

    const parseSignupAddress = (raw: string | null | undefined): { street: string; postal: string; city: string } => {
      const cleaned = (raw || "").replace(/\s+/g, " ").trim();
      if (!cleaned) return { street: "", postal: "", city: "" };
      const parts = cleaned.split(",").map((s) => s.trim()).filter(Boolean);
      let street = "";
      let tail = "";
      if (parts.length >= 2) {
        street = parts.slice(0, -1).join(", ");
        tail = parts[parts.length - 1];
      } else {
        const m = cleaned.match(/^(.*?)\s+((?:[A-Z]{1,2}[- ]?)?\d{4,5}(?:\s?[A-Z]{2})?)\s+(.+)$/);
        if (m) return { street: m[1].trim(), postal: m[2].trim(), city: m[3].trim() };
        return { street: cleaned, postal: "", city: "" };
      }
      const pm = tail.match(/((?:[A-Z]{1,2}[- ]?)?\d{4,5}(?:\s?[A-Z]{2})?)/);
      if (pm) {
        const postal = pm[1].trim();
        const city = tail.replace(pm[1], "").trim();
        return { street, postal, city };
      }
      return { street, postal: "", city: tail };
    };

    type CountryOption = { value: string; searchable: string[] };

    const countryLookupKey = (value: string | null | undefined) =>
      (value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");

    const countryCandidates = (input: string | null | undefined): string[] => {
      const raw = (input ?? "").trim();
      const key = countryLookupKey(raw);
      const aliases: Record<string, string[]> = {
        BE: ["Belgium", "België", "Belgique", "Belgien", "BE"],
        BELGIE: ["Belgium", "België", "Belgique", "Belgien", "BE"],
        BELGIUM: ["Belgium", "BE"],
        BELGIQUE: ["Belgium", "Belgique", "BE"],
        BELGIEN: ["Belgium", "Belgien", "BE"],
        NL: ["Netherlands", "The Netherlands", "Nederland", "Pays-Bas", "NL"],
        NEDERLAND: ["Netherlands", "Nederland", "NL"],
        NETHERLANDS: ["Netherlands", "The Netherlands", "NL"],
        THENETHERLANDS: ["The Netherlands", "Netherlands", "NL"],
        HOLLAND: ["Netherlands", "NL"],
        LU: ["Luxembourg", "Luxemburg", "LU"],
        LUXEMBURG: ["Luxembourg", "LU"],
        LUXEMBOURG: ["Luxembourg", "LU"],
        FR: ["France", "Frankrijk", "FR"],
        FRANKRIJK: ["France", "FR"],
        FRANCE: ["France", "FR"],
        DE: ["Germany", "Deutschland", "Duitsland", "DE"],
        DUITSLAND: ["Germany", "Deutschland", "DE"],
        DEUTSCHLAND: ["Germany", "Deutschland", "DE"],
        GERMANY: ["Germany", "DE"],
        GB: ["United Kingdom", "Great Britain", "GB", "UK"],
        UK: ["United Kingdom", "Great Britain", "GB", "UK"],
        UNITEDKINGDOM: ["United Kingdom", "GB"],
        GREATBRITAIN: ["Great Britain", "United Kingdom", "GB"],
        ES: ["Spain", "España", "Espana", "Spanje", "ES"],
        SPAIN: ["Spain", "ES"],
        SPANJE: ["Spain", "ES"],
        IT: ["Italy", "Italia", "Italië", "Italie", "IT"],
        ITALY: ["Italy", "IT"],
        ITALIE: ["Italy", "IT"],
        PT: ["Portugal", "PT"],
        PORTUGAL: ["Portugal", "PT"],
        AT: ["Austria", "Österreich", "Oostenrijk", "AT"],
        AUSTRIA: ["Austria", "AT"],
        OOSTENRIJK: ["Austria", "AT"],
        CH: ["Switzerland", "Schweiz", "Suisse", "Zwitserland", "CH"],
        SWITZERLAND: ["Switzerland", "CH"],
        ZWITSERLAND: ["Switzerland", "CH"],
        DK: ["Denmark", "Denemarken", "DK"],
        SE: ["Sweden", "Zweden", "SE"],
        NO: ["Norway", "Noorwegen", "NO"],
        IE: ["Ireland", "Ierland", "IE"],
        PL: ["Poland", "Polen", "PL"],
      };
      return aliases[key] ?? (raw ? [raw] : []);
    };

    const readCountryOptions = async (): Promise<CountryOption[]> => {
      const res = await fetch(managementEndpoint("Countries"), {
        method: "GET",
        headers: {
          Authorization: bearer,
          Accept: "application/json",
        },
      });
      const text = await res.text();
      if (!res.ok) {
        console.warn("[shop-signups] country lookup failed", { status: res.status, body: text.slice(0, 500) });
        return [];
      }

      let parsed: unknown = [];
      try {
        parsed = text ? JSON.parse(text) : [];
      } catch {
        console.warn("[shop-signups] country lookup returned invalid JSON", { body: text.slice(0, 500) });
        return [];
      }
      if (!Array.isArray(parsed)) return [];

      return parsed.flatMap((item): CountryOption[] => {
        if (typeof item === "string") return [{ value: item, searchable: [item] }];
        if (!item || typeof item !== "object") return [];
        const obj = item as Record<string, unknown>;
        const value = [obj.value, obj.code, obj.name, obj.label, obj.id].find((v) => typeof v === "string" && v.trim());
        if (typeof value !== "string") return [];
        const searchable = [obj.value, obj.code, obj.name, obj.label, obj.id]
          .filter((v): v is string => typeof v === "string" && v.trim().length > 0);
        return [{ value, searchable }];
      });
    };

    const resolveCountryForVelopass = (input: string | null | undefined, options: CountryOption[]): string => {
      const candidates = countryCandidates(input);
      const candidateKeys = new Set(candidates.map(countryLookupKey));
      for (const option of options) {
        if (option.searchable.some((value) => candidateKeys.has(countryLookupKey(value)))) {
          const nonIsoValue = option.searchable.find((value) => !/^[A-Z]{2}$/i.test(value.trim()));
          return /^[A-Z]{2}$/i.test(option.value.trim()) ? (nonIsoValue ?? candidates[0] ?? option.value) : option.value;
        }
      }
      // The Organisations endpoint rejects ISO codes such as "BE" in some environments;
      // if we cannot fetch the country list, prefer the English country name fallback.
      return candidates[0] ?? "";
    };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error: fetchErr } = await (supabaseAdmin as any)
      .from("shop_signups")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!row) throw new Error("Aanmelding niet gevonden");

    const { street, postal, city } = parseSignupAddress(row.address);
    const missing: Array<{ field: string; label: string; hint?: string }> = [];
    if (!row.shop_name) missing.push({ field: "shop_name", label: "Winkelnaam" });
    if (!row.phone) missing.push({ field: "phone", label: "Telefoon" });
    if (!row.vat) missing.push({ field: "vat", label: "BTW / ondernemingsnummer" });
    if (!row.email) missing.push({ field: "email", label: "E-mail" });
    if (!street) missing.push({ field: "address", label: "Straat", hint: "Vul aan in het adresveld — formaat: 'Straat 12, 1000 Brussel'." });
    if (!postal) missing.push({ field: "address", label: "Postcode", hint: "Voeg een postcode toe aan het adresveld." });
    if (!city) missing.push({ field: "address", label: "Stad", hint: "Voeg de stad toe aan het adresveld, na de postcode." });
    if (!row.country) missing.push({ field: "country", label: "Land" });
    if (missing.length) {
      return {
        ok: false as const,
        stage: "validation" as const,
        message: "Deze aanmelding kan nog niet doorgestuurd worden — enkele verplichte velden ontbreken.",
        missing,
      };
    }

    // Normalise phone to E.164-ish format expected by velopass.pro:
    // must start with '+' followed by digits, max 14 chars total.
    const digits = String(row.phone || "").replace(/[^\d]/g, "");
    // 00-prefixed international → replace leading 00 with +.
    // Bare digits starting with a country code (e.g. 32...) → prefix +.
    // Local numbers starting with 0 (e.g. 0499...) → assume Belgium, strip leading 0, prefix +32.
    let normalizedPhone = "";
    if (digits.startsWith("00")) normalizedPhone = "+" + digits.slice(2);
    else if (digits.startsWith("0")) normalizedPhone = "+32" + digits.slice(1);
    else if (digits.length > 0) normalizedPhone = "+" + digits;
    if (normalizedPhone.length > 14) normalizedPhone = normalizedPhone.slice(0, 14);

    const countryOptions = await readCountryOptions();
    const country = resolveCountryForVelopass(row.country, countryOptions);

    // Best-effort website lookup via Google Places Text Search v1, routed
    // through the Lovable connector gateway (server-side, no referrer
    // problem). Tries a series of queries from most-specific to broadest so
    // we still find a hit when the exact address doesn't match a Places
    // record. Returns a clean https URL or null; all errors are logged.
    const lookupWebsiteViaGooglePlaces = async (q: {
      name: string;
      street: string;
      postal: string;
      city: string;
      country: string;
    }): Promise<string | null> => {
      const lovableKey = process.env.LOVABLE_API_KEY || "";
      const gmapsKey = process.env.GOOGLE_MAPS_API_KEY || "";
      if (!lovableKey || !gmapsKey) {
        console.log("[shop-signups] website lookup skipped: missing gateway credentials", {
          hasLovableKey: !!lovableKey,
          hasGmapsKey: !!gmapsKey,
        });
        return null;
      }

      const name = q.name.trim();
      const cityPart = `${q.postal} ${q.city}`.trim();
      const fullAddress = [q.street, cityPart, q.country].filter(Boolean).join(", ");
      // Ordered from broad-with-city (best hit rate for small local shops) to
      // most-specific (full address) and finally name-only as a last resort.
      // Duplicates are filtered so we never spend the same query twice.
      const attempts = [
        { label: "name+city", textQuery: [name, q.city].filter(Boolean).join(" ") },
        { label: "name+city+country", textQuery: [name, q.city, q.country].filter(Boolean).join(" ") },
        { label: "name+full-address", textQuery: [name, fullAddress].filter(Boolean).join(" ") },
        { label: "name-only", textQuery: name },
      ].filter((a, i, arr) => a.textQuery && arr.findIndex((x) => x.textQuery === a.textQuery) === i);

      const trySearch = async (textQuery: string): Promise<{ status: number; websiteUri?: string; body?: unknown }> => {
        const res = await fetch("https://connector-gateway.lovable.dev/google_maps/places/v1/places:searchText", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": gmapsKey,
            "Content-Type": "application/json",
            "X-Goog-FieldMask": "places.websiteUri,places.displayName,places.formattedAddress",
          },
          body: JSON.stringify({ textQuery, maxResultCount: 3 }),
        });
        const body: any = await res.json().catch(() => ({}));
        if (!res.ok) return { status: res.status, body };
        const uri: string | undefined = body?.places?.find((p: any) => typeof p?.websiteUri === "string" && p.websiteUri)?.websiteUri;
        return { status: res.status, websiteUri: uri, body };
      };

      for (const attempt of attempts) {
        try {
          const result = await trySearch(attempt.textQuery);
          if (result.websiteUri) {
            const cleaned = result.websiteUri.trim().replace(/[#?].*$/, "").replace(/\/+$/, "");
            if (cleaned) {
              console.log("[shop-signups] Places textSearch hit", { attempt: attempt.label, textQuery: attempt.textQuery });
              return cleaned;
            }
          }
          console.log("[shop-signups] Places textSearch miss", {
            attempt: attempt.label,
            textQuery: attempt.textQuery,
            status: result.status,
            hasError: result.status >= 400,
          });
          // Hard auth/permission failure — no point in retrying other queries.
          if (result.status === 401 || result.status === 403) {
            console.warn("[shop-signups] Places textSearch aborted (auth/permission)", { status: result.status, body: result.body });
            return null;
          }
        } catch (e) {
          console.warn("[shop-signups] Places textSearch threw", { attempt: attempt.label, error: (e as any)?.message });
        }
      }
      return null;
    };

    let rawWebsite = String((row as any).website ?? "").trim();
    // Signup form doesn't ask for a website — try to auto-discover one via
    // Google Places so velopass.pro gets a siteUrl on first push.
    // Best-effort; failures are logged and non-fatal. Persist back to
    // shop_signups.website when found.
    if (!rawWebsite) {
      const discovered = await lookupWebsiteViaGooglePlaces({
        name: row.shop_name,
        street,
        postal,
        city,
        country: row.country ?? "",
      });
      if (discovered) {
        rawWebsite = discovered;
        try {
          await (supabaseAdmin as any)
            .from("shop_signups")
            .update({ website: discovered })
            .eq("id", data.id);
        } catch (e) {
          console.warn("[shop-signups] failed to persist discovered website", { id: data.id, error: (e as any)?.message });
        }
        console.log("[shop-signups] auto-discovered website", { id: data.id, website: discovered });
      }
    }
    const normalizedWebsite = rawWebsite
      ? (/^https?:\/\//i.test(rawWebsite) ? rawWebsite : `https://${rawWebsite}`)
      : "";

    const websitePayload = normalizedWebsite
      ? {
          // velopass.pro's management UI binds these fields as siteUrl/siteName.
          siteUrl: normalizedWebsite,
          siteName: row.shop_name,
          // Keep the older aliases too in case another API version reads them.
          website: normalizedWebsite,
          websiteUrl: normalizedWebsite,
        }
      : {};

    const body: {
      name: string; phone: string; type: number;
      companyNumber: string; vatNumber: string;
      transferOfOwnershipEmail: string; email: string;
      street: string; postalCode: string; city: string; country: string;
      siteUrl?: string; siteName?: string; website?: string; websiteUrl?: string;
    } = {
      name: row.shop_name,
      phone: normalizedPhone,
      type: 1, // 0 is rejected by velopass.pro; 1 = standard organisation
      companyNumber: row.vat,
      vatNumber: row.vat,
      transferOfOwnershipEmail: row.email,
      email: row.email,
      street,
      postalCode: postal,
      city,
      country,
      ...websitePayload,
    };

    // Preflight: check if an organisation with this VAT/company number already
    // exists on velopass.pro. Avoids the 400 "Organisation already exists"
    // round-trip when the shop was created before, and lets us reuse the
    // existing management-id (deep link works immediately). Match is STRICT
    // on companyNumber/vatNumber (plus country when the API returns it); a
    // secondary email+name safety net catches shops without a VAT number.
    const PF_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const pfExtractId = (o: any): string | null => {
      if (!o) return null;
      if (typeof o === "string") return PF_UUID_RE.test(o.trim()) ? o.trim() : null;
      if (typeof o !== "object") return null;
      const direct = o.id ?? o.Id ?? o.organisationId ?? o.OrganisationId
        ?? o.organizationId ?? o.OrganizationId ?? o.value ?? o.Value;
      if (typeof direct === "string" && direct.trim()) return direct.trim();
      for (const key of ["data", "result", "Data", "Result", "organisation", "Organisation"]) {
        const nested = pfExtractId(o[key]);
        if (nested) return nested;
      }
      return null;
    };
    const pfNorm = (v: unknown) => String(v ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const pfTargetVat = pfNorm(row.vat);
    const pfTargetEmail = pfNorm(row.email);
    const pfTargetName = pfNorm(row.shop_name);
    const pfTargetCountry = pfNorm(country);
    const pfMatches = (o: any): boolean => {
      if (!o || typeof o !== "object") return false;
      const pick = (keys: string[]): string => {
        for (const k of keys) {
          const v = (o as any)[k];
          if (typeof v === "string") { const n = pfNorm(v); if (n) return n; }
        }
        return "";
      };
      const orgVat = pick(["companyNumber", "CompanyNumber", "vatNumber", "VatNumber"]);
      if (pfTargetVat && orgVat && orgVat === pfTargetVat) {
        const orgCountry = pick(["country", "Country", "countryCode", "CountryCode"]);
        // If a country is returned, require it to agree (guards against
        // matching a foreign shop that happens to share a VAT string).
        if (!orgCountry || !pfTargetCountry || orgCountry === pfTargetCountry) return true;
      }
      const orgEmail = pick(["email", "Email"]);
      const orgName = pick([
        "name", "Name", "label", "Label", "displayName", "DisplayName",
        "organisationName", "OrganisationName",
      ]);
      return !!(pfTargetEmail && pfTargetName && orgEmail === pfTargetEmail && orgName === pfTargetName);
    };
    const preflightAttempts: Array<{
      path: string; status: number | null; count: number; matched: boolean; error?: string;
    }> = [];
    const preflightLookup = async (path: string): Promise<string | null> => {
      try {
        const res = await fetch(managementEndpoint(path), {
          method: "GET",
          headers: { Authorization: bearer, Accept: "application/json" },
        });
        if (!res.ok) {
          preflightAttempts.push({ path, status: res.status, count: 0, matched: false });
          return null;
        }
        const text = await res.text();
        const parsed = text ? JSON.parse(text) : null;
        const list: any[] = Array.isArray(parsed) ? parsed
          : Array.isArray(parsed?.items) ? parsed.items
          : Array.isArray(parsed?.results) ? parsed.results
          : Array.isArray(parsed?.data) ? parsed.data
          : Array.isArray(parsed?.value) ? parsed.value
          : [];
        const hit = list.find(pfMatches);
        const id = pfExtractId(hit);
        preflightAttempts.push({ path, status: res.status, count: list.length, matched: !!id });
        return id;
      } catch (e: any) {
        preflightAttempts.push({ path, status: null, count: 0, matched: false, error: e?.message });
        return null;
      }
    };
    let preflightId: string | null = null;
    if (pfTargetVat) {
      const qVat = encodeURIComponent(String(row.vat));
      const preflightPaths = [
        `Organisations?query=${qVat}`,
        `Organisations?companyNumber=${qVat}`,
        `Organisations?vatNumber=${qVat}`,
        `Organisations?search=${qVat}`,
        "Organisations/select",
        "Organisations",
      ];
      for (const p of preflightPaths) {
        const id = await preflightLookup(p);
        if (id) { preflightId = id; break; }
      }
      // Fallback: `?query=<vat>` on velopass.pro returns a narrow list where
      // items only expose {id,name,type,avatarId} — no companyNumber/email —
      // so strict pfMatches misses it. If that endpoint returns a single
      // organisation whose name matches, trust the VAT-scoped query.
      if (!preflightId) {
        try {
          const res = await fetch(managementEndpoint(`Organisations?query=${qVat}`), {
            method: "GET",
            headers: { Authorization: bearer, Accept: "application/json" },
          });
          if (res.ok) {
            const text = await res.text();
            const parsed = text ? JSON.parse(text) : null;
            const list: any[] = Array.isArray(parsed) ? parsed
              : Array.isArray(parsed?.items) ? parsed.items
              : Array.isArray(parsed?.results) ? parsed.results
              : Array.isArray(parsed?.data) ? parsed.data
              : Array.isArray(parsed?.value) ? parsed.value
              : [];
            const nameMatch = list.find((o) => {
              const n = pfNorm(o?.name ?? o?.Name);
              return n && pfTargetName && n === pfTargetName;
            });
            const id = pfExtractId(nameMatch ?? (list.length === 1 ? list[0] : null));
            if (id) {
              preflightId = id;
              preflightAttempts.push({
                path: `Organisations?query=${qVat} [fallback name-match]`,
                status: 200, count: list.length, matched: true,
              });
            }
          }
        } catch {}
      }
    }

    if (preflightId) {
      console.log("[shop-signups] preflight: organisation already exists — skipping POST", {
        id: data.id, orgId: preflightId, vat: row.vat, country,
      });
    } else {
      console.log("[shop-signups] preflight: no existing organisation matched — proceeding to POST", {
        id: data.id, vat: row.vat, attempts: preflightAttempts.length,
      });
    }

    let apiResponse: any = null;
    let apiStatus = 0;
    if (preflightId) {
      // Skip creation; simulate a successful "already exists" response so the
      // downstream flow reuses the id and marks the signup as pushed.
      apiStatus = 200;
      apiResponse = { id: preflightId, _preflight: true, message: "Organisation already exists (preflight match)" };

      // POST was skipped, so the website was never sent. If we have one,
      // fetch the existing organisation, merge the website fields, and PUT
      // the full object back — velopass.pro's PUT typically rejects partial bodies.
      if (normalizedWebsite) {
        let existing: any = null;
        try {
          const getRes = await fetch(managementEndpoint(`Organisations/${preflightId}`), {
            method: "GET",
            headers: { Authorization: bearer, Accept: "application/json" },
          });
          if (getRes.ok) {
            const t = await getRes.text();
            existing = t ? JSON.parse(t) : null;
          } else {
            console.warn("[shop-signups] preflight website update: GET failed", {
              id: data.id, orgId: preflightId, status: getRes.status,
            });
          }
        } catch (e: any) {
          console.warn("[shop-signups] preflight website update: GET threw", {
            id: data.id, error: e?.message,
          });
        }

        const orgObj = existing && typeof existing === "object"
          ? (existing.data ?? existing.result ?? existing.organisation ?? existing)
          : null;

        const attempts: Array<{ method: string; status: number; ok: boolean; body?: string }> = [];
        const tryReq = async (method: "PATCH" | "PUT", payload: any) => {
          try {
            const res = await fetch(managementEndpoint(`Organisations/${preflightId}`), {
              method,
              headers: {
                Authorization: bearer,
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify(payload),
            });
            const ok = res.status >= 200 && res.status < 300;
            let bodyPreview: string | undefined;
            if (!ok) { try { bodyPreview = (await res.text()).slice(0, 300); } catch {} }
            attempts.push({ method, status: res.status, ok, body: bodyPreview });
            return ok;
          } catch (e: any) {
            attempts.push({ method, status: 0, ok: false, body: e?.message });
            return false;
          }
        };

        let ok = false;
        ok = await tryReq("PATCH", websitePayload);
        if (!ok && orgObj) {
          const merged = { ...orgObj, ...websitePayload };
          ok = await tryReq("PUT", merged);
        }
        if (!ok) {
          ok = await tryReq("PUT", websitePayload);
        }

        console.log("[shop-signups] preflight website update", {
          id: data.id, orgId: preflightId, url: normalizedWebsite, ok, attempts,
        });
      }
    } else {
      try {
        const res = await fetch(managementEndpoint("Organisations"), {
          method: "POST",
          headers: {
            Authorization: bearer,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(body),
        });
        apiStatus = res.status;
        const text = await res.text();
        try { apiResponse = text ? JSON.parse(text) : null; } catch { apiResponse = text; }
      } catch (e: any) {
        console.error("[shop-signups] push network error", { id: data.id, error: e?.message });
        return {
          ok: false as const,
          stage: "network" as const,
          message: `Kon velopass.pro niet bereiken: ${e?.message ?? "onbekende fout"}.`,
          sentBody: body,
        };
      }
    }

    // Detect "Organisation already exists" — treat as success so the signup
    // still gets marked as pushed and the button disappears.
    const collectErrorMessages = (resp: any): string[] => {
      const out: string[] = [];
      if (!resp || typeof resp !== "object") return out;
      if (Array.isArray(resp.Errors)) {
        for (const e of resp.Errors) if (e && typeof e.Message === "string") out.push(e.Message);
      }
      if (typeof resp.title === "string") out.push(resp.title);
      if (typeof resp.detail === "string") out.push(resp.detail);
      if (typeof resp.message === "string") out.push(resp.message);
      return out;
    };
    const alreadyExists =
      apiStatus === 409 ||
      collectErrorMessages(apiResponse).some((m) => /already\s+exists/i.test(m));

    if ((apiStatus < 200 || apiStatus >= 300) && !alreadyExists) {
      console.error("[shop-signups] push failed", { id: data.id, status: apiStatus, apiResponse });
      // ASP.NET ProblemDetails style: { title, detail, errors: { field: [msgs] } }
      const problem = apiResponse && typeof apiResponse === "object" ? apiResponse : null;
      const fieldErrors: Array<{ field: string; messages: string[] }> = [];
      if (problem && problem.errors && typeof problem.errors === "object") {
        for (const [f, msgs] of Object.entries(problem.errors as Record<string, unknown>)) {
          const list = Array.isArray(msgs) ? (msgs as unknown[]).map(String) : [String(msgs)];
          fieldErrors.push({ field: f, messages: list });
        }
      }
      const title = (problem && (problem.title || problem.message)) || `Velopass.pro API gaf ${apiStatus}`;
      const detail = problem && problem.detail ? String(problem.detail) : "";
      return {
        ok: false as const,
        stage: "api" as const,
        message: String(title).slice(0, 500),
        detail: detail.slice(0, 1000) || undefined,
        apiStatus,
        fieldErrors,
        raw: typeof apiResponse === "string" ? apiResponse.slice(0, 1000) : undefined,
        sentBody: body,
      };
    }

    // Broadly extract an id from a variety of ASP.NET response shapes:
    // { id }, { Id }, { organisationId }, { OrganisationId }, { value }, { Value },
    // { data: { id } }, { result: { id } }, or a bare UUID string.
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const extractIdFromObject = (o: any): string | null => {
      if (!o) return null;
      if (typeof o === "string") return UUID_RE.test(o.trim()) ? o.trim() : null;
      if (typeof o !== "object") return null;
      const direct = o.id ?? o.Id ?? o.organisationId ?? o.OrganisationId
        ?? o.organizationId ?? o.OrganizationId ?? o.value ?? o.Value;
      if (typeof direct === "string" && direct.trim()) return direct.trim();
      for (const key of ["data", "result", "Data", "Result", "organisation", "Organisation"]) {
        const nested = extractIdFromObject(o[key]);
        if (nested) return nested;
      }
      return null;
    };
    let returnedId: string | null = extractIdFromObject(apiResponse);

    // Diagnostics for the admin panel when we cannot resolve an organisation id.
    const ID_FIELDS_CHECKED = [
      "id", "Id", "organisationId", "OrganisationId",
      "organizationId", "OrganizationId", "value", "Value",
      "data.id", "result.id", "organisation.id",
    ];
    const responseKeys: string[] =
      apiResponse && typeof apiResponse === "object" && !Array.isArray(apiResponse)
        ? Object.keys(apiResponse)
        : [];
    const missingIdFields = ID_FIELDS_CHECKED.filter((k) => {
      if (!apiResponse || typeof apiResponse !== "object") return true;
      const [top, nested] = k.split(".");
      const v = nested ? (apiResponse as any)?.[top]?.[nested] : (apiResponse as any)?.[top];
      return !(typeof v === "string" && v.trim());
    });
    const lookupAttempts: Array<{
      path: string; status: number | null; count: number;
      sampleKeys: string[] | null; matched: boolean; error?: string;
    }> = [];

    if (!returnedId) {
      console.warn("[shop-signups] push: no id in POST /Organisations response", {
        id: data.id, apiStatus,
        rawPreview: typeof apiResponse === "string"
          ? apiResponse.slice(0, 500)
          : JSON.stringify(apiResponse ?? null).slice(0, 500),
      });
    }

    // Fallback: when velopass.pro replies "already exists" (or a successful
    // response without an id), look the organisation up so we can still store
    // the management-id and produce a deep link to the shop.
    if (!returnedId) {
      const norm = (v: unknown) => String(v ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const targetVat = norm(row.vat);
      const targetEmail = norm(row.email);
      const targetName = norm(row.shop_name);
      // Strict match: the company/VAT number MUST match. Name-only or
      // email-only matches are unsafe — a French "VELOTOF" is not the same
      // organisation as a Belgian "VELOTOF" with a different company number,
      // and adding an employee to the wrong organisation is destructive.
      // As a secondary safeguard we accept a match when BOTH email and name
      // agree, which uniquely identifies the same shop in practice.
      const matches = (o: any): boolean => {
        if (!o || typeof o !== "object") return false;
        const pickNorm = (keys: string[]): string => {
          for (const k of keys) {
            const v = (o as any)[k];
            if (typeof v === "string") {
              const n = norm(v);
              if (n) return n;
            }
          }
          return "";
        };
        const orgVat = pickNorm(["companyNumber", "CompanyNumber", "vatNumber", "VatNumber"]);
        if (targetVat && orgVat && orgVat === targetVat) return true;

        const orgEmail = pickNorm(["email", "Email"]);
        const orgName = pickNorm([
          "name", "Name", "label", "Label", "text", "Text", "title", "Title",
          "displayName", "DisplayName", "organisationName", "OrganisationName",
        ]);
        if (
          targetEmail && targetName &&
          orgEmail === targetEmail && orgName === targetName
        ) return true;

        return false;
      };
      const extractId = (o: any): string | null => extractIdFromObject(o);

      const tryLookup = async (path: string): Promise<string | null> => {
        try {
          const res = await fetch(managementEndpoint(path), {
            method: "GET",
            headers: { Authorization: bearer, Accept: "application/json" },
          });
          if (!res.ok) {
            console.warn("[shop-signups] lookup HTTP error", { path, status: res.status });
            lookupAttempts.push({ path, status: res.status, count: 0, sampleKeys: null, matched: false });
            return null;
          }
          const text = await res.text();
          const parsed = text ? JSON.parse(text) : null;
          const list: any[] = Array.isArray(parsed)
            ? parsed
            : Array.isArray(parsed?.items) ? parsed.items
              : Array.isArray(parsed?.results) ? parsed.results
                : Array.isArray(parsed?.data) ? parsed.data
                  : Array.isArray(parsed?.value) ? parsed.value
                    : [];
          const sampleKeys = list[0] && typeof list[0] === "object" ? Object.keys(list[0]).slice(0, 12) : null;
          console.log("[shop-signups] lookup", { path, count: list.length, sampleKeys, sample: list[0] ?? null });
          const hit = list.find(matches);
          const id = extractId(hit);
          lookupAttempts.push({ path, status: res.status, count: list.length, sampleKeys, matched: !!id });
          return id;
        } catch (e: any) {
          console.warn("[shop-signups] lookup threw", { path, error: e?.message });
          lookupAttempts.push({ path, status: null, count: 0, sampleKeys: null, matched: false, error: e?.message });
          return null;
        }
      };

      const q = encodeURIComponent(String(row.vat || row.email || row.shop_name || ""));
      const candidates = [
        "Organisations/select",
        "Organisations",
        `Organisations?search=${q}`,
        `Organisations?query=${q}`,
        `Organisations?companyNumber=${encodeURIComponent(String(row.vat || ""))}`,
        `Organisations?vatNumber=${encodeURIComponent(String(row.vat || ""))}`,
        `Organisations?email=${encodeURIComponent(String(row.email || ""))}`,
      ];
      for (const path of candidates) {
        const id = await tryLookup(path);
        if (id) { returnedId = id; break; }
      }
      if (!returnedId) {
        console.warn("[shop-signups] lookup could not resolve organisation id", {
          id: data.id, shop_name: row.shop_name, vat: row.vat,
        });
      }
    }

    // Surface the actual velopass.pro failure reason (ProblemDetails
    // title/detail, or FluentResults Errors[].Message nested inside `detail`)
    // so the admin sees WHY the push failed instead of a generic status code.
    const apiErrorMessages: string[] = (() => {
      const msgs = collectErrorMessages(apiResponse);
      if (apiResponse && typeof (apiResponse as any).detail === "string") {
        try {
          const inner = JSON.parse((apiResponse as any).detail);
          if (Array.isArray(inner?.Errors)) {
            for (const e of inner.Errors) if (e?.Message) msgs.push(String(e.Message));
          }
        } catch { /* detail isn't nested JSON */ }
      }
      // Dedupe while keeping order.
      return Array.from(new Set(msgs.map((m) => m.trim()).filter(Boolean)));
    })();

    const idDiagnostics = returnedId ? null : {
      apiStatus,
      apiTitle: (apiResponse && typeof (apiResponse as any).title === "string")
        ? String((apiResponse as any).title) : null,
      apiDetail: (apiResponse && typeof (apiResponse as any).detail === "string")
        ? String((apiResponse as any).detail).slice(0, 800) : null,
      apiErrorMessages,
      alreadyExists,
      responseKeys,
      checkedIdFields: ID_FIELDS_CHECKED,
      missingIdFields,
      responsePreview: typeof apiResponse === "string"
        ? apiResponse.slice(0, 400)
        : JSON.stringify(apiResponse ?? null).slice(0, 800),
      lookupAttempts,
      target: {
        shop_name: row.shop_name ?? null,
        vat: row.vat ?? null,
        email: row.email ?? null,
      },
    };




    if (alreadyExists && !returnedId) {
      return {
        ok: false as const,
        stage: "duplicate" as const,
        message: "Velopass.pro meldt dat deze organisatie al bestaat, maar er werd geen veilige organisation-id gevonden om te koppelen.",
        detail: "Zoek de bestaande organisatie manueel en koppel de id, of wijzig de unieke velden van de aanmelding en probeer opnieuw door te sturen.",
        apiStatus,
        idDiagnostics,
        sentBody: body,
      };
    }

    // ---- Create employee/user under the organisation ------------------------
    // POST /api/users/pro { languageCode, email, organisationId,
    //                       firstName?, lastName? }
    // Only attempted when we have a returnedId (either fresh insert or lookup).
    // A 400 "User with given email already exists" is treated as success so
    // repeated pushes don't fail.
    let employeeStatus: number | null = null;
    let employeeResponse: any = null;
    let employeeAlreadyExists = false;
    let employeeError: string | null = null;

    if (returnedId) {
      // Language code format used by velopass.pro is `<lang>-<country>`,
      // e.g. `nl-be`, `fr-fr`. Fall back to `nl-be`.
      const langBase = (row.lang || "nl").toLowerCase().slice(0, 2);
      const countryIso = (() => {
        const raw = String(row.country || "").trim().toUpperCase();
        if (/^[A-Z]{2}$/.test(raw)) return raw.toLowerCase();
        const map: Record<string, string> = {
          BELGIE: "be", BELGIUM: "be", BELGIQUE: "be", BELGIEN: "be",
          NEDERLAND: "nl", NETHERLANDS: "nl", HOLLAND: "nl",
          FRANCE: "fr", FRANKRIJK: "fr",
          LUXEMBOURG: "lu", LUXEMBURG: "lu",
          GERMANY: "de", DUITSLAND: "de", DEUTSCHLAND: "de",
        };
        return map[raw.replace(/[^A-Z]/g, "")] || "be";
      })();
      const languageCode = `${langBase}-${countryIso}`;

      const employeeBody: Record<string, unknown> = {
        languageCode,
        email: row.email,
        organisationId: returnedId,
      };
      if (row.first_name) employeeBody.firstName = row.first_name;
      if (row.last_name) employeeBody.lastName = row.last_name;

      try {
        const res = await fetch(managementEndpoint("users/pro"), {
          method: "POST",
          headers: {
            Authorization: bearer,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(employeeBody),
        });
        employeeStatus = res.status;
        const text = await res.text();
        try { employeeResponse = text ? JSON.parse(text) : null; } catch { employeeResponse = text; }

        const msgs = collectErrorMessages(employeeResponse);
        // ProblemDetails wraps the FluentResults error string inside `detail`.
        if (employeeResponse && typeof (employeeResponse as any).detail === "string") {
          try {
            const inner = JSON.parse((employeeResponse as any).detail);
            if (Array.isArray(inner?.Errors)) {
              for (const e of inner.Errors) if (e?.Message) msgs.push(String(e.Message));
            }
          } catch { /* ignore */ }
        }
        employeeAlreadyExists = msgs.some((m) => /already\s+exists/i.test(m));

        if ((employeeStatus < 200 || employeeStatus >= 300) && !employeeAlreadyExists) {
          employeeError = msgs[0] || `velopass.pro gaf ${employeeStatus} bij het aanmaken van de gebruiker.`;
          console.error("[shop-signups] employee push failed", {
            id: data.id, status: employeeStatus, employeeResponse,
          });
        }
      } catch (e: any) {
        employeeError = `Kon gebruiker niet aanmaken: ${e?.message ?? "onbekende netwerkfout"}.`;
        console.error("[shop-signups] employee push network error", { id: data.id, error: e?.message });
      }
    }

    // Mark as converted + append note + record push metadata.
    const nowIso = new Date().toISOString();
    const claims: any = context.claims ?? {};
    let actorEmail: string | null =
      claims?.email ||
      claims?.["https://velopass.com/email"] ||
      null;
    const givenName = claims?.given_name || claims?.["https://velopass.com/given_name"] || "";
    const familyName = claims?.family_name || claims?.["https://velopass.com/family_name"] || "";
    const combined = `${givenName} ${familyName}`.trim();
    let actorName: string | null =
      claims?.name ||
      claims?.["https://velopass.com/name"] ||
      claims?.nickname ||
      claims?.["https://velopass.com/nickname"] ||
      (combined.length > 0 ? combined : null) ||
      null;

    // Access tokens rarely carry email/name — fetch /userinfo from Auth0 when
    // we only have the sub, so the note shows a human-readable actor.
    if (!actorName || !actorEmail) {
      try {
        const domain = process.env.AUTH0_DOMAIN;
        if (domain) {
          const uiRes = await fetch(`https://${domain}/userinfo`, {
            headers: { Authorization: bearer, Accept: "application/json" },
          });
          if (uiRes.ok) {
            const ui: any = await uiRes.json();
            actorEmail = actorEmail || ui?.email || null;
            const uiCombined = `${ui?.given_name ?? ""} ${ui?.family_name ?? ""}`.trim();
            actorName = actorName
              || ui?.name
              || ui?.nickname
              || (uiCombined.length > 0 ? uiCombined : null)
              || null;
          }
        }
      } catch (e: any) {
        console.warn("[shop-signups] userinfo lookup failed", e?.message);
      }
    }

    const actorLabel = actorName || actorEmail || context.userId;
    const noteAction = alreadyExists
      ? "Reeds aanwezig in velopass.pro (gemarkeerd als doorgestuurd)"
      : "Doorgestuurd naar velopass.pro";
    const employeeNoteFragment = returnedId
      ? employeeError
        ? ` — gebruiker aanmaken mislukt: ${employeeError}`
        : employeeAlreadyExists
          ? " — gebruiker reeds aanwezig"
          : employeeStatus && employeeStatus >= 200 && employeeStatus < 300
            ? ` — gebruiker aangemaakt (${row.email})`
            : ""
      : "";
    const stamp = new Date(nowIso).toLocaleString("nl-BE", {
      timeZone: "Europe/Brussels",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
    const note = `[${stamp}] ${noteAction}${returnedId ? ` (id: ${returnedId})` : ""}${employeeNoteFragment}${actorLabel ? ` door ${actorLabel}` : ""}.`;
    const admin_notes = row.admin_notes ? `${row.admin_notes}\n${note}` : note;
    await (supabaseAdmin as any)
      .from("shop_signups")
      .update({
        status: "converted",
        status_updated_at: nowIso,
        status_updated_by: context.userId,
        admin_notes,
        pushed_to_pro_at: nowIso,
        pushed_to_pro_by: context.userId,
        pushed_to_pro_by_email: actorEmail,
        pushed_to_pro_by_name: actorName,
        pushed_to_pro_management_id: returnedId,
        updated_at: nowIso,
      })
      .eq("id", data.id);


    const { writeAudit } = await import("@/lib/audit.server");
    await writeAudit(context, {
      action: "shop_signup.push_velopass_pro",
      target_type: "shop_signup",
      target_id: data.id,
      metadata: {
        shop_name: row.shop_name ?? null,
        email: row.email ?? null,
        management_id: returnedId,
        status: apiStatus,
        employee_status: employeeStatus,
        employee_already_exists: employeeAlreadyExists,
        employee_error: employeeError,
      },
    });

    return {
      ok: true as const,
      managementId: returnedId,
      alreadyExists,
      response: apiResponse,
      idDiagnostics,
      employee: {
        status: employeeStatus,
        alreadyExists: employeeAlreadyExists,
        error: employeeError,
      },
    };
  });
