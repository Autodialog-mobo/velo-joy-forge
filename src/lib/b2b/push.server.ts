// Server-only: push one paid order to the Velopass B2B orders app.
// Safe to call more than once — the B2B app is idempotent on external_order_id.

import { b2bCredentials, fetchCatalog, postConsumerOrder } from "./consumer-orders.server";
import { buildConsumerOrderPayload } from "./build-payload.server";

const ORDER_COLUMNS =
  "id, created_at, updated_at, customer_email, lang, environment, status, amount_subtotal, amount_shipping, amount_total, amount_tax, shipping_name, shipping_line1, shipping_line2, shipping_postal_code, shipping_city, shipping_country, mollie_payment_id, payment_method, payment_consumer_name, referral_source, b2b_order_id, b2b_pushed_at";

export function configuredB2BEnvironment(): string {
  return (process.env["VELOPASS_B2B_ENVIRONMENT"] || "live").toLowerCase();
}

export type PushOutcome = {
  ok: boolean;
  skipped?: string;
  velopassOrderId?: string;
  priceFlag?: string | null;
  error?: string;
  permanent?: boolean;
};

export async function pushOrderToB2B(
  orderId: string,
  opts: { force?: boolean; ignoreEnvironment?: boolean } = {},
): Promise<PushOutcome> {
  // mode is decided below, after we know the order's environment

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;

  const { data: order, error } = await admin
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("id", orderId)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!order) return { ok: false, error: "order niet gevonden" };
  if (order.status !== "paid" && order.status !== "printed" && order.status !== "shipped") {
    return { ok: false, skipped: "not_paid" };
  }
  // Sandbox orders go to the sandbox client, live orders to the live client.
  const mode: "live" | "sandbox" =
    String(order.environment) === "sandbox" ? "sandbox" : "live";
  if (!b2bCredentials(mode)) return { ok: false, skipped: "no_credentials" };
  if (order.b2b_order_id && !opts.force) {
    return { ok: true, velopassOrderId: order.b2b_order_id, skipped: "already_pushed" };
  }

  const { data: lines } = await admin
    .from("order_lines")
    .select("bundle_key, quantity, unit_price_cents")
    .eq("order_id", orderId);

  let catalogVersion: string | null = null;
  try {
    catalogVersion = (await fetchCatalog(false, mode)).catalog_version;
  } catch (e: any) {
    console.error("B2B catalog fetch failed:", e?.message);
  }

  const payload = buildConsumerOrderPayload(order, lines ?? [], { catalogVersion });
  const result = await postConsumerOrder(payload, mode);

  if (result.ok) {
    await admin
      .from("orders")
      .update({
        b2b_order_id: result.velopassOrderId,
        b2b_pushed_at: new Date().toISOString(),
        b2b_price_flag: result.priceFlag,
        b2b_push_error: null,
        b2b_environment: configuredB2BEnvironment(),
      })
      .eq("id", orderId);
    try {
      await admin.from("order_events").insert({
        order_id: orderId,
        event_type: "b2b_pushed",
        actor: "B2B",
        actor_type: "system",
        note: `${result.velopassOrderId}${result.priceFlag ? ` (flag: ${result.priceFlag})` : ""}`,
      });
    } catch {}
    return { ok: true, velopassOrderId: result.velopassOrderId, priceFlag: result.priceFlag };
  }

  await admin
    .from("orders")
    .update({
      b2b_pushed_at: null,
      b2b_push_error: result.error.slice(0, 1000),
      b2b_environment: configuredB2BEnvironment(),
    })
    .eq("id", orderId);
  return { ok: false, error: result.error, permanent: result.permanent };
}
