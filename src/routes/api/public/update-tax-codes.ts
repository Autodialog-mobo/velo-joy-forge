import { createFileRoute } from '@tanstack/react-router';
import { createStripeClient, getStripeErrorMessage } from '@/lib/stripe.server';

export const Route = createFileRoute('/api/public/update-tax-codes')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const stripe = createStripeClient('sandbox');
          const ids = ['velopass_frameid_1', 'velopass_frameid_2', 'velopass_frameid_5'];
          const results: Record<string, string> = {};
          for (const id of ids) {
            const updated = await stripe.products.update(id, {
              tax_code: 'txcd_20030000',
            });
            results[id] = updated.tax_code as string;
          }
          return new Response(JSON.stringify({ ok: true, results }, null, 2), {
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (error) {
          return new Response(
            JSON.stringify({ ok: false, error: getStripeErrorMessage(error) }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          );
        }
      },
    },
  },
});
