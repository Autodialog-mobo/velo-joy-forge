import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowUp, ArrowDown, Inbox, Package, CreditCard, MapPin, Calendar, User, Hash } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { listOrders, markPrinted, markShipped } from "@/lib/admin.functions";
import { generateLabelsPdf, downloadBlob, ordersToCsv, type LabelData } from "@/lib/labels";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

const STATUS_FILTERS = ["all", "paid", "printed", "shipped"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const LEGACY_SKU_MAP: Record<string, string> = {
  frameid_solo_onetime: "VP-FID-1",
  frameid_duo_onetime: "VP-FID-2",
  frameid_family_onetime: "VP-FID-5",
};

function mapLegacyItem(text: string) {
  if (!text) return "—";
  let out = text;
  for (const [k, v] of Object.entries(LEGACY_SKU_MAP)) {
    out = out.replaceAll(k, v);
  }
  return out.replace(/\s*×\s*/g, "×");
}

function formatEur(cents: number) {
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`;
}

function statusBadgeStyle(status: string): React.CSSProperties {
  switch (status) {
    case "paid":
      return { background: "rgba(46,204,138,0.15)", color: "#1A8A5C" };
    case "printed":
      return { background: "rgba(59,130,246,0.12)", color: "#1E40AF" };
    case "shipped":
      return { background: "rgba(13,31,60,0.7)", color: "#FFFFFF" };
    case "pending":
    default:
      return { background: "rgba(13,31,60,0.08)", color: "rgba(13,31,60,0.7)" };
  }
}

function AdminPage() {
  const navigate = useNavigate();
  const fetchOrders = useServerFn(listOrders);
  const doPrint = useServerFn(markPrinted);
  const doShip = useServerFn(markShipped);

  const [filter, setFilter] = useState<StatusFilter>("paid");
  const [environment, setEnvironment] = useState<"live" | "sandbox">("live");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [sort, setSort] = useState<{ column: "date" | "amount"; dir: "asc" | "desc" }>({
    column: "date",
    dir: "desc",
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-orders", environment],
    queryFn: () => fetchOrders({ data: { environment } }),
  });

  const orders = data?.orders ?? [];
  const lines = data?.lines ?? [];
  const linesByOrder = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const l of lines) {
      const arr = m.get(l.order_id) ?? [];
      arr.push(l);
      m.set(l.order_id, arr);
    }
    return m;
  }, [lines]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length, paid: 0, printed: 0, shipped: 0 };
    for (const o of orders) {
      if (c[o.status] !== undefined) c[o.status]++;
    }
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    const arr = orders.filter((o: any) => filter === "all" || o.status === filter);
    arr.sort((a: any, b: any) => {
      if (sort.column === "date") {
        const da = new Date(a.created_at).getTime();
        const db = new Date(b.created_at).getTime();
        return sort.dir === "asc" ? da - db : db - da;
      }
      if (sort.column === "amount") {
        return sort.dir === "asc" ? a.amount_total - b.amount_total : b.amount_total - a.amount_total;
      }
      return 0;
    });
    return arr;
  }, [orders, filter, sort]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((o: any) => o.id)));
  };

  const handleSort = (column: "date" | "amount") => {
    setSort((prev) => {
      if (prev.column === column) return { column, dir: prev.dir === "asc" ? "desc" : "asc" };
      return { column, dir: "desc" };
    });
  };

  const selectedOrders = filtered.filter((o: any) => selected.has(o.id));

  const generateLabels = () => {
    const labelData: LabelData[] = selectedOrders.map((o: any) => ({
      shipping_name: o.shipping_name,
      shipping_line1: o.shipping_line1,
      shipping_line2: o.shipping_line2,
      shipping_postal_code: o.shipping_postal_code,
      shipping_city: o.shipping_city,
      shipping_country: o.shipping_country,
      id: o.id,
      lines: (linesByOrder.get(o.id) ?? []).map((l) => ({
        bundle_sku: l.bundle_sku,
        quantity: l.quantity,
      })),
    }));
    if (!labelData.length) return;
    const blob = generateLabelsPdf(labelData);
    downloadBlob(blob, `velopass-labels-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const exportCsv = () => {
    const rows = selectedOrders.map((o: any) => {
      const ls = linesByOrder.get(o.id) ?? [];
      return {
        order_id: o.id,
        created_at: o.created_at,
        status: o.status,
        customer_email: o.customer_email,
        shipping_name: o.shipping_name,
        shipping_line1: o.shipping_line1,
        shipping_postal_code: o.shipping_postal_code,
        shipping_city: o.shipping_city,
        shipping_country: o.shipping_country,
        items: ls.map((l) => `${l.bundle_sku}x${l.quantity}`).join(" "),
        sticker_total: ls.reduce((s, l) => s + l.sticker_count, 0),
        amount_total_eur: (o.amount_total / 100).toFixed(2),
      };
    });
    const csv = ordersToCsv(rows);
    downloadBlob(new Blob([csv], { type: "text/csv" }), `velopass-orders-${Date.now()}.csv`);
  };

  const handleMarkPrinted = async () => {
    if (!selectedOrders.length) return;
    setBusy(true);
    try {
      await doPrint({ data: { orderIds: selectedOrders.map((o: any) => o.id) } });
      setSelected(new Set());
      await refetch();
    } finally {
      setBusy(false);
    }
  };

  const handleMarkShipped = async () => {
    if (!selectedOrders.length) return;
    setBusy(true);
    try {
      await doShip({ data: { orderIds: selectedOrders.map((o: any) => o.id) } });
      setSelected(new Set());
      await refetch();
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const hasSelection = selectedOrders.length > 0;

  const SortIcon = ({ column }: { column: "date" | "amount" }) => {
    if (sort.column !== column) return null;
    return sort.dir === "asc" ? (
      <ArrowUp className="w-3 h-3 text-[#2ECC8A]" />
    ) : (
      <ArrowDown className="w-3 h-3 text-[#2ECC8A]" />
    );
  };

  return (
    <div className="min-h-screen bg-[#F5F3EE] text-[#0D1F3C]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="max-w-[1280px] mx-auto px-5 py-5 md:px-10 md:py-10">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1
              className="text-[24px] md:text-[28px] font-bold leading-tight text-[#0D1F3C]"
              style={{ fontFamily: "Syne, sans-serif", fontWeight: 700 }}
            >
              Velopass · Fulfillment
            </h1>
            <p className="text-[14px] text-[rgba(13,31,60,0.6)] mt-1">
              Beheer betaalde bestellingen en print verzendlabels
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="inline-flex rounded-lg border border-[rgba(13,31,60,0.12)] overflow-hidden text-[13px]">
              {(["live", "sandbox"] as const).map((env) => (
                <button
                  key={env}
                  onClick={() => {
                    setEnvironment(env);
                    setSelected(new Set());
                  }}
                  className={`px-3 py-1.5 transition ${
                    environment === env
                      ? env === "live"
                        ? "bg-[#2ECC8A] text-[#0D1F3C] font-semibold"
                        : "bg-yellow-400 text-yellow-950 font-semibold"
                      : "bg-white hover:bg-[rgba(13,31,60,0.04)]"
                  }`}
                >
                  {env === "live" ? "Live" : "Sandbox"}
                </button>
              ))}
            </div>
            <button
              onClick={signOut}
              className="text-[13px] text-[rgba(13,31,60,0.6)] hover:text-[#0D1F3C] transition"
            >
              Uitloggen
            </button>
          </div>
        </header>

        {isLoading && <p className="text-sm text-[rgba(13,31,60,0.6)]">Laden...</p>}
        {error && (
          <p className="text-sm text-red-600">{(error as Error).message || "Fout bij laden"}</p>
        )}

        {!isLoading && !error && (
          <div
            className="bg-white rounded-2xl border border-[rgba(13,31,60,0.04)] overflow-hidden"
            style={{
              boxShadow:
                "0 1px 3px rgba(13,31,60,0.04), 0 4px 16px rgba(13,31,60,0.06)",
            }}
          >
            {/* Toolbar as card header */}
            <div
              className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-6 py-5 border-b border-[rgba(13,31,60,0.06)]"
              style={{ background: "rgba(245,243,238,0.5)" }}
            >
              {/* Filters */}
              <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1">
                {STATUS_FILTERS.map((f) => {
                  const active = filter === f;
                  const label = f === "all" ? "Alle" : f;
                  return (
                    <button
                      key={f}
                      onClick={() => {
                        setFilter(f);
                        setSelected(new Set());
                      }}
                      className={`shrink-0 px-3.5 py-1.5 rounded-full text-[13px] transition ${
                        active
                          ? "bg-[#0D1F3C] text-white font-semibold"
                          : "bg-transparent text-[rgba(13,31,60,0.6)] hover:bg-[rgba(13,31,60,0.05)]"
                      }`}
                    >
                      {label} ({counts[f] ?? 0})
                    </button>
                  );
                })}
              </div>

              {/* Bulk actions */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={generateLabels}
                  disabled={!hasSelection}
                  className="h-9 px-3.5 rounded-lg text-[13px] font-medium bg-[#0D1F3C] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#183A6E] transition"
                >
                  Labels PDF ({selectedOrders.length})
                </button>
                <button
                  onClick={exportCsv}
                  disabled={!hasSelection}
                  className="h-9 px-3.5 rounded-lg text-[13px] font-medium border border-[rgba(13,31,60,0.15)] bg-white text-[#0D1F3C] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[rgba(13,31,60,0.03)] transition"
                >
                  CSV export
                </button>
                <button
                  onClick={handleMarkPrinted}
                  disabled={busy || !hasSelection}
                  className="h-9 px-3.5 rounded-lg text-[13px] font-medium border border-[rgba(13,31,60,0.15)] bg-white text-[#0D1F3C] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[rgba(13,31,60,0.03)] transition"
                >
                  Markeer geprint
                </button>
                <button
                  onClick={handleMarkShipped}
                  disabled={busy || !hasSelection}
                  className="h-9 px-3.5 rounded-lg text-[13px] font-medium bg-[#2ECC8A] text-[#0D1F3C] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#1AAD70] transition"
                >
                  Markeer verzonden
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-[14px]">
                <thead style={{ background: "rgba(13,31,60,0.02)" }}>
                  <tr className="border-b border-[rgba(13,31,60,0.08)]">
                    <th className="px-6 py-3 w-8">
                      <input
                        type="checkbox"
                        checked={filtered.length > 0 && selected.size === filtered.length}
                        onChange={toggleAll}
                      />
                    </th>
                    <th
                      className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[rgba(13,31,60,0.5)] cursor-pointer select-none"
                      onClick={() => handleSort("date")}
                    >
                      <span className="inline-flex items-center gap-1">
                        Datum <SortIcon column="date" />
                      </span>
                    </th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[rgba(13,31,60,0.5)]">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[rgba(13,31,60,0.5)]">
                      Klant
                    </th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[rgba(13,31,60,0.5)] hidden md:table-cell">
                      Adres
                    </th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[rgba(13,31,60,0.5)] hidden md:table-cell">
                      Items
                    </th>
                    <th
                      className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-[rgba(13,31,60,0.5)] cursor-pointer select-none"
                      onClick={() => handleSort("amount")}
                    >
                      <span className="inline-flex items-center gap-1 justify-end">
                        € Order <SortIcon column="amount" />
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o: any, idx: number) => {
                    const ls = linesByOrder.get(o.id) ?? [];
                    const isLast = idx === filtered.length - 1;
                    const items = ls.length
                      ? ls.map((l) => `${l.bundle_sku}×${l.quantity}`).join(", ")
                      : mapLegacyItem(o.product_name || "—");
                    return (
                      <tr
                        key={o.id}
                        className={`${isLast ? "" : "border-b border-[rgba(13,31,60,0.05)]"} hover:bg-[rgba(46,204,138,0.04)] transition cursor-pointer`}
                      >
                        <td className="px-6 py-4 align-middle" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selected.has(o.id)}
                            onChange={() => toggle(o.id)}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-[13px] text-[rgba(13,31,60,0.75)] align-middle">
                          {new Date(o.created_at).toLocaleString("nl-BE", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="px-6 py-4 align-middle">
                          <span
                            className="inline-flex items-center h-[22px] px-2.5 rounded-full text-[11px] font-semibold lowercase"
                            style={statusBadgeStyle(o.status)}
                          >
                            {o.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 align-middle">
                          <div className="text-[14px] font-medium text-[#0D1F3C] leading-[1.4]">
                            {o.shipping_name || <span className="text-[rgba(13,31,60,0.4)]">—</span>}
                          </div>
                          <div className="text-[12px] text-[rgba(13,31,60,0.55)] leading-[1.4]">
                            {o.customer_email}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[13px] hidden md:table-cell align-middle">
                          <div className="text-[#0D1F3C]">{o.shipping_line1 || "—"}</div>
                          <div className="text-[rgba(13,31,60,0.55)]">
                            {o.shipping_postal_code} {o.shipping_city}{" "}
                            <span className="text-[rgba(13,31,60,0.4)]">{o.shipping_country}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[13px] text-[rgba(13,31,60,0.75)] hidden md:table-cell align-middle">
                          {items}
                        </td>
                        <td className="px-6 py-4 text-right align-middle">
                          <div
                            className="text-[15px] font-semibold text-[#0D1F3C]"
                            style={{ fontVariantNumeric: "tabular-nums" }}
                          >
                            {formatEur(o.amount_total)}
                          </div>
                          <div
                            className="text-[11px] text-[rgba(13,31,60,0.5)] font-mono mt-0.5"
                            style={{ fontVariantNumeric: "tabular-nums" }}
                          >
                            #{o.id.slice(0, 8)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!filtered.length && (
                    <tr>
                      <td colSpan={7}>
                        <div className="flex flex-col items-center justify-center text-center" style={{ padding: "80px 24px" }}>
                          <Inbox className="w-10 h-10 text-[rgba(13,31,60,0.35)] mb-4" strokeWidth={1.5} />
                          <p className="text-[15px] font-semibold text-[#0D1F3C]">
                            Geen bestellingen in deze status
                          </p>
                          <p className="text-[13px] text-[rgba(13,31,60,0.55)] mt-1 max-w-sm">
                            Orders verschijnen hier zodra ze betaald zijn en gemarkeerd worden.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
