import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

export const listOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: orders, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("environment", "live")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    const ids = (orders ?? []).map((o) => o.id);
    let lines: any[] = [];
    if (ids.length) {
      const { data: l, error: le } = await supabaseAdmin
        .from("order_lines")
        .select("*")
        .in("order_id", ids);
      if (le) throw new Error(le.message);
      lines = l ?? [];
    }
    return { orders: orders ?? [], lines };
  });

export const markPrinted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderIds: string[] }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("orders")
      .update({ status: "printed", updated_at: new Date().toISOString() })
      .in("id", data.orderIds)
      .eq("status", "paid");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markShipped = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderIds: string[] }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("orders")
      .update({ status: "shipped", updated_at: new Date().toISOString() })
      .in("id", data.orderIds)
      .eq("status", "printed");
    if (error) throw new Error(error.message);
    return { ok: true };
  });
