import { createServerFn } from "@tanstack/react-start";
import { requireAuth0Admin } from "@/integrations/auth0/middleware";

export const retryB2BPush = createServerFn({ method: "POST" })
  .middleware([requireAuth0Admin])
  .inputValidator((d: { orderId: string; force?: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { pushOrderToB2B } = await import("./b2b/push.server");
    const result = await pushOrderToB2B(data.orderId, {
      force: data.force ?? false,
      ignoreEnvironment: true,
    });
    const { writeAudit } = await import("./audit.server");
    await writeAudit(context as any, {
      action: result.ok ? "order.b2b_pushed" : "order.b2b_push_failed",
      target_type: "order",
      target_id: data.orderId,
      metadata: result as any,
    });
    return result;
  });

export const pushB2BBatch = createServerFn({ method: "POST" })
  .middleware([requireAuth0Admin])
  .inputValidator((d: { orderIds: string[] }) => d)
  .handler(async ({ data, context }) => {
    const { pushOrderToB2B } = await import("./b2b/push.server");
    const results: Array<{ orderId: string; ok: boolean; error?: string; skipped?: string }> = [];
    for (const id of data.orderIds.slice(0, 100)) {
      const r = await pushOrderToB2B(id, { ignoreEnvironment: true });
      results.push({ orderId: id, ok: r.ok, error: r.error, skipped: r.skipped });
    }
    const { writeAudit } = await import("./audit.server");
    await writeAudit(context as any, {
      action: "order.b2b_push_batch",
      target_type: "order",
      metadata: { count: results.length, failed: results.filter((r) => !r.ok).length },
    });
    return { results };
  });

export const getB2BCatalog = createServerFn({ method: "POST" })
  .middleware([requireAuth0Admin])
  .inputValidator((d: { force?: boolean; mode?: "live" | "sandbox" } = {}) => d ?? {})
  .handler(async ({ data }) => {
    const { fetchCatalog, b2bCredentials } = await import("./b2b/consumer-orders.server");
    const mode = data?.mode ?? "live";
    if (!b2bCredentials(mode)) return { ok: false as const, error: "credentials_missing" };
    try {
      const catalog = await fetchCatalog(data?.force ?? false, mode);
      return { ok: true as const, catalog };
    } catch (e: any) {
      return { ok: false as const, error: e?.message ?? "unknown error" };
    }
  });

/**
 * One-time backfill export: every order that was already fulfilled before the
 * connection existed, as an array of v1 payloads plus a `fulfilment` block.
 */
export const exportB2BBackfill = createServerFn({ method: "POST" })
  .middleware([requireAuth0Admin])
  .inputValidator(
    (d: { limit?: number; environment?: "live" | "sandbox"; onlyNotPushed?: boolean } = {}) => d ?? {},
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { buildConsumerOrderPayload } = await import("./b2b/build-payload.server");

    const limit = Math.min(Math.max(data?.limit ?? 1000, 1), 5000);
    const env = data?.environment ?? "live";

    let q = admin
      .from("orders")
      .select("*")
      .eq("environment", env)
      .in("status", ["paid", "printed", "shipped"])
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(limit);
    if (data?.onlyNotPushed) q = q.is("b2b_order_id", null);

    const { data: orders, error } = await q;
    if (error) throw new Error(error.message);

    const ids = (orders ?? []).map((o: any) => o.id);
    const linesByOrder = new Map<string, any[]>();
    const shippedAt = new Map<string, string>();
    if (ids.length) {
      const { data: lines } = await admin
        .from("order_lines")
        .select("order_id, bundle_key, quantity, unit_price_cents")
        .in("order_id", ids);
      for (const l of lines ?? []) {
        const arr = linesByOrder.get(l.order_id) ?? [];
        arr.push(l);
        linesByOrder.set(l.order_id, arr);
      }
      const { data: events } = await admin
        .from("order_events")
        .select("order_id, event_type, created_at")
        .in("order_id", ids)
        .eq("event_type", "shipped")
        .order("created_at", { ascending: true });
      for (const e of events ?? []) {
        if (!shippedAt.has(e.order_id)) shippedAt.set(e.order_id, e.created_at);
      }
    }

    const payloads = (orders ?? []).map((o: any) =>
      buildConsumerOrderPayload(o, linesByOrder.get(o.id) ?? [], {
        fulfilment:
          o.status === "shipped"
            ? {
                status: "shipped",
                shipped_at: new Date(shippedAt.get(o.id) ?? o.updated_at).toISOString(),
              }
            : { status: "paid" },
      }),
    );

    const { writeAudit } = await import("./audit.server");
    await writeAudit(context as any, {
      action: "order.b2b_backfill_export",
      target_type: "order",
      metadata: { count: payloads.length, environment: env, limit },
    });

    return { payloads, count: payloads.length };
  });
