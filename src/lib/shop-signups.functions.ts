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

function parseSignupAddress(raw: string | null | undefined): { street: string; postal: string; city: string } {
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
}

const MANAGEMENT_API_URL =
  (process.env.VELOPASS_MANAGEMENT_API_URL || "https://managementapi.prod.velopass.com").replace(/\/+$/, "");

export const pushShopSignupToVelopassPro = createServerFn({ method: "POST" })
  .middleware([requireAuth0Admin])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const request = getRequest();
    const bearer = request?.headers?.get("authorization") ?? "";
    if (!bearer.startsWith("Bearer ")) {
      throw new Error("Geen geldige Auth0-token beschikbaar om door te sturen.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error: fetchErr } = await (supabaseAdmin as any)
      .from("shop_signups")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!row) throw new Error("Aanmelding niet gevonden");

    const { street, postal, city } = parseSignupAddress(row.address);
    const missing: string[] = [];
    if (!row.shop_name) missing.push("winkelnaam");
    if (!row.phone) missing.push("telefoon");
    if (!row.vat) missing.push("BTW/ondernemingsnummer");
    if (!row.email) missing.push("e-mail");
    if (!street) missing.push("straat");
    if (!postal) missing.push("postcode");
    if (!city) missing.push("stad");
    if (!row.country) missing.push("land");
    if (missing.length) {
      throw new Error(`Ontbrekende velden: ${missing.join(", ")}. Vul aan en sla op vóór doorsturen.`);
    }

    const body = {
      name: row.shop_name,
      phone: row.phone,
      companyNumber: row.vat,
      vatNumber: row.vat,
      transferOfOwnershipEmail: row.email,
      email: row.email,
      street,
      postalCode: postal,
      city,
      country: row.country,
    };

    let apiResponse: any = null;
    let apiStatus = 0;
    try {
      const res = await fetch(`${MANAGEMENT_API_URL}/api/Organisations`, {
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
      if (!res.ok) {
        const msg =
          (apiResponse && typeof apiResponse === "object" && (apiResponse.title || apiResponse.detail || apiResponse.message))
          || (typeof apiResponse === "string" ? apiResponse : "")
          || `Velopass.pro API gaf ${res.status}`;
        console.error("[shop-signups] push failed", { id: data.id, status: res.status, apiResponse });
        throw new Error(String(msg).slice(0, 500));
      }
    } catch (e: any) {
      if (e?.message?.startsWith("Velopass.pro")) throw e;
      if (apiStatus === 0) throw new Error(`Verbindingsfout met velopass.pro: ${e?.message ?? "unknown"}`);
      throw e;
    }

    const returnedId: string | null =
      (apiResponse && typeof apiResponse === "object" && (apiResponse.id || apiResponse.organisationId)) || null;

    // Mark as converted + append note.
    const note = `[${new Date().toISOString().slice(0, 10)}] Doorgestuurd naar velopass.pro${returnedId ? ` (id: ${returnedId})` : ""}.`;
    const admin_notes = row.admin_notes ? `${row.admin_notes}\n${note}` : note;
    await (supabaseAdmin as any)
      .from("shop_signups")
      .update({
        status: "converted",
        status_updated_at: new Date().toISOString(),
        status_updated_by: context.userId,
        admin_notes,
        updated_at: new Date().toISOString(),
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

    return { ok: true, managementId: returnedId, response: apiResponse };
  });
