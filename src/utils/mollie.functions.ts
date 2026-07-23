import { createServerFn } from "@tanstack/react-start";
import { computeB2CTotals, SHIPPING_FEE_CENTS } from "@/lib/shipping";

type BundleKey = "frameid_solo_onetime" | "frameid_duo_onetime" | "frameid_family_onetime";

const BUNDLES: Record<BundleKey, { name: string; amountCents: number }> = {
  frameid_solo_onetime: { name: "Velopass Frame-ID Solo", amountCents: 1295 },
  frameid_duo_onetime: { name: "Velopass Frame-ID Duo", amountCents: 2195 },
  frameid_family_onetime: { name: "Velopass Frame-ID Familie", amountCents: 4995 },
};

const formatAmount = (cents: number) => (cents / 100).toFixed(2);

const MOLLIE_API = "https://api.mollie.com/v2";

export async function mollieFetch(path: string, init: RequestInit = {}) {
  const apiKey = process.env.MOLLIE_API_KEY;
  if (!apiKey) throw new Error("MOLLIE_API_KEY is not configured");
  const method = (init.method ?? "GET").toUpperCase();
  const res = await fetch(`${MOLLIE_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore
  }
  if (!res.ok) {
    // Mollie 422 responses include `field` (or `extra.field`) that pinpoint
    // exactly which body key was rejected. Bubble that up in both the log
    // and the thrown Error so recovery/retry failures are debuggable.
    const field =
      json?.field ??
      json?.extra?.field ??
      (Array.isArray(json?.violations)
        ? json.violations.map((v: any) => v.field).join(",")
        : null);
    const detail = json?.detail || json?.title || `Mollie HTTP ${res.status}`;
    console.error(
      `[mollieFetch] ${method} ${path} failed: status=${res.status}${field ? ` field=${field}` : ""} detail=${detail}`,
      json ?? text?.slice(0, 500),
    );
    throw new Error(`${detail}${field ? ` (field=${field})` : ""}`);
  }
  return json;
}


export type MollieCheckoutResult = { checkoutUrl: string; paymentId: string } | { error: string };

type SupportedLang = "nl" | "en" | "fr" | "de" | "es";

const LANG_TO_MOLLIE_LOCALE: Record<SupportedLang, string> = {
  nl: "nl_BE", // BE is our largest market — Bancontact defaults
  en: "en_US", // Mollie's standard English locale (en_GB not in supported list)
  fr: "fr_BE", // Wallonia is bigger for us than FR-FR
  de: "de_DE",
  es: "es_ES",
};

export const createMolliePayment = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      items: Array<{ priceId: string; quantity: number }>;
      customerEmail: string;
      origin: string;
      lang: SupportedLang;
      shipping: {
        firstName: string;
        lastName: string;
        address: string;
        postalCode: string;
        city: string;
        country: string;
      };
      referralSource?: string | null;
      experimentVariant?: string | null;
    }) => {
      if (!Array.isArray(data.items) || data.items.length === 0) {
        throw new Error("Minstens één bundel is vereist");
      }
      for (const item of data.items) {
        if (!(item.priceId in BUNDLES)) throw new Error(`Onbekende bundel: ${item.priceId}`);
        if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50) {
          throw new Error("Ongeldig aantal");
        }
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.customerEmail)) {
        throw new Error("Ongeldig e-mailadres");
      }
      if (!/^https?:\/\//.test(data.origin)) throw new Error("Ongeldige origin");
      if (!/^(nl|en|fr|de|es)$/.test(data.lang)) throw new Error("Invalid language");

      const s = data.shipping;
      if (!s || !s.firstName?.trim() || !s.lastName?.trim() || !s.address?.trim()
          || !s.postalCode?.trim() || !s.city?.trim()) {
        throw new Error("Verzendadres is onvolledig");
      }
      if (!/^[A-Z]{2}$/.test(s.country)) throw new Error("Ongeldig land (ISO 2-letter vereist)");
      const ALLOWED_REFERRAL = new Set(["bike_shop","friend_family","social","search","ai","insurance","roadside","other"]);
      if (data.referralSource != null && data.referralSource !== "" && !ALLOWED_REFERRAL.has(data.referralSource)) {
        throw new Error("Ongeldige referral_source");
      }
      if (
        data.experimentVariant != null &&
        data.experimentVariant !== "" &&
        !/^[a-z0-9_]{1,64}:[AB]$/.test(data.experimentVariant)
      ) {
        // Non-fatal: ignore a malformed marker rather than block checkout.
        data.experimentVariant = null;
      }
      return data;
    },
  )
  .handler(async ({ data }): Promise<MollieCheckoutResult> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { productSubtotalCents, shippingCents, totalCents, vatCents } =
        computeB2CTotals(data.items);
      const description = data.items
        .map((i) => `${BUNDLES[i.priceId as BundleKey].name} × ${i.quantity}`)
        .join(", ");
      const environment = process.env.MOLLIE_API_KEY?.startsWith("live_") ? "live" : "sandbox";

      const shippingAddress = {
        givenName: data.shipping.firstName.trim(),
        familyName: data.shipping.lastName.trim(),
        streetAndNumber: data.shipping.address.trim(),
        postalCode: data.shipping.postalCode.trim(),
        city: data.shipping.city.trim(),
        country: data.shipping.country,
        email: data.customerEmail,
      };

      const mollieLocale = LANG_TO_MOLLIE_LOCALE[data.lang];
      const redirectBase = `${data.origin}/${data.lang}/order/thanks`;

      // Mollie must be able to reach the webhook. The id-preview/preview-- lovable.app
      // hosts sit behind auth-bridge and 302 unauthenticated POSTs, so we route the
      // webhook through the stable project URL which bypasses auth on /api/public/*.
      const LOVABLE_PROJECT_ID = "973248f2-3aa9-493e-b716-2b089779e41a";
      let webhookBase = data.origin;
      try {
        const host = new URL(data.origin).host;
        if (host.endsWith(".lovable.app") && (host.startsWith("id-preview--") || host.startsWith("preview--"))) {
          webhookBase = `https://project--${LOVABLE_PROJECT_ID}-dev.lovable.app`;
        }
      } catch {
        // fall through with origin as-is
      }

      // Create payment with placeholder redirect; we'll patch with real ID after.
      const payment = await mollieFetch("/payments", {
        method: "POST",
        body: JSON.stringify({
          amount: { currency: "EUR", value: formatAmount(totalCents) },
          description: `Velopass — ${description}`,
          redirectUrl: `${redirectBase}?payment_id=pending`,
          webhookUrl: `${webhookBase}/api/public/payments/mollie-webhook`,
          billingEmail: data.customerEmail,
          billingAddress: shippingAddress,
          shippingAddress,
          locale: mollieLocale,
          metadata: {
            items: data.items,
            email: data.customerEmail,
            shipping: shippingAddress,
            lang: data.lang,
          },
        }),
      });

      const realRedirect = `${redirectBase}?payment_id=${payment.id}`;

      await mollieFetch(`/payments/${payment.id}`, {
        method: "PATCH",
        body: JSON.stringify({ redirectUrl: realRedirect }),
      });

      const totalsByBundle = data.items
        .map((i) => `${BUNDLES[i.priceId as BundleKey].name} × ${i.quantity}`)
        .join(", ");
      const firstItem = data.items[0];
      await (supabaseAdmin.from("orders") as any).upsert(
        {
          mollie_payment_id: payment.id,
          customer_email: data.customerEmail,
          price_id: firstItem.priceId,
          product_name: totalsByBundle,
          quantity: data.items.reduce((s, i) => s + i.quantity, 0),
          amount_subtotal: productSubtotalCents,
          amount_shipping: shippingCents,
          amount_tax: vatCents,
          amount_total: totalCents,
          currency: "eur",
          status: "pending",
          environment,
          shipping_name: `${shippingAddress.givenName} ${shippingAddress.familyName}`.trim(),
          shipping_line1: shippingAddress.streetAndNumber,
          shipping_postal_code: shippingAddress.postalCode,
          shipping_city: shippingAddress.city,
          shipping_country: shippingAddress.country,
          lang: data.lang,
          referral_source: data.referralSource && data.referralSource !== "" ? data.referralSource : null,
          updated_at: new Date().toISOString(),

        },
        { onConflict: "mollie_payment_id" },
      );

      // Best-effort: tag the order with its A/B variant in a separate update so a
      // missing column (before the migration lands) can never break checkout.
      if (data.experimentVariant && data.experimentVariant !== "") {
        try {
          await (supabaseAdmin.from("orders") as any)
            .update({ experiment_variant: data.experimentVariant })
            .eq("mollie_payment_id", payment.id);
        } catch (e) {
          console.error("experiment_variant tag failed:", e instanceof Error ? e.message : e);
        }
      }

      const checkoutUrl = payment?._links?.checkout?.href;
      if (!checkoutUrl) throw new Error("Mollie gaf geen checkout-URL terug");
      return { checkoutUrl, paymentId: payment.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Mollie betaling mislukt";
      console.error("createMolliePayment error:", message);
      return { error: message };
    }
  });

