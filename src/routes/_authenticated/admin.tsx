import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Inbox } from "lucide-react";
import { listOrders, markPrinted, markShipped } from "@/lib/admin.functions";
import { generateLabelsPdf, downloadBlob, ordersToCsv, type LabelData } from "@/lib/labels";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

const STATUS_FILTERS = ["all", "paid", "printed", "shipped"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function statusBadgeClasses(status: string) {
  switch (status) {
    case "paid":
      return "bg-[#E8FAF3] text-[#0D1F3C]";
    case "printed":
      return "bg-[#183A6E] text-white";
    case "shipped":
      return "bg-[#5A7090] text-white";
    default:
      return "bg-[rgba(13,31,60,0.08)] text-[#0D1F3C]";
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

  const filtered = orders.filter((o: any) => filter === "all" || o.status === filter);

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

  return (
    <div className="min-h-screen bg-[#F5F3EE] text-[#0D1F3C]">
      <div className="max-w-[1280px] mx-auto px-5 py-4 md:px-10 md:py-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 mb-6 md:mb-8 border-b border-[rgba(13,31,60,0.08)]">
          <h1
            className="text-2xl md:text-[28px] font-bold leading-tight"
            style={{ fontFamily: "Syne, sans-serif" }}
          >
            Velopass · Fulfillment
          </h1>
          <div className="flex items-center gap-4">
            <div className="inline-flex rounded-lg border border-[rgba(13,31,60,0.12)] overflow-hidden text-sm">
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
                        ? "bg-[#2ECC8A] text-[#0D1F3C] font-medium"
                        : "bg-yellow-400 text-yellow-950 font-medium"
                      : "bg-white hover:bg-[rgba(13,31,60,0.04)]"
                  }`}
                >
                  {env === "live" ? "Live" : "Sandbox"}
                </button>
              ))}
            </div>
            <button
              onClick={signOut}
              className="text-sm text-[#5A7090] hover:text-[#0D1F3C] transition"
            >
              Uitloggen
            </button>
          </div>
        </header>

        {/* Toolbar */}
        <div className="flex flex-col gap-4 mb-6">
          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
            {STATUS_FILTERS.map((f) => {
              const active = filter === f;
              return (
                <button
                  key={f}
                  onClick={() => {
                    setFilter(f);
                    setSelected(new Set());
                  }}
                  className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition ${
                    active
                      ? "bg-[#2ECC8A] text-[#0D1F3C]"
                      : "bg-white text-[#5A7090] border border-[rgba(13,31,60,0.1)] hover:bg-[rgba(13,31,60,0.03)]"
                  }`}
                >
                  {f === "all" ? "Alle" : f}
                </button>
              );
            })}
          </div>

          {/* Bulk actions */}
          <div className="flex flex-wrap gap-2 md:justify-end">
            <button
              onClick={generateLabels}
              disabled={!hasSelection}
              className="px-3 py-1.5 rounded-lg text-sm bg-[#0D1F3C] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#183A6E] transition"
            >
              Labels PDF ({selectedOrders.length})
            </button>
            <button
              onClick={exportCsv}
              disabled={!hasSelection}
              className="px-3 py-1.5 rounded-lg text-sm border border-[rgba(13,31,60,0.15)] bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[rgba(13,31,60,0.03)] transition"
            >
              CSV export
            </button>
            <button
              onClick={handleMarkPrinted}
              disabled={busy || !hasSelection}
              className="px-3 py-1.5 rounded-lg text-sm border border-[rgba(13,31,60,0.15)] bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[rgba(13,31,60,0.03)] transition"
            >
              Markeer geprint
            </button>
            <button
              onClick={handleMarkShipped}
              disabled={busy || !hasSelection}
              className="px-3 py-1.5 rounded-lg text-sm bg-[#2ECC8A] text-[#0D1F3C] font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#1AAD70] transition"
            >
              Markeer verzonden
            </button>
          </div>
        </div>

        {isLoading && <p className="text-sm text-[#5A7090]">Laden...</p>}
        {error && (
          <p className="text-sm text-red-600">
            {(error as Error).message || "Fout bij laden"}
          </p>
        )}

        {!isLoading && !error && (
          <div className="border border-[rgba(13,31,60,0.1)] rounded-xl overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[rgba(13,31,60,0.04)] text-left">
                  <tr className="border-b border-[rgba(13,31,60,0.1)]">
                    <th className="px-4 py-3 w-8 font-semibold">
                      <input
                        type="checkbox"
                        checked={filtered.length > 0 && selected.size === filtered.length}
                        onChange={toggleAll}
                      />
                    </th>
                    <th className="px-4 py-3 font-semibold">Datum</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Klant</th>
                    <th className="px-4 py-3 font-semibold hidden md:table-cell">Adres</th>
                    <th className="px-4 py-3 font-semibold hidden md:table-cell">Items</th>
                    <th className="px-4 py-3 font-semibold text-right">€</th>
                    <th className="px-4 py-3 font-semibold hidden md:table-cell">Order</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o: any) => {
                    const ls = linesByOrder.get(o.id) ?? [];
                    return (
                      <tr
                        key={o.id}
                        className="border-b border-[rgba(13,31,60,0.06)] hover:bg-[rgba(13,31,60,0.03)] transition"
                      >
                        <td className="px-4 py-3.5">
                          <input
                            type="checkbox"
                            checked={selected.has(o.id)}
                            onChange={() => toggle(o.id)}
                          />
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-[#2A3F5F]">
                          {new Date(o.created_at).toLocaleString("nl-BE", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide ${statusBadgeClasses(o.status)}`}
                          >
                            {o.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-medium">{o.shipping_name || "—"}</div>
                          <div className="text-xs text-[#5A7090]">{o.customer_email}</div>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-[#2A3F5F] hidden md:table-cell">
                          {o.shipping_line1 || "—"}
                          <br />
                          <span className="text-[#5A7090]">
                            {o.shipping_postal_code} {o.shipping_city} {o.shipping_country}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs hidden md:table-cell">
                          {ls.length
                            ? ls.map((l) => `${l.bundle_sku}×${l.quantity}`).join(", ")
                            : o.product_name}
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums font-medium">
                          {(o.amount_total / 100).toFixed(2)}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-[#5A7090] hidden md:table-cell">
                          {o.id.slice(0, 8).toUpperCase()}
                        </td>
                      </tr>
                    );
                  })}
                  {!filtered.length && (
                    <tr>
                      <td colSpan={8} className="px-4">
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <Inbox className="w-8 h-8 text-[#5A7090] mb-3" strokeWidth={1.5} />
                          <p className="text-[#0D1F3C] font-medium">
                            Geen bestellingen in deze status
                          </p>
                          <p className="text-[13px] text-[#5A7090] mt-1 max-w-xs">
                            Orders verschijnen hier automatisch zodra ze betaald zijn.
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
