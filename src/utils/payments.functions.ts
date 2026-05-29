import { createServerFn } from "@tanstack/react-start";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

type CheckoutSessionResult = { clientSecret: string } | { error: string };

const BUNDLES: Record<string, { name: string; amount: number; productId: string }> = {
  frameid_solo_onetime: { name: "Velopass Frame-ID Solo", amount: 1295, productId: "frameid_solo" },
  frameid_duo_onetime: { name: "Velopass Frame-ID Duo", amount: 1995, productId: "frameid_duo" },
  frameid_familie_onetime: { name: "Velopass Frame-ID Familie", amount: 3495, productId: "frameid_familie" },
};

export const createCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((data: {
    priceId: string;
    quantity?: number;
    customerEmail?: string;
    returnUrl: string;
    environment: StripeEnv;
  }) => {
    if (!/^[a-zA-Z0-9_-]+$/.test(data.priceId)) throw new Error("Invalid priceId");
    if (!BUNDLES[data.priceId]) throw new Error("Unknown priceId");
    if (data.environment !== "sandbox" && data.environment !== "live") {
      throw new Error("Invalid environment");
    }
    return data;
  })
  .handler(async ({ data }): Promise<CheckoutSessionResult> => {
    try {
      const stripe = createStripeClient(data.environment);
      const bundle = BUNDLES[data.priceId];
      const quantity = Math.max(1, Math.min(10, data.quantity || 1));

      const session = await stripe.checkout.sessions.create({
        line_items: [{
          quantity,
          price_data: {
            currency: "eur",
            product: bundle.productId,
            unit_amount: bundle.amount,
            tax_behavior: "inclusive",
          },
        }],
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        automatic_tax: { enabled: true },
        shipping_address_collection: {
          allowed_countries: ["BE", "NL", "LU", "FR", "DE", "AT", "ES", "IT", "PT", "IE", "DK", "SE", "FI", "PL"],
        },
        billing_address_collection: "auto",
        ...(data.customerEmail && { customer_email: data.customerEmail }),
        payment_intent_data: { description: `${bundle.name} × ${quantity}` },
        metadata: {
          price_id: data.priceId,
          product_name: bundle.name,
          quantity: String(quantity),
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
      return {
        status: session.status,
        paymentStatus: session.payment_status,
        email: session.customer_details?.email ?? null,
        amountTotal: session.amount_total ?? 0,
        productName: session.metadata?.product_name ?? null,
        quantity: Number(session.metadata?.quantity ?? "1"),
      };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
