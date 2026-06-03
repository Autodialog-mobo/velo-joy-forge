import { createServerFn } from "@tanstack/react-start";

type BundleKey = "frameid_solo_onetime" | "frameid_duo_onetime" | "frameid_family_onetime";

const BUNDLES: Record<BundleKey, { name: string; amountCents: number }> = {
  frameid_solo_onetime: { name: "Velopass Frame-ID Solo", amountCents: 1295 },
  frameid_duo_onetime: { name: "Velopass Frame-ID Duo", amountCents: 2195 },
  frameid_family_onetime: { name: "Velopass Frame-ID Familie", amountCents: 4995 },
};

const formatAmount = (cents: number) => (cents / 100).toFixed(2);

async function getMollie() {
  const apiKey = process.env.MOLLIE_API_KEY;
  if (!apiKey) throw new Error("MOLLIE_API_KEY is not configured");
  // Dynamic import keeps the Node-only SDK out of any client-reachable bundle.
  const mod: any = await import("@mollie/api-client");
  const createClient = mod.createMollieClient ?? mod.default?.createMollieClient ?? mod.default;
  if (typeof createClient !== "function") {
    throw new Error("Mollie SDK kon niet worden geladen");
  }
  return createClient({ apiKey });
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
      const mollie = await getMollie();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const totalCents = data.items.reduce(
        (sum, i) => sum + BUNDLES[i.priceId as BundleKey].amountCents * i.quantity,
        0,
      );
      const description = data.items
        .map((i) => `${BUNDLES[i.priceId as BundleKey].name} × ${i.quantity}`)
        .join(", ");
      const environment = process.env.MOLLIE_API_KEY?.startsWith("live_") ? "live" : "sandbox";

      const payment = await mollie.payments.create({
        amount: { currency: "EUR", value: formatAmount(totalCents) },
        description: `Velopass — ${description}`,
        redirectUrl: `${data.origin}/order/thanks?payment_id={id}`.replace(
          "{id}",
          "REPLACE_ME",
        ),
        webhookUrl: `${data.origin}/api/public/payments/mollie-webhook`,
        billingEmail: data.customerEmail,
        locale: "nl_NL",
        metadata: { items: data.items, email: data.customerEmail },
      } as any);

      // Mollie does not substitute {id} like Stripe; rebuild the redirectUrl
      // with the real payment id and update the payment.
      const realRedirect = `${data.origin}/order/thanks?payment_id=${payment.id}`;
      await mollie.payments.update(payment.id, { redirectUrl: realRedirect } as any);

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

      const checkoutUrl = (payment as any)._links?.checkout?.href ?? (payment as any).getCheckoutUrl?.();
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
      const mollie = await getMollie();
      const payment = await mollie.payments.get(data.paymentId);
      const metadata: any = (payment as any).metadata ?? {};
      const items: Array<{ priceId: string; quantity: number }> = Array.isArray(metadata.items)
        ? metadata.items
        : [];
      const amountCents = Math.round(parseFloat((payment as any).amount.value) * 100);
      return {
        status: (payment as any).status as string,
        email: metadata.email ?? null,
        amountTotal: amountCents,
        items,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kon bestelling niet ophalen";
      return { error: message };
    }
  });
