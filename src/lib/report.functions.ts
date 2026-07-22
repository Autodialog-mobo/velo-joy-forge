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
  "id, created_at, status, shipping_country, referral_source, amount_total, amount_subtotal, amount_shipping, amount_tax, currency, experiment_variant";

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
  experiment_variant: string | null;
};

export type ExperimentImpression = {
  marker: string; // "<experiment>:<variant>"
  impressions: number;
  visitors: number;
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
    // experiment_variant is new; if the column is missing (before the migration
    // lands) fall back to the base columns so the report never breaks.
    const BASE_COLUMNS = ORDER_COLUMNS.replace(", experiment_variant", "");
    let columns = ORDER_COLUMNS;
    const orders: ReportOrder[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data: page, error } = await (supabaseAdmin as any)
        .from("orders")
        .select(columns)
        .eq("environment", env)
        .is("deleted_at", null)
        .in("status", PAID_STATUSES as unknown as string[])
        .order("created_at", { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) {
        if (columns === ORDER_COLUMNS && /experiment_variant/.test(error.message)) {
          // Retry the whole fetch without the new column.
          columns = BASE_COLUMNS;
          orders.length = 0;
          from = -PAGE; // loop's += PAGE resets to 0
          continue;
        }
        throw new Error(error.message);
      }
      const rows = ((page ?? []) as any[]).map((o) => ({
        experiment_variant: null,
        ...o,
      })) as ReportOrder[];
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

    // Experiment impressions (denominator for conversion). Best-effort: if the
    // table does not exist yet, return none rather than failing the report.
    const impressions: ExperimentImpression[] = [];
    try {
      const visitorsByMarker = new Map<string, Set<string>>();
      const countByMarker = new Map<string, number>();
      for (let from = 0; ; from += PAGE) {
        const { data: page, error } = await (supabaseAdmin as any)
          .from("experiment_impressions")
          .select("experiment, variant, visitor_id")
          .eq("environment", env)
          .range(from, from + PAGE - 1);
        if (error) throw error;
        const rows = (page ?? []) as {
          experiment: string;
          variant: string;
          visitor_id: string;
        }[];
        for (const r of rows) {
          const marker = `${r.experiment}:${r.variant}`;
          countByMarker.set(marker, (countByMarker.get(marker) ?? 0) + 1);
          let set = visitorsByMarker.get(marker);
          if (!set) {
            set = new Set<string>();
            visitorsByMarker.set(marker, set);
          }
          set.add(r.visitor_id);
        }
        if (rows.length < PAGE) break;
      }
      for (const [marker, count] of countByMarker) {
        impressions.push({
          marker,
          impressions: count,
          visitors: visitorsByMarker.get(marker)?.size ?? 0,
        });
      }
    } catch (e) {
      console.error("orderReport: impressions unavailable:", e instanceof Error ? e.message : e);
    }

    return { orders, lines, impressions, environment: env };
  });
