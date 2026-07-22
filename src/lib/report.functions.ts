import { createServerFn } from "@tanstack/react-start";
import { requireAuth0Admin } from "@/integrations/auth0/middleware";

// Server function powering the /admin-report analytics page.
// Returns every *paid* order (paid / printed / shipped, not soft-deleted) for
// the requested environment, together with their order_lines, so the client can
// aggregate order evolution, bundle mix, referral sources and per-country splits.
//
// Paid statuses only: pending / failed checkouts and soft-deleted rows are
// excluded server-side so the report reflects realised sales, never attempts.

const PAID_STATUSES = ["paid", "printed", "shipped"] as const;

// Trimmed column set: only what the report needs, never PII beyond country.
const ORDER_COLUMNS =
  "id, created_at, status, shipping_country, referral_source, amount_total, amount_subtotal, amount_shipping, amount_tax, currency";

const LINE_COLUMNS = "order_id, bundle_key, bundle_sku, quantity, sticker_count, unit_price_cents";

export type ReportOrder = {
  id: string;
  created_at: string;
  status: string;
  shipping_country: string | null;
  referral_source: string | null;
  amount_total: number;
  amount_subtotal: number;
  amount_shipping: number;
  amount_tax: number;
  currency: string;
};

export type ReportLine = {
  order_id: string;
  bundle_key: string;
  bundle_sku: string;
  quantity: number;
  sticker_count: number;
  unit_price_cents: number;
};

const PAGE = 1000;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export const orderReport = createServerFn({ method: "POST" })
  .middleware([requireAuth0Admin])
  .inputValidator((d: { environment?: "live" | "sandbox" } = {}) => d ?? {})
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const env = data?.environment ?? "live";

    // Page through all paid orders (Supabase caps a single request at 1000 rows).
    const orders: ReportOrder[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data: page, error } = await (supabaseAdmin as any)
        .from("orders")
        .select(ORDER_COLUMNS)
        .eq("environment", env)
        .is("deleted_at", null)
        .in("status", PAID_STATUSES as unknown as string[])
        .order("created_at", { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) throw new Error(error.message);
      const rows = (page ?? []) as ReportOrder[];
      orders.push(...rows);
      if (rows.length < PAGE) break;
    }

    // Fetch order_lines for those orders, chunking the id list to keep URLs sane.
    const ids = orders.map((o) => o.id);
    const lines: ReportLine[] = [];
    for (const ids4 of chunk(ids, 300)) {
      if (!ids4.length) continue;
      const { data: l, error: le } = await (supabaseAdmin as any)
        .from("order_lines")
        .select(LINE_COLUMNS)
        .in("order_id", ids4);
      if (le) throw new Error(le.message);
      lines.push(...((l ?? []) as ReportLine[]));
    }

    return { orders, lines, environment: env };
  });
