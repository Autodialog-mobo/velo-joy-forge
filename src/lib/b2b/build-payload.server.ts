// Server-only mapping from our orders + order_lines to the Velopass B2B
// consumer-orders v1 payload.

export type BundleSpec = { bundle: "solo" | "duo" | "family"; count: 1 | 2 | 5; sku: string };

const BUNDLE_MAP: Record<string, BundleSpec> = {
  frameid_solo_onetime: { bundle: "solo", count: 1, sku: "VP-FRAMEID-SOLO" },
  frameid_duo_onetime: { bundle: "duo", count: 2, sku: "VP-FRAMEID-DUO" },
  frameid_family_onetime: { bundle: "family", count: 5, sku: "VP-FRAMEID-FAMILY" },
};

const LANGS = ["nl", "fr", "de", "en", "es"] as const;

function euros(cents: number | null | undefined): number {
  return Math.round(Number(cents ?? 0)) / 100;
}

export function externalOrderId(orderId: string): string {
  return `WEB-${orderId}`;
}

export type OrderRow = Record<string, any>;
export type LineRow = Record<string, any>;

export function buildConsumerOrderPayload(
  order: OrderRow,
  lines: LineRow[],
  opts: { catalogVersion?: string | null; fulfilment?: { status: "paid" | "shipped"; shipped_at?: string } } = {},
): Record<string, any> {
  const lang = LANGS.includes(String(order.lang ?? "").toLowerCase() as any)
    ? (String(order.lang).toLowerCase() as (typeof LANGS)[number])
    : "nl";

  // Send the real country as stored (ISO-2, uppercase). Never rewrite it to BE.
  const country = String(order.shipping_country ?? "").toUpperCase().trim();

  const items = lines
    .map((l) => {
      const spec = BUNDLE_MAP[String(l.bundle_key)];
      if (!spec) return null;
      const quantity = Number(l.quantity ?? 1);
      const unitPrice = euros(l.unit_price_cents);
      return {
        bundle: spec.bundle,
        frame_id_count: spec.count,
        quantity,
        sku: spec.sku,
        unit_price: unitPrice,
        line_total: Math.round(unitPrice * quantity * 100) / 100,
      };
    })
    .filter(Boolean) as Array<Record<string, any>>;

  const method = order.payment_method
    ? `mollie:${String(order.payment_method).toLowerCase()}`
    : "mollie";

  const payload: Record<string, any> = {
    schema_version: "1.0",
    external_order_id: externalOrderId(String(order.id)),
    channel: "website",
    created_at: new Date(order.created_at ?? Date.now()).toISOString(),
    locale: `${lang}-${country}`,
    currency: "EUR",
    customer: {
      // Full name as one field — never split.
      name: String(order.shipping_name ?? "").trim() || String(order.payment_consumer_name ?? "").trim(),
      email: order.customer_email,
      language: lang,
    },
    shipping_address: {
      line1: String(order.shipping_line1 ?? "").trim(),
      ...(order.shipping_line2 ? { line2: String(order.shipping_line2).trim() } : {}),
      postal_code: String(order.shipping_postal_code ?? "").trim(),
      city: String(order.shipping_city ?? "").trim(),
      country,
    },
    items,
    shipping_cost: euros(order.amount_shipping),
    amount_total: euros(order.amount_total),
    payment: {
      status: "paid",
      method,
      ...(order.updated_at ? { paid_at: new Date(order.updated_at).toISOString() } : {}),
      ...(order.mollie_payment_id
        ? { reference: order.mollie_payment_id, mollie_payment_id: order.mollie_payment_id }
        : {}),
    },
    metadata: {
      website_order_url: `https://www.velopass.com/admin?order=${order.id}`,
      ...(order.referral_source ? { referral_source: order.referral_source } : {}),
    },
  };

  if (opts.catalogVersion) payload.catalog_version = opts.catalogVersion;
  if (opts.fulfilment) payload.fulfilment = opts.fulfilment;

  return payload;
}
