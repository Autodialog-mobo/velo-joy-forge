import { createServerFn } from "@tanstack/react-start";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

type CheckoutSessionResult = { clientSecret: string } | { error: string };

const BUNDLES: Record<string, { name: string; amount: number }> = {
  frameid_solo_onetime: { name: "Velopass Frame-ID Solo", amount: 1295 },
  frameid_duo_onetime: { name: "Velopass Frame-ID Duo", amount: 2195 },
  frameid_family_onetime: { name: "Velopass Frame-ID Familie", amount: 4995 },
};

export const createCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      items: Array<{ priceId: string; quantity: number }>;
      customerEmail?: string;
      returnUrl: string;
      environment: StripeEnv;
    }) => {
      if (!Array.isArray(data.items) || data.items.length === 0) {
        throw new Error("At least one item is required");
      }
      for (const item of data.items) {
        if (!/^[a-zA-Z0-9_-]+$/.test(item.priceId)) throw new Error("Invalid priceId");
        if (!BUNDLES[item.priceId]) throw new Error(`Unknown priceId: ${item.priceId}`);
        if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50) {
          throw new Error("Invalid quantity");
        }
      }
      if (data.environment !== "sandbox" && data.environment !== "live") {
        throw new Error("Invalid environment");
      }
      return data;
    },
  )
  .handler(async ({ data }): Promise<CheckoutSessionResult> => {
    try {
      const stripe = createStripeClient(data.environment);

      // Resolve each lookup_key to a Stripe price ID.
      const lookupKeys = data.items.map((i) => i.priceId);
      const prices = await stripe.prices.list({ lookup_keys: lookupKeys, limit: 100 });
      const priceByLookup = new Map(prices.data.map((p) => [p.lookup_key ?? "", p]));

      const line_items = data.items.map((item) => {
        const price = priceByLookup.get(item.priceId);
        if (!price) throw new Error(`Price not found for lookup_key '${item.priceId}'`);
        return { price: price.id, quantity: item.quantity };
      });

      const description = data.items
        .map((i) => `${BUNDLES[i.priceId].name} × ${i.quantity}`)
        .join(", ");

      const session = await stripe.checkout.sessions.create({
        line_items,
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        payment_method_types: ["card"],
        automatic_tax: { enabled: true },
        adaptive_pricing: { enabled: true },
        shipping_address_collection: {
          allowed_countries: [
            "BE", "NL", "LU", "FR", "DE", "AT", "ES", "IT", "PT", "IE",
            "DK", "SE", "FI", "PL",
          ],
        },
        shipping_options: [
          {
            shipping_rate_data: {
              type: "fixed_amount",
              fixed_amount: { amount: 0, currency: "eur" },
              display_name: "Gratis verzending",
              delivery_estimate: {
                minimum: { unit: "business_day", value: 3 },
                maximum: { unit: "business_day", value: 5 },
              },
            },
          },
        ],
        billing_address_collection: "auto",
        ...(data.customerEmail && { customer_email: data.customerEmail }),
        payment_intent_data: { description },
        metadata: {
          items: JSON.stringify(data.items),
        },
      });

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const getOrderBySession = createServerFn({ method: "POST" })
  .inputValidator((data: { sessionId: string; environment: StripeEnv }) => {
    if (!/^cs_[a-zA-Z0-9_]+$/.test(data.sessionId)) throw new Error("Invalid sessionId");
    return data;
  })
  .handler(async ({ data }) => {
    try {
      const stripe = createStripeClient(data.environment);
      const session = await stripe.checkout.sessions.retrieve(data.sessionId);
      let items: Array<{ priceId: string; quantity: number }> = [];
      try {
        items = JSON.parse(session.metadata?.items ?? "[]");
      } catch {
        items = [];
      }
      return {
        status: session.status,
        paymentStatus: session.payment_status,
        email: session.customer_details?.email ?? null,
        amountTotal: session.amount_total ?? 0,
        items,
      };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
