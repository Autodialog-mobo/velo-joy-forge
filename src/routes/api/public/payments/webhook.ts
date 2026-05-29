import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { type StripeEnv, verifyWebhook, createStripeClient } from "@/lib/stripe.server";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _supabase;
}

async function handleCheckoutCompleted(sessionLite: any, env: StripeEnv) {
  // Retrieve with expansions to get shipping + line items
  const stripe = createStripeClient(env);
  const session = await stripe.checkout.sessions.retrieve(sessionLite.id, {
    expand: ["shipping_details", "customer_details", "line_items"],
  }) as any;

  const ship = session.shipping_details ?? session.collected_information?.shipping_details ?? null;
  const addr = ship?.address ?? null;
  const email = session.customer_details?.email ?? session.customer_email ?? "";

  const priceId = session.metadata?.price_id ?? "";
  const productName = session.metadata?.product_name ?? "Velopass Frame-ID";
  const quantity = Number(session.metadata?.quantity ?? "1");

  await getSupabase().from("orders").upsert(
    {
      stripe_session_id: session.id,
      stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
      customer_email: email,
      price_id: priceId,
      product_name: productName,
      quantity,
      amount_subtotal: session.amount_subtotal ?? 0,
      amount_tax: session.total_details?.amount_tax ?? 0,
      amount_total: session.amount_total ?? 0,
      currency: session.currency ?? "eur",
      status: session.payment_status === "paid" ? "paid" : (session.payment_status ?? "pending"),
      shipping_name: ship?.name ?? null,
      shipping_line1: addr?.line1 ?? null,
      shipping_line2: addr?.line2 ?? null,
      shipping_postal_code: addr?.postal_code ?? null,
      shipping_city: addr?.city ?? null,
      shipping_state: addr?.state ?? null,
      shipping_country: addr?.country ?? null,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_session_id" },
  );
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await handleCheckoutCompleted(event.data.object, env);
      break;
    default:
      console.log("Unhandled event:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("Invalid env param:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        try {
          await handleWebhook(request, rawEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
