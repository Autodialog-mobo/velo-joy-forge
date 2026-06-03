import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function getMollie() {
  const apiKey = process.env.MOLLIE_API_KEY;
  if (!apiKey) throw new Error("MOLLIE_API_KEY is not configured");
  const mod: any = await import("@mollie/api-client");
  const createClient = mod.createMollieClient ?? mod.default?.createMollieClient ?? mod.default;
  if (typeof createClient !== "function") throw new Error("Mollie SDK kon niet worden geladen");
  return createClient({ apiKey });
}

export const Route = createFileRoute("/api/public/payments/mollie-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const form = await request.formData();
          const id = form.get("id");
          if (typeof id !== "string" || !/^tr_[a-zA-Z0-9]+$/.test(id)) {
            return new Response("Invalid id", { status: 400 });
          }

          const mollie = await getMollie();
          const payment = await mollie.payments.get(id);
          const p: any = payment;
          const status: string = p.status;
          const amountCents = Math.round(parseFloat(p.amount.value) * 100);
          const environment = process.env.MOLLIE_API_KEY?.startsWith("live_")
            ? "live"
            : "sandbox";

          await (supabaseAdmin.from("orders") as any).upsert(
            {
              mollie_payment_id: p.id,
              customer_email:
                p.metadata?.email ?? p.billingEmail ?? p.customerEmail ?? "",
              price_id: p.metadata?.items?.[0]?.priceId ?? "unknown",
              product_name: Array.isArray(p.metadata?.items)
                ? p.metadata.items
                    .map(
                      (i: any) =>
                        `${i.priceId} × ${i.quantity}`,
                    )
                    .join(", ")
                : "Velopass Frame-ID",
              quantity: Array.isArray(p.metadata?.items)
                ? p.metadata.items.reduce(
                    (s: number, i: any) => s + (i.quantity ?? 1),
                    0,
                  )
                : 1,
              amount_subtotal: amountCents,
              amount_tax: 0,
              amount_total: amountCents,
              currency: (p.amount.currency ?? "EUR").toLowerCase(),
              status,
              environment,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "mollie_payment_id" },
          );

          return new Response("ok", { status: 200 });
        } catch (e) {
          console.error("Mollie webhook error:", e);
          return new Response("Webhook error", { status: 500 });
        }
      },
    },
  },
});
