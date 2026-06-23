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

async function mollieFetch(path: string, init: RequestInit = {}) {
  const apiKey = process.env.MOLLIE_API_KEY;
  if (!apiKey) throw new Error("MOLLIE_API_KEY is not configured");
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
    const msg = json?.detail || json?.title || `Mollie HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

export type MollieCheckoutResult = { checkoutUrl: string; paymentId: string } | { error: string };

type SupportedLang = "nl" | "en" | "fr" | "de";

const LANG_TO_MOLLIE_LOCALE: Record<SupportedLang, string> = {
  nl: "nl_BE", // BE is our largest market — Bancontact defaults
  en: "en_US", // Mollie's standard English locale (en_GB not in supported list)
  fr: "fr_BE", // Wallonia is bigger for us than FR-FR
  de: "de_DE",
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
      if (!/^(nl|en|fr|de)$/.test(data.lang)) throw new Error("Ongeldige taal");

      const s = data.shipping;
      if (!s || !s.firstName?.trim() || !s.lastName?.trim() || !s.address?.trim()
          || !s.postalCode?.trim() || !s.city?.trim()) {
        throw new Error("Verzendadres is onvolledig");
      }
      if (!/^[A-Z]{2}$/.test(s.country)) throw new Error("Ongeldig land (ISO 2-letter vereist)");
      const ALLOWED_REFERRAL = new Set(["shop","friend","social","search","ai","insurance","roadside","other"]);
      if (data.referralSource != null && data.referralSource !== "" && !ALLOWED_REFERRAL.has(data.referralSource)) {
        throw new Error("Ongeldige referral_source");
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
          updated_at: new Date().toISOString(),

        },
        { onConflict: "mollie_payment_id" },
      );

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
      const payment = await mollieFetch(`/payments/${data.paymentId}`);
      const metadata: any = payment?.metadata ?? {};
      const items: Array<{ priceId: string; quantity: number }> = Array.isArray(metadata.items)
        ? metadata.items
        : [];
      const amountCents = Math.round(parseFloat(payment.amount.value) * 100);
      return {
        status: payment.status as string,
        email: metadata.email ?? null,
        amountTotal: amountCents,
        items,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kon bestelling niet ophalen";
      return { error: message };
    }
  });