export const getOrderByMolliePayment = createServerFn({ method: "POST" })
  .inputValidator((data: { paymentId: string }) => {
    if (!/^tr_[a-zA-Z0-9]+$/.test(data.paymentId)) throw new Error("Ongeldige paymentId");
    return data;
  })
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const payment = await mollieFetch(`/payments/${data.paymentId}`);
      const metadata: any = payment?.metadata ?? {};
      const items: Array<{ priceId: string; quantity: number }> = Array.isArray(metadata.items)
        ? metadata.items
        : [];
      const amountCents = Math.round(parseFloat(payment.amount.value) * 100);

      // Authoritative status: prefer the DB order's status when present
      // (covers recovery-payment links where this payment is unpaid but the
      // original order was paid via another payment). Falls back to Mollie.
      let orderStatus: string = payment.status as string;
      const recoveryForOrderId =
        typeof metadata.recovery_for_order_id === "string" ? metadata.recovery_for_order_id : null;
      if (recoveryForOrderId) {
        const { data: orig } = await (supabaseAdmin.from("orders") as any)
          .select("status")
          .eq("id", recoveryForOrderId)
          .maybeSingle();
        if (orig?.status === "paid" || orig?.status === "printed" || orig?.status === "shipped") {
          orderStatus = "paid";
        }
      } else {
        const { data: row } = await (supabaseAdmin.from("orders") as any)
          .select("status")
          .eq("mollie_payment_id", data.paymentId)
          .maybeSingle();
        if (row?.status === "paid" || row?.status === "printed" || row?.status === "shipped") {
          orderStatus = "paid";
        }
      }

      return {
        status: orderStatus,
        paymentStatus: payment.status as string,
        email: metadata.email ?? null,
        amountTotal: amountCents,
        items,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kon bestelling niet ophalen";
      return { error: message };
    }
  });

