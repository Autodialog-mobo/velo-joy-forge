import { createServerFn } from "@tanstack/react-start";
import { requireAuth0Admin } from "@/integrations/auth0/middleware";
import { z } from "zod";

const submitSchema = z.object({
  shop_name: z.string().trim().max(200).optional().default(""),
  choice: z.enum(["ja", "misschien", "nee"]),
  reason: z.string().trim().max(2000).optional().nullable(),
});

export const submitMarginPoll = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => submitSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const shop = (data.shop_name || "").trim() || "unknown";
    const reason = data.choice === "ja" ? null : (data.reason?.trim() || null);
    const now = new Date().toISOString();

    // Upsert by lower(shop_name) — last answer wins.
    const { data: existing, error: selErr } = await supabaseAdmin
      .from("margin_poll_responses")
      .select("id")
      .ilike("shop_name", shop)
      .maybeSingle();
    if (selErr) {
      console.error("[margin-poll] select failed", selErr);
      throw new Error(selErr.message);
    }

    if (existing) {
      const { error } = await supabaseAdmin
        .from("margin_poll_responses")
        .update({ choice: data.choice, reason, shop_name: shop, updated_at: now })
        .eq("id", existing.id);
      if (error) {
        console.error("[margin-poll] update failed", error);
        throw new Error(error.message);
      }
    } else {
      const { error } = await supabaseAdmin
        .from("margin_poll_responses")
        .insert({ shop_name: shop, choice: data.choice, reason });
      if (error) {
        console.error("[margin-poll] insert failed", error);
        throw new Error(error.message);
      }
    }
    return { ok: true };
  });

export const listMarginPoll = createServerFn({ method: "POST" })
  .middleware([requireAuth0Admin])
  .inputValidator((d: unknown) => d ?? {})
  .handler(async ({ context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .in("role", ["admin", "staff"]);
    if (!roles || roles.length === 0) throw new Error("Forbidden: admin or staff role required");

    const { data, error } = await context.supabase
      .from("margin_poll_responses")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });
