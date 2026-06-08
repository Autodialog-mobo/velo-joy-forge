import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function fetchMolliePayment(id: string) {
  const apiKey = process.env.MOLLIE_API_KEY;
  if (!apiKey) throw new Error("MOLLIE_API_KEY is not configured");
  const res = await fetch(`https://api.mollie.com/v2/payments/${id}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`Mollie HTTP ${res.status}`);
  return res.json();
}

const BUNDLE_META: Record<string, { sku: string; stickersPerBundle: number; unitPriceCents: number }> = {
  frameid_solo_onetime: { sku: "VP-FID-1", stickersPerBundle: 1, unitPriceCents: 1295 },
  frameid_duo_onetime: { sku: "VP-FID-2", stickersPerBundle: 2, unitPriceCents: 2195 },
  frameid_family_onetime: { sku: "VP-FID-5", stickersPerBundle: 5, unitPriceCents: 4995 },
};

export const Route = createFileRoute("/api/public/payments/mollie-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const form = await request.formData();
          const id = form.get("id");
          if (typeof id !== "string" || !/^tr_[a-zA-Z0-9]+$/.test(id)) {
            return new Response("Invalid id", { status: 400 });
          }

          const payment = await fetchMolliePayment(id);
          const p: any = payment;
          const status: string = p.status;
          const amountCents = Math.round(parseFloat(p.amount.value) * 100);
          const environment = process.env.MOLLIE_API_KEY?.startsWith("live_")
            ? "live"
            : "sandbox";

          const shipping = p.shippingAddress ?? p.metadata?.shipping ?? null;
          const shippingName = shipping
            ? `${shipping.givenName ?? ""} ${shipping.familyName ?? ""}`.trim()
            : "";

          const items: Array<{ priceId: string; quantity: number }> = Array.isArray(p.metadata?.items)
            ? p.metadata.items
            : [];

          const { data: upserted } = await (supabaseAdmin.from("orders") as any).upsert(
            {
              mollie_payment_id: p.id,
              customer_email:
                p.metadata?.email ?? p.billingEmail ?? p.customerEmail ?? "",
              price_id: items[0]?.priceId ?? "unknown",
              product_name: items.length
                ? items.map((i) => `${i.priceId} × ${i.quantity}`).join(", ")
                : "Velopass Frame-ID",
              quantity: items.length
                ? items.reduce((s, i) => s + (i.quantity ?? 1), 0)
                : 1,
              amount_subtotal: amountCents,
              amount_tax: 0,
              amount_total: amountCents,
              currency: (p.amount.currency ?? "EUR").toLowerCase(),
              status,
              environment,
              shipping_name: shippingName,
              shipping_line1: shipping?.streetAndNumber ?? "",
              shipping_postal_code: shipping?.postalCode ?? "",
              shipping_city: shipping?.city ?? "",
              shipping_country: shipping?.country ?? "",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "mollie_payment_id" },
          ).select("id").single();

          const orderId = upserted?.id;
          if (orderId && items.length) {
            // Replace lines for idempotency on webhook retries
            await (supabaseAdmin.from("order_lines") as any).delete().eq("order_id", orderId);
            const rows = items
              .filter((i) => i.priceId in BUNDLE_META)
              .map((i) => {
                const meta = BUNDLE_META[i.priceId];
                return {
                  order_id: orderId,
                  bundle_key: i.priceId,
                  bundle_sku: meta.sku,
                  quantity: i.quantity,
                  sticker_count: i.quantity * meta.stickersPerBundle,
                  unit_price_cents: meta.unitPriceCents,
                };
              });
            if (rows.length) {
              await (supabaseAdmin.from("order_lines") as any).insert(rows);
            }
          }

          return new Response("ok", { status: 200 });
        } catch (e) {
          console.error("Mollie webhook error:", e);
          return new Response("Webhook error", { status: 500 });
        }
      },
    },
  },
});
