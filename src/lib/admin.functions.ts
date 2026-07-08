import { createServerFn } from "@tanstack/react-start";
import { requireAuth0Admin } from "@/integrations/auth0/middleware";

// legacy Supabase role-assertion helper removed — Auth0 middleware now verifies b2b_admin.

// legacy Supabase role-assertion helper removed — Auth0 middleware now verifies b2b_admin.

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
  .middleware([requireAuth0Admin])
  .inputValidator(
    (d: { environment?: "live" | "sandbox"; includeDeleted?: boolean } = {}) => d ?? {},
  )
  .handler(async ({ data, context }) => {
    const { userId, claims } = context as any;
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
  .middleware([requireAuth0Admin])
  .inputValidator((d: { orderId: string }) => d)
  .handler(async ({ data, context }) => {
    const { userId, claims } = context as any;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: events, error } = await (supabaseAdmin as any)
      .from("order_events")
      .select("*")
      .eq("order_id", data.orderId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { events: events ?? [] };
  });

export const listEmailEvents = createServerFn({ method: "POST" })
  .middleware([requireAuth0Admin])
  .inputValidator(
    (d: {
      eventType?: "confirmation_email_resent" | "confirmation_email_test_sent" | "all";
      orderId?: string | null;
      recipient?: string | null;
      limit?: number;
    } = {}) => d ?? {},
  )
  .handler(async ({ data, context }) => {
    const { userId, claims } = context as any;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const limit = Math.min(Math.max(data?.limit ?? 200, 1), 1000);

    let q = (supabaseAdmin as any)
      .from("order_events")
      .select("*")
      .in("event_type", ["confirmation_email_resent", "confirmation_email_test_sent"])
      .order("created_at", { ascending: false })
      .limit(limit);

    if (data?.eventType && data.eventType !== "all") {
      q = q.eq("event_type", data.eventType);
    }
    if (data?.orderId && data.orderId.trim()) {
      q = q.ilike("order_id", `%${data.orderId.trim()}%`);
    }
    if (data?.recipient && data.recipient.trim()) {
      q = q.ilike("note", `%${data.recipient.trim()}%`);
    }

    const { data: events, error } = await q;
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
  const { userId, claims } = context as any;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { writeAudit } = await import("./audit.server");
  const { data: updated, error } = await (supabaseAdmin as any)
    .from("orders")
    .update({ status: toStatus, updated_at: new Date().toISOString() })
    .in("id", orderIds)
    .eq("status", fromStatus)
    .select("id");
  if (error) throw new Error(error.message);
  const actor = actorEmail(context);
  const updatedIds = (updated ?? []).map((r: any) => r.id);
  await Promise.all(
    updatedIds.map((id: string) =>
      logEvent(supabaseAdmin, {
        order_id: id,
        event_type: eventType,
        from_status: fromStatus,
        to_status: toStatus,
        actor,
        actor_type: "admin",
      }),
    ),
  );
  await writeAudit(context, {
    action: `order.${eventType}`,
    target_type: "order",
    target_id: updatedIds.length === 1 ? updatedIds[0] : null,
    metadata: { ids: updatedIds, from: fromStatus, to: toStatus, count: updatedIds.length },
  });
  return { ok: true };
}

export const markPrinted = createServerFn({ method: "POST" })
  .middleware([requireAuth0Admin])
  .inputValidator((d: { orderIds: string[] }) => d)
  .handler(async ({ data, context }) =>
    bulkStatusUpdate(context, data.orderIds, "paid", "printed", "printed"),
  );

export const markShipped = createServerFn({ method: "POST" })
  .middleware([requireAuth0Admin])
  .inputValidator((d: { orderIds: string[] }) => d)
  .handler(async ({ data, context }) =>
    bulkStatusUpdate(context, data.orderIds, "printed", "shipped", "shipped"),
  );

export const revertToPaid = createServerFn({ method: "POST" })
  .middleware([requireAuth0Admin])
  .inputValidator((d: { orderId: string }) => d)
  .handler(async ({ data, context }) =>
    bulkStatusUpdate(context, [data.orderId], "printed", "paid", "reverted"),
  );

export const revertToPrinted = createServerFn({ method: "POST" })
  .middleware([requireAuth0Admin])
  .inputValidator((d: { orderId: string }) => d)
  .handler(async ({ data, context }) =>
    bulkStatusUpdate(context, [data.orderId], "shipped", "printed", "reverted"),
  );

export const softDeleteOrder = createServerFn({ method: "POST" })
  .middleware([requireAuth0Admin])
  .inputValidator((d: { orderId: string }) => d)
  .handler(async ({ data, context }) => {
    const { userId, claims } = context as any;
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
    const { writeAudit } = await import("./audit.server");
    await writeAudit(context, {
      action: "order.deleted",
      target_type: "order",
      target_id: data.orderId,
    });
    return { ok: true };
  });

export const restoreOrder = createServerFn({ method: "POST" })
  .middleware([requireAuth0Admin])
  .inputValidator((d: { orderId: string }) => d)
  .handler(async ({ data, context }) => {
    const { userId, claims } = context as any;
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
    const { writeAudit } = await import("./audit.server");
    await writeAudit(context, {
      action: "order.restored",
      target_type: "order",
      target_id: data.orderId,
    });
    return { ok: true };
  });

export const sendTestOrderConfirmation = createServerFn({ method: "POST" })
  .middleware([requireAuth0Admin])
  .inputValidator((d: { orderId: string; to?: string }) => d)
  .handler(async ({ data, context }) => {
    const { userId, claims } = context as any;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error } = await (supabaseAdmin as any)
      .from("orders")
      .select("id, customer_email, lang, amount_subtotal, amount_shipping, amount_total, amount_tax, shipping_name, shipping_line1, shipping_postal_code, shipping_city, shipping_country")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Order niet gevonden");

    const { data: lines } = await (supabaseAdmin as any)
      .from("order_lines")
      .select("bundle_key, quantity, unit_price_cents")
      .eq("order_id", data.orderId);

    const recipient = (data.to && data.to.trim()) || actorEmail(context);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      throw new Error("Geen geldig admin-e-mailadres beschikbaar");
    }

    const { sendOrderConfirmationEmail } = await import("@/lib/email/order-confirmation.server");
    const result = await sendOrderConfirmationEmail({
      to: recipient,
      lang: order.lang,
      orderId: order.id,
      items: (lines ?? []).map((l: any) => ({
        bundleKey: l.bundle_key,
        quantity: l.quantity,
        unitPriceCents: l.unit_price_cents,
      })),
      amountSubtotalCents: order.amount_subtotal ?? 0,
      amountShippingCents: order.amount_shipping ?? 0,
      amountTotalCents: order.amount_total ?? 0,
      amountVatCents: order.amount_tax ?? 0,
      shipping: {
        name: order.shipping_name ?? "",
        line1: order.shipping_line1 ?? "",
        postalCode: order.shipping_postal_code ?? "",
        city: order.shipping_city ?? "",
        country: order.shipping_country ?? "",
      },
    });

    if (!result.ok) throw new Error(result.error);

    const isCustomer =
      !!order.customer_email &&
      recipient.toLowerCase() === String(order.customer_email).toLowerCase();
    await logEvent(supabaseAdmin, {
      order_id: order.id,
      event_type: isCustomer ? "confirmation_email_resent" : "confirmation_email_test_sent",
      actor: actorEmail(context),
      actor_type: "admin",
      note: `Verzonden naar ${recipient}`,
    });
    const { writeAudit } = await import("./audit.server");
    await writeAudit(context, {
      action: isCustomer ? "order.email.resent" : "order.email.test_sent",
      target_type: "order",
      target_id: order.id,
      metadata: { recipient, is_customer: isCustomer },
    });

    return { ok: true, to: recipient, originalCustomer: order.customer_email, shippingName: order.shipping_name };
  });


export const listWebhookEvents = createServerFn({ method: "POST" })
  .middleware([requireAuth0Admin])
  .inputValidator((d: { limit?: number } = {}) => d ?? {})
  .handler(async ({ data, context }) => {
    const { userId, claims } = context as any;
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

export const listAuditLog = createServerFn({ method: "POST" })
  .middleware([requireAuth0Admin])
  .inputValidator((d: { limit?: number; action?: string | null } = {}) => d ?? {})
  .handler(async ({ data, context }) => {
    const { userId, claims } = context as any;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const limit = Math.min(Math.max(data?.limit ?? 200, 1), 1000);
    let q = (supabaseAdmin as any)
      .from("admin_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (data?.action) q = q.eq("action", data.action);
    const { data: entries, error } = await q;
    if (error) throw new Error(error.message);
    return { entries: entries ?? [] };
  });

export const logPrintAudit = createServerFn({ method: "POST" })
  .middleware([requireAuth0Admin])
  .inputValidator(
    (d: {
      kind: "success" | "error" | "partial";
      message: string;
      error?: string | null;
      requestedIds: string[];
      rows: Array<{
        id: string;
        oldStatus: string | null;
        newStatus: string | null;
        rollback?: "not_needed" | "reverted" | "failed";
        rollbackError?: string | null;
      }>;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const { userId, claims } = context as any;
    const { writeAudit } = await import("./audit.server");
    const changed = data.rows.filter((r) => r.oldStatus !== r.newStatus).length;
    const rolledBack = data.rows.filter((r) => r.rollback === "reverted").length;
    const rollbackFailed = data.rows.filter((r) => r.rollback === "failed").length;
    await writeAudit(context, {
      action: data.kind === "success" ? "order.print_batch" : "order.print_batch_failed",
      target_type: "order",
      target_id: data.rows.length === 1 ? data.rows[0].id : null,
      metadata: {
        kind: data.kind,
        message: data.message,
        error: data.error ?? null,
        requested_count: data.requestedIds.length,
        changed_count: changed,
        rolled_back_count: rolledBack,
        rollback_failed_count: rollbackFailed,
        rows: data.rows,
      },
    });
    return { ok: true };
  });

export const listEmailSendLog = createServerFn({ method: "POST" })
  .middleware([requireAuth0Admin])
  .inputValidator(
    (d: {
      status?: string | null;
      orderId?: string | null;
      recipient?: string | null;
      sinceIso?: string | null;
      untilIso?: string | null;
      limit?: number;
    } = {}) => d ?? {},
  )
  .handler(async ({ data, context }) => {
    const { userId, claims } = context as any;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const limit = Math.min(Math.max(data?.limit ?? 500, 1), 2000);

    let q = (supabaseAdmin as any)
      .from("email_send_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (data?.status && data.status !== "all") q = q.eq("status", data.status);
    if (data?.orderId && data.orderId.trim()) {
      q = q.ilike("order_id", `%${data.orderId.trim()}%`);
    }
    if (data?.recipient && data.recipient.trim()) {
      q = q.ilike("recipient", `%${data.recipient.trim()}%`);
    }
    if (data?.sinceIso) q = q.gte("created_at", data.sinceIso);
    if (data?.untilIso) q = q.lte("created_at", data.untilIso);

    const { data: entries, error } = await q;
    if (error) throw new Error(error.message);

    const { data: statusRows } = await (supabaseAdmin as any)
      .from("email_send_log")
      .select("status")
      .order("created_at", { ascending: false })
      .limit(2000);
    const statuses = Array.from(new Set((statusRows ?? []).map((r: any) => String(r.status)))).sort() as string[];

    return { entries: entries ?? [], statuses };
  });
