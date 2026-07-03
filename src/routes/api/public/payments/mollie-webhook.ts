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

          // Recovery payments are tied to an existing order via metadata.
          // Route them to the original order instead of upserting a brand-new
          // orders row (which would have its own fresh recovery_email_sent_at
          // and cause a SECOND recovery email when the recovery payment
          // itself expires). One recovery email per order, ever.
          const recoveryForOrderId =
            typeof p.metadata?.recovery_for_order_id === "string"
              ? p.metadata.recovery_for_order_id
              : null;
          if (recoveryForOrderId) {
            wlog("info", "recovery payment webhook — routing to original order", {
              originalOrderId: recoveryForOrderId,
              status,
            });
            const { data: originalOrder } = await (supabaseAdmin.from("orders") as any)
              .select(
                "id, status, customer_email, lang, amount_subtotal, amount_shipping, amount_total, amount_tax, shipping_name, shipping_line1, shipping_postal_code, shipping_city, shipping_country, email_confirmation_sent_at",
              )
              .eq("id", recoveryForOrderId)
              .maybeSingle();

            if (!originalOrder) {
              wlog("warn", "recovery: original order not found — ignoring", { recoveryForOrderId });
              await logCall("success");
              return new Response("ok", { status: 200 });
            }

            if (status === "paid") {
              // Mark original order as paid (if not already) and send the
              // confirmation email exactly once, using the same atomic claim.
              await (supabaseAdmin.from("orders") as any)
                .update({
                  status: "paid",
                  payment_method: typeof p.method === "string" ? p.method : null,
                  payment_consumer_name:
                    (typeof p.details?.consumerName === "string" && p.details.consumerName) ||
                    (typeof p.details?.cardHolder === "string" && p.details.cardHolder) ||
                    null,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", originalOrder.id);

              try {
                const { data: claimed } = await (supabaseAdmin.from("orders") as any)
                  .update({ email_confirmation_sent_at: new Date().toISOString() })
                  .eq("id", originalOrder.id)
                  .is("email_confirmation_sent_at", null)
                  .select("id, customer_email, lang, amount_subtotal, amount_shipping, amount_total, amount_tax, shipping_name, shipping_line1, shipping_postal_code, shipping_city, shipping_country")
                  .maybeSingle();

                if (claimed && claimed.customer_email) {
                  const { data: lines } = await (supabaseAdmin.from("order_lines") as any)
                    .select("bundle_key, quantity, unit_price_cents")
                    .eq("order_id", originalOrder.id);
                  const { sendOrderConfirmationEmail } = await import(
                    "@/lib/email/order-confirmation.server"
                  );
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
                    wlog("error", "recovery-paid: confirmation email failed — releasing claim", { error: result.error });
                    await (supabaseAdmin.from("orders") as any)
                      .update({ email_confirmation_sent_at: null })
                      .eq("id", originalOrder.id);
                  } else {
                    wlog("info", "recovery-paid: confirmation email sent", { resendId: result.id });
                  }
                } else {
                  wlog("info", "recovery-paid: confirmation already sent or no email — skipping");
                }
              } catch (e: any) {
                wlog("error", "recovery-paid: confirmation email threw", { error: e?.message });
              }
            } else {
              // expired / canceled / failed on a recovery payment: do NOT
              // create another recovery payment or send another email. The
              // original order already has recovery_email_sent_at set.
              wlog("info", "recovery payment non-paid status — no further action", { status });
            }

            await logCall("success");
            wlog("info", "webhook completed (recovery path)", { durationMs: Date.now() - webhookStartedAt });
            return new Response("ok", { status: 200 });
          }

          const shipping = p.shippingAddress ?? p.metadata?.shipping ?? null;
          const shippingName = shipping
            ? `${shipping.givenName ?? ""} ${shipping.familyName ?? ""}`.trim()
            : "";

          const items: Array<{ priceId: string; quantity: number }> = Array.isArray(p.metadata?.items)
            ? p.metadata.items
            : [];

          const metaLang = typeof p.metadata?.lang === "string" && /^(nl|en|fr|de|es)$/.test(p.metadata.lang)
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
              payment_method: typeof p.method === "string" ? p.method : null,
              payment_consumer_name:
                (typeof p.details?.consumerName === "string" && p.details.consumerName) ||
                (typeof p.details?.cardHolder === "string" && p.details.cardHolder) ||
                null,
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
            wlog("info", "status is not paid — no confirmation email sent", { status });
          }

          // Recovery email: when payment expires without ever being paid, send
          // ONE follow-up email with a fresh Mollie checkout URL. Atomic claim
          // on recovery_email_sent_at guarantees a single send per order.
          if (orderId && status === "expired") {
            try {
              const { data: orderRow } = await (supabaseAdmin.from("orders") as any)
                .select(
                  "id, customer_email, lang, amount_subtotal, amount_shipping, amount_total, shipping_name, shipping_line1, shipping_postal_code, shipping_city, shipping_country, email_confirmation_sent_at, recovery_email_sent_at",
                )
                .eq("id", orderId)
                .maybeSingle();

              if (!orderRow) {
                wlog("warn", "expired: order row vanished", { orderId });
              } else if (orderRow.email_confirmation_sent_at) {
                wlog("info", "expired: order was already paid — skip recovery", { orderId });
              } else if (orderRow.recovery_email_sent_at) {
                wlog("info", "expired: recovery email already sent — skip", { orderId });
              } else if (!orderRow.customer_email) {
                wlog("warn", "expired: order has no customer_email — cannot send recovery", { orderId });
              } else {
                wlog("info", "expired: attempting recovery email claim");
                const { data: claimed } = await (supabaseAdmin.from("orders") as any)
                  .update({ recovery_email_sent_at: new Date().toISOString() })
                  .eq("id", orderId)
                  .is("recovery_email_sent_at", null)
                  .neq("status", "paid")
                  .select("id")
                  .maybeSingle();

                if (!claimed) {
                  wlog("info", "expired: recovery claim lost to concurrent delivery — skipping");
                } else {
                  const { data: lines } = await (supabaseAdmin.from("order_lines") as any)
                    .select("bundle_key, quantity, unit_price_cents")
                    .eq("order_id", orderId);

                  const items = (lines ?? []).map((l: any) => ({
                    priceId: l.bundle_key as string,
                    quantity: l.quantity as number,
                  }));

                  if (!items.length) {
                    wlog("warn", "expired: order has no recognizable lines — releasing claim", { orderId });
                    await (supabaseAdmin.from("orders") as any)
                      .update({ recovery_email_sent_at: null })
                      .eq("id", orderId);
                  } else {
                    const totals = computeB2CTotals(items);
                    const lang: "nl" | "fr" | "de" | "en" | "es" =
                      orderRow.lang === "fr" || orderRow.lang === "de" || orderRow.lang === "en" || orderRow.lang === "es"
                        ? orderRow.lang
                        : "nl";

                    // Split shipping name into given/family for Mollie.
                    const fullName = (orderRow.shipping_name ?? "").trim();
                    const parts = fullName.split(/\s+/);
                    const givenName = parts.length > 1 ? parts.slice(0, -1).join(" ") : (parts[0] ?? "");
                    const familyName = parts.length > 1 ? parts[parts.length - 1] : (parts[0] ?? "");

                    const shippingAddress = {
                      givenName: givenName || "Klant",
                      familyName: familyName || "—",
                      streetAndNumber: orderRow.shipping_line1 ?? "",
                      postalCode: orderRow.shipping_postal_code ?? "",
                      city: orderRow.shipping_city ?? "",
                      country: orderRow.shipping_country || "BE",
                      email: orderRow.customer_email,
                    };

                    const LOVABLE_PROJECT_ID = "973248f2-3aa9-493e-b716-2b089779e41a";
                    const isProd = environment === "live";
                    const siteBase = isProd
                      ? "https://www.velopass.com"
                      : `https://project--${LOVABLE_PROJECT_ID}-dev.lovable.app`;
                    const webhookBase = isProd
                      ? `https://project--${LOVABLE_PROJECT_ID}.lovable.app`
                      : `https://project--${LOVABLE_PROJECT_ID}-dev.lovable.app`;
                    const redirectBase = `${siteBase}/${lang}/order/thanks`;

                    const LOCALE_MAP: Record<string, string> = {
                      nl: "nl_BE",
                      en: "en_US",
                      fr: "fr_BE",
                      de: "de_DE",
                      es: "es_ES",
                    };

                    try {
                      const mollieApiKey = process.env.MOLLIE_API_KEY;
                      if (!mollieApiKey) throw new Error("MOLLIE_API_KEY not configured");

                      // Give the customer plenty of time to read the email and pay.
                      // Mollie accepts expiresAt as YYYY-MM-DD; for payment methods
                      // that cap the maximum expiry below this, Mollie clamps to
                      // the method maximum and returns the actual expiresAt on the
                      // payment — we read that back and surface it in the email so
                      // the date shown always matches reality.
                      const desiredExpiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

                      const molliePayload = {
                        amount: { currency: "EUR", value: (totals.totalCents / 100).toFixed(2) },
                        description: `Velopass — afronden bestelling #${orderId.replace(/-/g, "").slice(0, 8)}`,
                        redirectUrl: `${redirectBase}?payment_id=pending`,
                        webhookUrl: `${webhookBase}/api/public/payments/mollie-webhook`,
                        billingEmail: orderRow.customer_email,
                        billingAddress: shippingAddress,
                        shippingAddress,
                        locale: LOCALE_MAP[lang],
                        metadata: {
                          items,
                          email: orderRow.customer_email,
                          shipping: shippingAddress,
                          lang,
                          recovery_for_order_id: orderId,
                        },
                      };

                      wlog("info", "recovery: creating Mollie payment", {
                        amount: molliePayload.amount,
                        locale: molliePayload.locale,
                        webhookUrl: molliePayload.webhookUrl,
                        redirectUrl: molliePayload.redirectUrl,
                        payloadKeys: Object.keys(molliePayload),
                        countryCode: shippingAddress.country,
                        itemsCount: items.length,
                      });

                      const createRes = await fetch("https://api.mollie.com/v2/payments", {
                        method: "POST",
                        headers: {
                          Authorization: `Bearer ${mollieApiKey}`,
                          "Content-Type": "application/json",
                          Accept: "application/json",
                        },
                        body: JSON.stringify(molliePayload),
                      });
                      const newPayment: any = await createRes.json().catch(() => ({}));
                      if (!createRes.ok || !newPayment?.id || !newPayment?._links?.checkout?.href) {
                        // Extract Mollie 422 field-level details when present so we
                        // know which field triggered the rejection (e.g. expiresAt,
                        // locale, shippingAddress.country) instead of a generic 422.
                        const mollieField =
                          newPayment?.field ??
                          newPayment?.extra?.field ??
                          (Array.isArray(newPayment?.violations)
                            ? newPayment.violations.map((v: any) => v.field).join(",")
                            : null);
                        const detail =
                          newPayment?.detail ?? newPayment?.title ?? newPayment?.message ?? "unknown";
                        wlog("error", "recovery: Mollie rejected create-payment", {
                          httpStatus: createRes.status,
                          field: mollieField,
                          detail,
                          body: newPayment,
                        });
                        throw new Error(
                          `Mollie create HTTP ${createRes.status}${mollieField ? ` field=${mollieField}` : ""}: ${detail}`,
                        );
                      }
                      // Mollie returns expiresAt as an ISO 8601 timestamp; fall back
                      // to our requested date when absent (some methods omit it).
                      const actualExpiresAt: Date = newPayment.expiresAt
                        ? new Date(newPayment.expiresAt)
                        : desiredExpiryDate;
                      const newCheckoutUrl: string = newPayment._links.checkout.href;
                      const newPaymentId: string = newPayment.id;

                      wlog("info", "recovery: Mollie accepted create-payment", {
                        newPaymentId,
                        checkoutHost: (() => { try { return new URL(newCheckoutUrl).host; } catch { return null; } })(),
                        expiresAt: actualExpiresAt.toISOString(),
                      });

                      // Patch redirect with real new payment id (mirrors createMolliePayment).
                      await fetch(`https://api.mollie.com/v2/payments/${newPaymentId}`, {
                        method: "PATCH",
                        headers: {
                          Authorization: `Bearer ${mollieApiKey}`,
                          "Content-Type": "application/json",
                          Accept: "application/json",
                        },
                        body: JSON.stringify({
                          redirectUrl: `${redirectBase}?payment_id=${newPaymentId}`,
                        }),
                      });

                      await (supabaseAdmin.from("orders") as any)
                        .update({ recovery_mollie_payment_id: newPaymentId })
                        .eq("id", orderId);

                      wlog("info", "recovery: new Mollie payment created", { newPaymentId });


                      const { sendOrderRecoveryEmail } = await import(
                        "@/lib/email/order-recovery.server"
                      );
                      const result = await sendOrderRecoveryEmail({
                        to: orderRow.customer_email,
                        lang,
                        orderId,
                        checkoutUrl: newCheckoutUrl,
                        items: (lines ?? []).map((l: any) => ({
                          bundleKey: l.bundle_key,
                          quantity: l.quantity,
                          unitPriceCents: l.unit_price_cents,
                        })),
                        amountSubtotalCents: orderRow.amount_subtotal ?? totals.productSubtotalCents,
                        amountShippingCents: orderRow.amount_shipping ?? totals.shippingCents,
                        amountTotalCents: orderRow.amount_total ?? totals.totalCents,
                        firstName: givenName || null,
                        expiresAt: actualExpiresAt.toISOString(),
                      });

                      if (!result.ok) {
                        wlog("error", "recovery email failed — releasing claim", { error: result.error });
                        await (supabaseAdmin.from("orders") as any)
                          .update({ recovery_email_sent_at: null })
                          .eq("id", orderId);
                      } else {
                        wlog("info", "recovery email sent", { resendId: result.id });
                      }
                    } catch (e: any) {
                      wlog("error", "recovery flow threw — releasing claim", {
                        error: e?.message,
                        stack: e?.stack,
                      });
                      await (supabaseAdmin.from("orders") as any)
                        .update({ recovery_email_sent_at: null })
                        .eq("id", orderId);
                    }
                  }
                }
              }
            } catch (e: any) {
              wlog("error", "recovery outer block threw", { error: e?.message });
            }
          }

          await logCall("success");
          wlog("info", "webhook completed", { durationMs: Date.now() - webhookStartedAt });
          return new Response("ok", { status: 200 });
        } catch (e: any) {
          wlog("error", "Mollie webhook threw exception", { error: e?.message, stack: e?.stack, durationMs: Date.now() - webhookStartedAt });
          await logCall("error", e?.message ? String(e.message).slice(0, 500) : "unknown error");
          return new Response("Webhook error", { status: 500 });
        }
      },
    },
  },
});
