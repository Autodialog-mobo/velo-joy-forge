import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) {
    console.error("[shop-signups] assertAdmin query failed", { userId, error });
    throw new Error(error.message);
  }
  if (!data) {
    console.warn("[shop-signups] non-admin access denied", { userId });
    throw new Error("Forbidden: admin role required");
  }
}

export const listShopSignups = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => d ?? {})
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("shop_signups")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });

const updateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["new", "contacted", "converted", "rejected"]).optional(),
  admin_notes: z.string().max(4000).nullable().optional(),
});

export const updateShopSignup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const patch: any = { updated_at: new Date().toISOString() };
    if (data.status !== undefined) {
      patch.status = data.status;
      patch.status_updated_at = new Date().toISOString();
      patch.status_updated_by = context.userId;
    }
    if (data.admin_notes !== undefined) patch.admin_notes = data.admin_notes;
    const { error } = await (context.supabase as any)
      .from("shop_signups")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
