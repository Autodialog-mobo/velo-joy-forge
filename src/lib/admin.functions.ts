import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "staff"])
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin or staff role required");
}

function actorEmail(context: any): string {
  return (
    context?.claims?.email ||
    context?.claims?.user_metadata?.email ||
    context?.userId ||
    "admin"
  );
}

async function logEvent(
  admin: any,
  row: {
    order_id: string;
    event_type: string;
    from_status?: string | null;
    to_status?: string | null;
    actor?: string | null;
    actor_type: "admin" | "system";
    note?: string | null;
  },
) {
  try {
    await admin.from("order_events").insert(row);
  } catch (e) {
    console.error("logEvent failed:", e);
  }
}

export const listOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { environment?: "live" | "sandbox"; includeDeleted?: boolean } = {}) => d ?? {},
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const env = data?.environment ?? "live";
    const { data: orders, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("environment", env)
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

export const listOrderEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: events, error } = await (supabaseAdmin as any)
      .from("order_events")
      .select("*")
      .eq("order_id", data.orderId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { events: events ?? [] };
  });

async function bulkStatusUpdate(
  context: any,
  orderIds: string[],
  fromStatus: string,
  toStatus: string,
  eventType: "printed" | "shipped" | "reverted",
) {
  const { supabase, userId } = context as any;
  await assertAdmin(supabase, userId);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: updated, error } = await (supabaseAdmin as any)
    .from("orders")
    .update({ status: toStatus, updated_at: new Date().toISOString() })
    .in("id", orderIds)
    .eq("status", fromStatus)
    .select("id");
  if (error) throw new Error(error.message);
  const actor = actorEmail(context);
  await Promise.all(
    (updated ?? []).map((r: any) =>
      logEvent(supabaseAdmin, {
        order_id: r.id,
        event_type: eventType,
        from_status: fromStatus,
        to_status: toStatus,
        actor,
        actor_type: "admin",
      }),
    ),
  );
  return { ok: true };
}

export const markPrinted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderIds: string[] }) => d)
  .handler(async ({ data, context }) =>
    bulkStatusUpdate(context, data.orderIds, "paid", "printed", "printed"),
  );

export const markShipped = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderIds: string[] }) => d)
  .handler(async ({ data, context }) =>
    bulkStatusUpdate(context, data.orderIds, "printed", "shipped", "shipped"),
  );

export const revertToPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string }) => d)
  .handler(async ({ data, context }) =>
    bulkStatusUpdate(context, [data.orderId], "printed", "paid", "reverted"),
  );

export const revertToPrinted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string }) => d)
  .handler(async ({ data, context }) =>
    bulkStatusUpdate(context, [data.orderId], "shipped", "printed", "reverted"),
  );

export const softDeleteOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("orders")
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", data.orderId);
    if (error) throw new Error(error.message);
    await logEvent(supabaseAdmin, {
      order_id: data.orderId,
      event_type: "deleted",
      actor: actorEmail(context),
      actor_type: "admin",
    });
    return { ok: true };
  });

export const restoreOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("orders")
      .update({ deleted_at: null, updated_at: new Date().toISOString() })
      .eq("id", data.orderId);
    if (error) throw new Error(error.message);
    await logEvent(supabaseAdmin, {
      order_id: data.orderId,
      event_type: "restored",
      actor: actorEmail(context),
      actor_type: "admin",
    });
    return { ok: true };
  });

export const listWebhookEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limit?: number } = {}) => d ?? {})
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const limit = Math.min(Math.max(data?.limit ?? 100, 1), 500);

    const { data: events, error } = await (supabaseAdmin as any)
      .from("webhook_events")
      .select("*")
      .order("received_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);

    const kinds = ["production", "preview", "other"] as const;
    const summary: Record<string, {
      total: number;
      success: number;
      error: number;
      last_received_at: string | null;
      last_success_at: string | null;
      last_error_at: string | null;
      last_error_message: string | null;
      last_24h: number;
    }> = {};
    const now = Date.now();
    for (const k of kinds) {
      summary[k] = {
        total: 0, success: 0, error: 0,
        last_received_at: null, last_success_at: null,
        last_error_at: null, last_error_message: null, last_24h: 0,
      };
    }
    for (const ev of events ?? []) {
      const k = (ev.origin_kind as string) in summary ? ev.origin_kind : "other";
      const s = summary[k];
      s.total += 1;
      if (ev.status === "success") s.success += 1;
      else s.error += 1;
      if (!s.last_received_at) s.last_received_at = ev.received_at;
      if (!s.last_success_at && ev.status === "success") s.last_success_at = ev.received_at;
      if (!s.last_error_at && ev.status === "error") {
        s.last_error_at = ev.received_at;
        s.last_error_message = ev.error_message ?? null;
      }
      if (now - new Date(ev.received_at).getTime() < 24 * 3600 * 1000) s.last_24h += 1;
    }

    return { events: events ?? [], summary };
  });
