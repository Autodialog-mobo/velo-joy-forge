import { createServerFn } from "@tanstack/react-start";

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

export const createMolliePayment = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      items: Array<{ priceId: string; quantity: number }>;
      customerEmail: string;
      origin: string;
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
      return data;
    },
  )
  .handler(async ({ data }): Promise<MollieCheckoutResult> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const totalCents = data.items.reduce(
        (sum, i) => sum + BUNDLES[i.priceId as BundleKey].amountCents * i.quantity,
        0,
      );
      const description = data.items
        .map((i) => `${BUNDLES[i.priceId as BundleKey].name} × ${i.quantity}`)
        .join(", ");
      const environment = process.env.MOLLIE_API_KEY?.startsWith("live_") ? "live" : "sandbox";

      // Create payment with placeholder redirect; we'll patch with real ID after.
      const payment = await mollieFetch("/payments", {
        method: "POST",
        body: JSON.stringify({
          amount: { currency: "EUR", value: formatAmount(totalCents) },
          description: `Velopass — ${description}`,
          redirectUrl: `${data.origin}/order/thanks?payment_id=pending`,
          webhookUrl: `${data.origin}/api/public/payments/mollie-webhook`,
          billingEmail: data.customerEmail,
          locale: "nl_NL",
          metadata: { items: data.items, email: data.customerEmail },
        }),
      });

      const realRedirect = `${data.origin}/order/thanks?payment_id=${payment.id}`;
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
          amount_subtotal: totalCents,
          amount_tax: 0,
          amount_total: totalCents,
          currency: "eur",
          status: "pending",
          environment,
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
