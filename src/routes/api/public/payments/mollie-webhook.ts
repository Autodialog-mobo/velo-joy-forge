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
        const webhookStartedAt = Date.now();
        let payloadId: string | null = null;
        let paymentStatus: string | null = null;
        const wlog = (level: "info" | "warn" | "error", msg: string, extra?: Record<string, unknown>) => {
          const line = `[mollie-webhook host=${originHost} id=${payloadId ?? "?"}] ${msg}`;
          if (level === "error") console.error(line, extra ?? "");
          else if (level === "warn") console.warn(line, extra ?? "");
          else console.log(line, extra ?? "");
        };

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

        wlog("info", "webhook received", { originKind });

        try {
          const form = await request.formData();
          const id = form.get("id");
          if (typeof id !== "string" || !/^tr_[a-zA-Z0-9]+$/.test(id)) {
            wlog("error", "invalid payment id in body", { id });
            await logCall("error", "Invalid id");
            return new Response("Invalid id", { status: 400 });
          }
          payloadId = id;
          wlog("info", "fetching Mollie payment");

          const payment = await fetchMolliePayment(id);
          const p: any = payment;
          const status: string = p.status;
          paymentStatus = status;
          wlog("info", "Mollie payment fetched", { status, amount: p.amount, hasShipping: !!(p.shippingAddress ?? p.metadata?.shipping) });
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
            .select("id, status, email_confirmation_sent_at, customer_email")
            .eq("mollie_payment_id", p.id)
            .maybeSingle();
          const prevStatus: string | null = existing?.status ?? null;
          wlog("info", "previous order state", {
            existed: !!existing,
            prevStatus,
            alreadyEmailed: !!existing?.email_confirmation_sent_at,
            existingEmail: existing?.customer_email,
          });

          const customerEmail = p.metadata?.email ?? p.billingEmail ?? p.customerEmail ?? "";
          if (!customerEmail) {
            wlog("warn", "no customer email in Mollie payload", { metadataKeys: Object.keys(p.metadata ?? {}) });
          }

          const { data: upserted, error: upsertError } = await (supabaseAdmin.from("orders") as any).upsert(
            {
              mollie_payment_id: p.id,
              customer_email: customerEmail,
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

          if (upsertError) {
            wlog("error", "order upsert failed", { error: upsertError });
          }

          const orderId = upserted?.id;
          wlog("info", "order upserted", { orderId, statusTransition: `${prevStatus} → ${status}` });

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
              const { error: linesError } = await (supabaseAdmin.from("order_lines") as any).insert(rows);
              if (linesError) wlog("error", "order_lines insert failed", { error: linesError });
              else wlog("info", "order_lines inserted", { count: rows.length });
            } else {
              wlog("warn", "no recognized bundle items to insert", { items });
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
              wlog("error", "order_events insert failed", { error: e });
            }
          }

          // Send the order confirmation email once, when the payment is paid.
          // Atomic guard: only the first webhook delivery that flips
          // email_confirmation_sent_at from NULL → now() actually sends.
          if (orderId && status === "paid") {
            wlog("info", "status is paid — attempting email claim");
            try {
              const { data: claimed, error: claimError } = await (supabaseAdmin.from("orders") as any)
                .update({ email_confirmation_sent_at: new Date().toISOString() })
                .eq("id", orderId)
                .is("email_confirmation_sent_at", null)
                .select("id, customer_email, lang, amount_subtotal, amount_shipping, amount_total, amount_tax, shipping_name, shipping_line1, shipping_postal_code, shipping_city, shipping_country")
                .maybeSingle();

              if (claimError) {
                wlog("error", "email claim update failed", { error: claimError });
              }

              if (!claimed) {
                wlog("info", "email already claimed by another delivery — skipping send");
              } else if (!claimed.customer_email) {
                wlog("warn", "claimed order has empty customer_email — cannot send", { orderId });
                // Release the claim since we did not actually send
                await (supabaseAdmin.from("orders") as any)
                  .update({ email_confirmation_sent_at: null })
                  .eq("id", orderId);
                try {
                  const { supabaseAdmin: sa } = { supabaseAdmin };
                  await (sa.from("email_send_log") as any).insert({
                    template: "order_confirmation",
                    order_id: orderId,
                    recipient: null,
                    status: "skipped_no_recipient",
                    error_message: "Order has no customer_email",
                  });
                } catch {}
              } else {
                const { data: lines } = await (supabaseAdmin.from("order_lines") as any)
                  .select("bundle_key, quantity, unit_price_cents")
                  .eq("order_id", orderId);

                wlog("info", "calling sendOrderConfirmationEmail", {
                  to: claimed.customer_email,
                  lang: claimed.lang,
                  lineCount: lines?.length ?? 0,
                });

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
                  wlog("error", "order confirmation email failed — releasing claim", { error: result.error });
                  await (supabaseAdmin.from("orders") as any)
                    .update({ email_confirmation_sent_at: null })
                    .eq("id", orderId);
                } else {
                  wlog("info", "order confirmation email sent", { resendId: result.id });
                }
              }
            } catch (e: any) {
              wlog("error", "order confirmation email threw exception", { error: e?.message, stack: e?.stack });
              try {
                await (supabaseAdmin.from("orders") as any)
                  .update({ email_confirmation_sent_at: null })
                  .eq("id", orderId);
              } catch {}
            }
          } else if (orderId && status !== "paid") {
            wlog("info", "status is not paid — no email sent", { status });
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
