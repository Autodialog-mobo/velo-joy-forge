import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { computeB2CTotals } from "@/lib/shipping";

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

function classifyOrigin(host: string | null | undefined): "production" | "preview" | "other" {
  if (!host) return "other";
  const h = host.toLowerCase();
  if (h.startsWith("id-preview--") || h.startsWith("preview--") || h.endsWith("-dev.lovable.app")) {
    return "preview";
  }
  if (h.endsWith(".lovable.app") || h === "velopass.com" || h.endsWith(".velopass.com")) {
    return "production";
  }
  return "other";
}

export const Route = createFileRoute("/api/public/payments/mollie-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const originHost = request.headers.get("host");
        const originKind = classifyOrigin(originHost);
        let payloadId: string | null = null;
        let paymentStatus: string | null = null;

        const logCall = async (status: "success" | "error", errorMessage: string | null = null) => {
          try {
            await (supabaseAdmin.from("webhook_events") as any).insert({
              source: "mollie",
              origin_host: originHost,
              origin_kind: originKind,
              payload_id: payloadId,
              payment_status: paymentStatus,
              status,
              error_message: errorMessage,
            });
          } catch (e) {
            console.error("webhook_events insert failed:", e);
          }
        };

        try {
          const form = await request.formData();
          const id = form.get("id");
          if (typeof id !== "string" || !/^tr_[a-zA-Z0-9]+$/.test(id)) {
            await logCall("error", "Invalid id");
            return new Response("Invalid id", { status: 400 });
          }
          payloadId = id;

          const payment = await fetchMolliePayment(id);
          const p: any = payment;
          const status: string = p.status;
          paymentStatus = status;
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

          const metaLang = typeof p.metadata?.lang === "string" && /^(nl|en|fr|de)$/.test(p.metadata.lang)
            ? p.metadata.lang
            : null;

          // Fetch previous status (if any) for transition logging
          const { data: existing } = await (supabaseAdmin.from("orders") as any)
            .select("id, status")
            .eq("mollie_payment_id", p.id)
            .maybeSingle();
          const prevStatus: string | null = existing?.status ?? null;

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
              amount_subtotal: items.length ? computeB2CTotals(items).productSubtotalCents : amountCents,
              amount_shipping: items.length ? computeB2CTotals(items).shippingCents : 0,
              amount_tax: items.length ? computeB2CTotals(items).vatCents : 0,
              amount_total: amountCents,
              currency: (p.amount.currency ?? "EUR").toLowerCase(),
              status,
              environment,
              shipping_name: shippingName,
              shipping_line1: shipping?.streetAndNumber ?? "",
              shipping_postal_code: shipping?.postalCode ?? "",
              shipping_city: shipping?.city ?? "",
              shipping_country: shipping?.country ?? "",
              lang: metaLang,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "mollie_payment_id" },
          ).select("id").single();

          const orderId = upserted?.id;
          if (orderId && items.length) {
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

          if (orderId && status !== prevStatus) {
            try {
              await (supabaseAdmin.from("order_events") as any).insert({
                order_id: orderId,
                event_type: status,
                from_status: prevStatus,
                to_status: status,
                actor: "Mollie",
                actor_type: "system",
              });
            } catch (e) {
              console.error("order_events insert failed:", e);
            }
          }

          // Send the order confirmation email once, when the payment is paid.
          // Atomic guard: only the first webhook delivery that flips
          // email_confirmation_sent_at from NULL → now() actually sends.
          if (orderId && status === "paid") {
            try {
              const { data: claimed } = await (supabaseAdmin.from("orders") as any)
                .update({ email_confirmation_sent_at: new Date().toISOString() })
                .eq("id", orderId)
                .is("email_confirmation_sent_at", null)
                .select("id, customer_email, lang, amount_subtotal, amount_shipping, amount_total, amount_tax, shipping_name, shipping_line1, shipping_postal_code, shipping_city, shipping_country")
                .maybeSingle();

              if (claimed?.customer_email) {
                const { data: lines } = await (supabaseAdmin.from("order_lines") as any)
                  .select("bundle_key, quantity, unit_price_cents")
                  .eq("order_id", orderId);

                const { sendOrderConfirmationEmail } = await import("@/lib/email/order-confirmation.server");
                const result = await sendOrderConfirmationEmail({
                  to: claimed.customer_email,
                  lang: claimed.lang,
                  orderId: claimed.id,
                  items: (lines ?? []).map((l: any) => ({
                    bundleKey: l.bundle_key,
                    quantity: l.quantity,
                    unitPriceCents: l.unit_price_cents,
                  })),
                  amountSubtotalCents: claimed.amount_subtotal ?? 0,
                  amountShippingCents: claimed.amount_shipping ?? 0,
                  amountTotalCents: claimed.amount_total ?? 0,
                  amountVatCents: claimed.amount_tax ?? 0,
                  shipping: {
                    name: claimed.shipping_name ?? "",
                    line1: claimed.shipping_line1 ?? "",
                    postalCode: claimed.shipping_postal_code ?? "",
                    city: claimed.shipping_city ?? "",
                    country: claimed.shipping_country ?? "",
                  },
                });
                if (!result.ok) {
                  // Roll back the claim so a future retry can try again.
                  await (supabaseAdmin.from("orders") as any)
                    .update({ email_confirmation_sent_at: null })
                    .eq("id", orderId);
                  console.error("order confirmation email failed:", result.error);
                }
              }
            } catch (e) {
              console.error("order confirmation email error:", e);
              try {
                await (supabaseAdmin.from("orders") as any)
                  .update({ email_confirmation_sent_at: null })
                  .eq("id", orderId);
              } catch {}
            }
          }

          await logCall("success");
          return new Response("ok", { status: 200 });
        } catch (e: any) {
          console.error("Mollie webhook error:", e);
          await logCall("error", e?.message ? String(e.message).slice(0, 500) : "unknown error");
          return new Response("Webhook error", { status: 500 });
        }
      },
    },
  },
});
