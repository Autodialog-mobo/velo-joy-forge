import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createCheckoutSession } from "@/utils/payments.functions";

interface Props {
  priceId: string;
  quantity?: number;
  customerEmail?: string;
  returnUrl: string;
}

export function StripeEmbeddedCheckoutForm({ priceId, quantity, customerEmail, returnUrl }: Props) {
  const fetchClientSecret = async (): Promise<string> => {
    const result = await createCheckoutSession({
      data: { priceId, quantity, customerEmail, returnUrl, environment: getStripeEnvironment() },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("Stripe gaf geen client secret terug");
    return result.clientSecret;
  };

  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
