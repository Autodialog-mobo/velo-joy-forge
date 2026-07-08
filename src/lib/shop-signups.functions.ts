import { createServerFn } from "@tanstack/react-start";
import { requireAuth0Admin } from "@/integrations/auth0/middleware";
import { z } from "zod";

// legacy Supabase role-assertion helper removed — Auth0 middleware now verifies b2b_admin.

export const listShopSignups = createServerFn({ method: "POST" })
  .middleware([requireAuth0Admin])
  .inputValidator((d: unknown) => d ?? {})
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
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
    await assertAdmin(context.supabase, context.userId);

    // Fetch previous values for diff logging.
    const { data: before, error: fetchErr } = await (context.supabase as any)
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

    const { error } = await (context.supabase as any)
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
