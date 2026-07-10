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
      managementId: z.string().trim().uuid("Ongeldig organisation-id (moet een UUID zijn)"),
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
    if (!before.pushed_to_pro_at) {
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
      action: "shop_signup.set_management_id",
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
});

const EDITABLE_FIELDS = [
  "first_name","last_name","shop_name","email","phone","vat","address","country",
  "lang","pos_system","pos_other","admin_notes",
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

    const readDefaultBikeShopPackageId = async (): Promise<string | null> => {
      const res = await fetch(managementEndpoint("bike-shop-packages/select"), {
        method: "GET",
        headers: {
          Authorization: bearer,
          Accept: "application/json",
        },
      });
      const text = await res.text();
      if (!res.ok) {
        console.error("[shop-signups] package lookup failed", { status: res.status, body: text.slice(0, 1000) });
        throw new Error(`Pakketlijst ophalen mislukte (${res.status}): ${text.slice(0, 500) || "geen details"}`);
      }

      let packages: Array<{ value?: string | null; isDefault?: boolean }> = [];
      try {
        const parsed = text ? JSON.parse(text) : [];
        packages = Array.isArray(parsed) ? parsed : [];
      } catch {
        throw new Error("Pakketlijst ophalen mislukte: ongeldig antwoord van velopass.pro.");
      }

      const selected = packages.find((p) => p?.isDefault && p.value) ?? packages.find((p) => p?.value);
      return selected?.value ?? null;
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

    let packageId: string | null = null;
    try {
      packageId = await readDefaultBikeShopPackageId();
    } catch (e: any) {
      return {
        ok: false as const,
        stage: "api" as const,
        message: e?.message ?? "Kon het standaardpakket voor deze organisatie niet ophalen.",
      };
    }
    if (!packageId) {
      return {
        ok: false as const,
        stage: "api" as const,
        message: "Er is geen standaardpakket gevonden in velopass.pro. Stel daar eerst een actief standaardpakket in.",
      };
    }

    const countryOptions = await readCountryOptions();
    const country = resolveCountryForVelopass(row.country, countryOptions);

    const body: {
      name: string; phone: string; type: number;
      companyNumber: string; vatNumber: string;
      transferOfOwnershipEmail: string; email: string;
      street: string; postalCode: string; city: string; country: string;
      packageId: string;
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
      packageId,
    };

    let apiResponse: any = null;
    let apiStatus = 0;
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

    const returnedId: string | null =
      (apiResponse && typeof apiResponse === "object" && (apiResponse.id || apiResponse.organisationId)) || null;

    // Mark as converted + append note + record push metadata.
    const nowIso = new Date().toISOString();
    const claims: any = context.claims ?? {};
    const actorEmail: string | null =
      claims?.email ||
      claims?.["https://velopass.com/email"] ||
      null;
    const givenName = claims?.given_name || claims?.["https://velopass.com/given_name"] || "";
    const familyName = claims?.family_name || claims?.["https://velopass.com/family_name"] || "";
    const combined = `${givenName} ${familyName}`.trim();
    const actorName: string | null =
      claims?.name ||
      claims?.["https://velopass.com/name"] ||
      claims?.nickname ||
      claims?.["https://velopass.com/nickname"] ||
      (combined.length > 0 ? combined : null) ||
      null;
    const actorLabel = actorName || actorEmail || context.userId;
    const noteAction = alreadyExists
      ? "Reeds aanwezig in velopass.pro (gemarkeerd als doorgestuurd)"
      : "Doorgestuurd naar velopass.pro";
    const note = `[${nowIso.slice(0, 10)}] ${noteAction}${returnedId ? ` (id: ${returnedId})` : ""}${actorLabel ? ` door ${actorLabel}` : ""}.`;
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
      },
    });

    return { ok: true as const, managementId: returnedId, alreadyExists, response: apiResponse };
  });
