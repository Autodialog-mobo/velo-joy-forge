import { createFileRoute } from "@tanstack/react-router";
import { createStripeClient } from "@/lib/stripe.server";

export const Route = createFileRoute("/api/public/archive-old-products")({
  server: {
    handlers: {
      GET: async () => {
        const stripe = createStripeClient("sandbox");
        const ids = ["velopass_frameid_1", "velopass_frameid_2", "velopass_frameid_5"];
        const results: Record<string, string> = {};
        for (const id of ids) {
          try {
            const updated = await stripe.products.update(id, { active: false });
            results[id] = updated.active ? "still_active" : "archived";
          } catch (e: unknown) {
            results[id] = e instanceof Error ? `error: ${e.message}` : "error";
          }
        }
        return new Response(JSON.stringify(results, null, 2), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