export const retryOrderPayment = createServerFn({ method: "POST" })
  .inputValidator((data: { paymentId: string; origin: string }) => {
    if (!/^tr_[a-zA-Z0-9]+$/.test(data.paymentId)) throw new Error("Ongeldige paymentId");
    if (!/^https?:\/\//.test(data.origin)) throw new Error("Ongeldige origin");
    return data;
  })
  .handler(async ({ data }): Promise<{ checkoutUrl: string } | { error: string }> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const originalPayment = await mollieFetch(`/payments/${data.paymentId}`);
      const meta: any = originalPayment?.metadata ?? {};

      // Find the order — either by mollie_payment_id, or via recovery metadata.
      let originalOrderId: string | null =
        typeof meta.recovery_for_order_id === "string" ? meta.recovery_for_order_id : null;
      let order: any = null;
      if (originalOrderId) {
        const { data: o } = await (supabaseAdmin.from("orders") as any)
          .select("id, status, customer_email, lang, amount_total, shipping_name, shipping_line1, shipping_postal_code, shipping_city, shipping_country")
          .eq("id", originalOrderId)
          .maybeSingle();
        order = o;
      } else {
        const { data: o } = await (supabaseAdmin.from("orders") as any)
          .select("id, status, customer_email, lang, amount_total, shipping_name, shipping_line1, shipping_postal_code, shipping_city, shipping_country")
          .eq("mollie_payment_id", data.paymentId)
          .maybeSingle();
        order = o;
        originalOrderId = o?.id ?? null;
      }
      if (!order || !originalOrderId) return { error: "Order niet gevonden" };
      if (["paid", "printed", "shipped"].includes(order.status)) {
        return { error: "Order is al betaald" };
      }

      const items: Array<{ priceId: string; quantity: number }> = Array.isArray(meta.items)
        ? meta.items
        : [];
      const lang: SupportedLang =
        meta.lang && /^(nl|en|fr|de|es)$/.test(meta.lang)
          ? meta.lang
          : ((order.lang as SupportedLang) ?? "nl");
      const nameParts = (order.shipping_name ?? "").trim().split(/\s+/);
      const shippingAddress = meta.shipping ?? {
        givenName: nameParts[0] ?? "",
        familyName: nameParts.slice(1).join(" ") || nameParts[0] || "",
        streetAndNumber: order.shipping_line1 ?? "",
        postalCode: order.shipping_postal_code ?? "",
        city: order.shipping_city ?? "",
        country: order.shipping_country ?? "BE",
        email: order.customer_email,
      };

      const totalCents = order.amount_total;
      const description =
        items.length > 0
          ? items
              .map((i) => `${BUNDLES[i.priceId as BundleKey]?.name ?? i.priceId} × ${i.quantity}`)
              .join(", ")
          : "Velopass Frame-ID";

      const redirectBase = `${data.origin}/${lang}/order/thanks`;
      const LOVABLE_PROJECT_ID = "973248f2-3aa9-493e-b716-2b089779e41a";
      let webhookBase = data.origin;
      try {
        const host = new URL(data.origin).host;
        if (host.endsWith(".lovable.app") && (host.startsWith("id-preview--") || host.startsWith("preview--"))) {
          webhookBase = `https://project--${LOVABLE_PROJECT_ID}-dev.lovable.app`;
        }
      } catch {
        // fall through
      }

      const payment = await mollieFetch("/payments", {
        method: "POST",
        body: JSON.stringify({
          amount: { currency: "EUR", value: formatAmount(totalCents) },
          description: `Velopass — ${description}`,
          redirectUrl: `${redirectBase}?payment_id=pending`,
          webhookUrl: `${webhookBase}/api/public/payments/mollie-webhook`,
          billingEmail: order.customer_email,
          billingAddress: shippingAddress,
          shippingAddress,
          locale: LANG_TO_MOLLIE_LOCALE[lang],
          metadata: {
            items,
            email: order.customer_email,
            shipping: shippingAddress,
            lang,
            recovery_for_order_id: originalOrderId,
          },
        }),
      });

      const realRedirect = `${redirectBase}?payment_id=${payment.id}`;
      await mollieFetch(`/payments/${payment.id}`, {
        method: "PATCH",
        body: JSON.stringify({ redirectUrl: realRedirect }),
      });

      const checkoutUrl = payment?._links?.checkout?.href;
      if (!checkoutUrl) throw new Error("Mollie gaf geen checkout-URL terug");
      return { checkoutUrl };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kon betaling niet hervatten";
      console.error("retryOrderPayment error:", message);
      return { error: message };
    }
  });
