import { createServerFn } from "@tanstack/react-start";
import { requireAuth0Admin } from "@/integrations/auth0/middleware";
import { mollieFetch } from "@/utils/mollie.functions";
import { computeB2CTotals } from "@/lib/shipping";

// One-off recovery: rebuild the orders + order_lines tables from Mollie, the
// source of truth for real payments. Reconstructs each *paid* live-mode payment
// with its ORIGINAL date, and does NOT send any emails or fire order events.
// Idempotent: upserts on mollie_payment_id, so it is safe to run more than once.

const BUNDLE_META: Record<string, { sku: string; stickersPerBundle: number; unitPriceCents: number }> = {
  frameid_solo_onetime: { sku: "VP-FID-1", stickersPerBundle: 1, unitPriceCents: 1295 },
  frameid_duo_onetime: { sku: "VP-FID-2", stickersPerBundle: 2, unitPriceCents: 2195 },
  frameid_family_onetime: { sku: "VP-FID-5", stickersPerBundle: 5, unitPriceCents: 4995 },
};

export const recoverOrdersFromMollie = createServerFn({ method: "POST" })
  .middleware([requireAuth0Admin])
  .inputValidator((d: { includeTest?: boolean } = {}) => d ?? {})
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const includeTest = !!data?.includeTest;

    let recovered = 0;
    let skippedTest = 0;
    let skippedUnpaid = 0;
    let linesInserted = 0;
    let scanned = 0;

    // Page through all Mollie payments (250 per page, follow _links.next).
    let path: string | null = "/payments?limit=250";
    let guard = 0;
    while (path && guard < 200) {
      guard++;
      const page: any = await mollieFetch(path);
      const payments: any[] = page?._embedded?.payments ?? [];
      for (const p of payments) {
        scanned++;
        if (p.status !== "paid") {
          skippedUnpaid++;
          continue;
        }
        const isLive = p.mode === "live";
        if (!isLive && !includeTest) {
          skippedTest++;
          continue;
        }
        // Skip recovery-payment webhooks (they point back to an original order).
        if (typeof p.metadata?.recovery_for_order_id === "string") continue;

        const items: Array<{ priceId: string; quantity: number }> = Array.isArray(p.metadata?.items)
          ? p.metadata.items
          : [];
        const amountCents = Math.round(parseFloat(p.amount?.value ?? "0") * 100);
        const shipping = p.shippingAddress ?? p.metadata?.shipping ?? null;
        const shippingName = shipping
          ? `${shipping.givenName ?? ""} ${shipping.familyName ?? ""}`.trim()
          : "";
        const metaLang =
          typeof p.metadata?.lang === "string" && /^(nl|en|fr|de|es)$/.test(p.metadata.lang)
            ? p.metadata.lang
            : null;
        const customerEmail = p.metadata?.email ?? p.billingEmail ?? p.customerEmail ?? "";
        const totals = items.length ? computeB2CTotals(items) : null;
        // Keep the historical timeline: created_at = when ordered, updated_at =
        // when paid (never "now", so recovered orders don't look freshly touched).
        const createdAt = p.createdAt ?? p.paidAt ?? new Date().toISOString();
        const updatedAt = p.paidAt ?? createdAt;

        const { data: upserted, error: upsertError } = await (supabaseAdmin.from("orders") as any)
          .upsert(
            {
              mollie_payment_id: p.id,
              customer_email: customerEmail,
              price_id: items[0]?.priceId ?? "unknown",
              product_name: items.length
                ? items.map((i) => `${i.priceId} × ${i.quantity}`).join(", ")
                : "Velopass Frame-ID",
              quantity: items.length ? items.reduce((s, i) => s + (i.quantity ?? 1), 0) : 1,
              amount_subtotal: totals ? totals.productSubtotalCents : amountCents,
              amount_shipping: totals ? totals.shippingCents : 0,
              amount_tax: totals ? totals.vatCents : 0,
              amount_total: amountCents,
              currency: (p.amount?.currency ?? "EUR").toLowerCase(),
              status: "paid",
              environment: isLive ? "live" : "sandbox",
              shipping_name: shippingName,
              shipping_line1: shipping?.streetAndNumber ?? "",
              shipping_postal_code: shipping?.postalCode ?? "",
              shipping_city: shipping?.city ?? "",
              shipping_country: shipping?.country ?? "",
              lang: metaLang,
              payment_method: typeof p.method === "string" ? p.method : null,
              // Preserve the original timeline so the report stays accurate.
              created_at: createdAt,
              updated_at: updatedAt,
            },
            { onConflict: "mollie_payment_id" },
          )
          .select("id")
          .single();

        if (upsertError) {
          console.error("recover: order upsert failed", p.id, upsertError.message);
          continue;
        }
        recovered++;
        const orderId = upserted?.id;
        if (orderId && items.length) {
          await (supabaseAdmin.from("order_lines") as any).delete().eq("order_id", orderId);
          const rows = items
            .filter((i) => i.priceId in BUNDLE_META)
            .map((i) => {
              const meta = BUNDLE_META[i.priceId];
              return {
                order_id: orderId,
                bundle_key: i.priceId,
                bundle_sku: meta.sku,
                quantity: i.quantity,
                sticker_count: i.quantity * meta.stickersPerBundle,
                unit_price_cents: meta.unitPriceCents,
              };
            });
          if (rows.length) {
            const { error: linesError } = await (supabaseAdmin.from("order_lines") as any).insert(rows);
            if (!linesError) linesInserted += rows.length;
          }
        }
      }
      path = page?._links?.next?.href
        ? page._links.next.href.replace("https://api.mollie.com/v2", "")
        : null;
    }

    return { recovered, linesInserted, skippedTest, skippedUnpaid, scanned };
  });
