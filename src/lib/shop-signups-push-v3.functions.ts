import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireAuth0Admin } from "@/integrations/auth0/middleware";
import { z } from "zod";
import { isValidLocation, velopassCountry, type CreateBikeShopBody } from "./velopass-bikeshops";
import { createBikeShop, geocodeAddress } from "./velopass-thirdparty.server";

// Dedicated module gives the package-free push flow a fresh published RPC identity.
export const pushShopSignupToVelopassProV3 = createServerFn({ method: "POST" })
  .middleware([requireAuth0Admin])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    console.log("[shop-signups] push v3: bike-shops create (VP-887)", { id: data.id });
    const bearer = getRequest()?.headers?.get("authorization") ?? "";

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

    // Velopass.pro expects a `<lang>-<country>` languageCode on both the
    // Organisation create and the user/employee create calls.
    const buildLanguageCode = (lang: string | null | undefined, countryRaw: string | null | undefined): string => {
      const langBase = (lang || "nl").toLowerCase().slice(0, 2);
      const raw = String(countryRaw || "").trim().toUpperCase();
      let countryIso = "be";
      if (/^[A-Z]{2}$/.test(raw)) {
        countryIso = raw.toLowerCase();
      } else {
        const map: Record<string, string> = {
          BELGIE: "be", BELGIUM: "be", BELGIQUE: "be", BELGIEN: "be",
          NEDERLAND: "nl", NETHERLANDS: "nl", HOLLAND: "nl",
          FRANCE: "fr", FRANKRIJK: "fr",
          LUXEMBOURG: "lu", LUXEMBURG: "lu",
          GERMANY: "de", DUITSLAND: "de", DEUTSCHLAND: "de",
        };
        countryIso = map[raw.replace(/[^A-Z]/g, "")] || "be";
      }
      return `${langBase}-${countryIso}`;
    };

    const languageCode = buildLanguageCode(row.lang, row.country);


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


    const country = velopassCountry(row.country);
    const addressLine = [street, `${postal} ${city}`.trim(), country].filter(Boolean).join(", ");
    const geo = await geocodeAddress(addressLine);
    if ("error" in geo || !isValidLocation(geo)) {
      return {
        ok: false as const,
        stage: "validation" as const,
        message: `Adres kon niet omgezet worden naar een locatie: ${"error" in geo ? geo.error : "ongeldige locatie (0, 0)"}. Controleer het adres.`,
        missing: [{ field: "address", label: "Locatie", hint: "Controleer straat, postcode en stad." }],
      };
    }
    await (supabaseAdmin as any).from("shop_signups").update({ latitude: geo.lat, longitude: geo.lng }).eq("id", data.id);

    const user: CreateBikeShopBody["user"] = {
      email: row.email,
      firstName: row.first_name ?? "",
      lastName: row.last_name ?? "",
      languageCode,
      ...(normalizedPhone ? { phone: normalizedPhone } : {}),
    };
    const body: CreateBikeShopBody = {
      name: row.shop_name,
      phone: normalizedPhone,
      companyNumber: row.vat,
      vatNumber: row.vat,
      email: row.email,
      transferOfOwnershipEmail: row.email,
      languageCode,
      ...(normalizedWebsite ? { siteUrl: normalizedWebsite, siteName: row.shop_name } : {}),
      street,
      postalCode: postal,
      city,
      country,
      lat: geo.lat,
      lng: geo.lng,
      user,
    };

    let outcome: Awaited<ReturnType<typeof createBikeShop>>;
    try {
      outcome = await createBikeShop(body);
    } catch (e: any) {
      return { ok: false as const, stage: "network" as const, message: `Kon Velopass niet bereiken: ${e?.message ?? "onbekende fout"}.` };
    }
    if (outcome.kind === "validation") {
      return { ok: false as const, stage: "api" as const, status: 400, message: `Velopass weigerde de gegevens: ${outcome.message}`, response: outcome.raw };
    }
    if (outcome.kind === "error") {
      return { ok: false as const, stage: "api" as const, status: outcome.status, message: `Velopass gaf een fout [${outcome.status}]: ${outcome.message}`, response: outcome.raw };
    }
    if (outcome.kind === "conflict" && !outcome.organisationId) {
      return {
        ok: false as const, stage: "api" as const, status: 409,
        message: outcome.userEmailTaken
          ? `De gebruiker ${row.email} bestaat al in Velopass, maar er is geen bestaande winkel gevonden. Er is niets aangemaakt.`
          : `Conflict bij Velopass: ${outcome.codes.join(", ") || outcome.message}. Er is niets aangemaakt.`,
        response: outcome.raw,
      };
    }
    const alreadyExists = outcome.kind === "conflict";
    const returnedId: string | null = outcome.organisationId;
    const returnedPublicId: string | null = outcome.kind === "created" ? outcome.publicId : outcome.organisationPublicId;
    const proUserId: string | null = outcome.kind === "created" ? outcome.proUserId : null;
    const apiStatus = outcome.rawStatus;
    const apiResponse = outcome.raw;
    const idDiagnostics = undefined;
    const employeeStatus: number | null = outcome.kind === "created" ? 201 : null;
    const employeeAlreadyExists = outcome.kind === "conflict" && outcome.userEmailTaken;
    const employeeError: string | null = null;

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
        pushed_to_pro_public_id: returnedPublicId,
        pushed_to_pro_user_id: proUserId,
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
        public_id: returnedPublicId,
        pro_user_id: proUserId,
        status: apiStatus,
        employee_status: employeeStatus,
        employee_already_exists: employeeAlreadyExists,
        employee_error: employeeError,
      },
    });

    return {
      ok: true as const,
      managementId: returnedId,
      publicId: returnedPublicId,
      proUserId,
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
