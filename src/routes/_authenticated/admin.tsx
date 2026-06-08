import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { listOrders, markPrinted, markShipped } from "@/lib/admin.functions";
import { generateLabelsPdf, downloadBlob, ordersToCsv, type LabelData } from "@/lib/labels";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

const STATUS_FILTERS = ["all", "paid", "printed", "shipped"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function AdminPage() {
  const navigate = useNavigate();
  const fetchOrders = useServerFn(listOrders);
  const doPrint = useServerFn(markPrinted);
  const doShip = useServerFn(markShipped);

  const [filter, setFilter] = useState<StatusFilter>("paid");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => fetchOrders(),
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold" style={{ fontFamily: "Syne, sans-serif" }}>
            Velopass · Fulfillment
          </h1>
          <button
            onClick={signOut}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Uitloggen
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => {
                setFilter(f);
                setSelected(new Set());
              }}
              className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                filter === f
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card hover:bg-accent/10"
              }`}
            >
              {f === "all" ? "Alle" : f}
            </button>
          ))}
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              onClick={generateLabels}
              disabled={!selectedOrders.length}
              className="px-3 py-1.5 rounded-lg text-sm bg-accent text-accent-foreground disabled:opacity-50"
            >
              Labels PDF ({selectedOrders.length})
            </button>
            <button
              onClick={exportCsv}
              disabled={!selectedOrders.length}
              className="px-3 py-1.5 rounded-lg text-sm border bg-card disabled:opacity-50"
            >
              CSV export
            </button>
            <button
              onClick={handleMarkPrinted}
              disabled={busy || !selectedOrders.length}
              className="px-3 py-1.5 rounded-lg text-sm border bg-card disabled:opacity-50"
            >
              Markeer geprint
            </button>
            <button
              onClick={handleMarkShipped}
              disabled={busy || !selectedOrders.length}
              className="px-3 py-1.5 rounded-lg text-sm bg-primary text-primary-foreground disabled:opacity-50"
            >
              Markeer verzonden
            </button>
          </div>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Laden...</p>}
        {error && (
          <p className="text-sm text-destructive">
            {(error as Error).message || "Fout bij laden"}
          </p>
        )}

        {!isLoading && !error && (
          <div className="border rounded-xl overflow-hidden bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-left">
                <tr>
                  <th className="px-3 py-2 w-8">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selected.size === filtered.length}
                      onChange={toggleAll}
                    />
                  </th>
                  <th className="px-3 py-2">Datum</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Klant</th>
                  <th className="px-3 py-2">Adres</th>
                  <th className="px-3 py-2">Items</th>
                  <th className="px-3 py-2 text-right">€</th>
                  <th className="px-3 py-2">Order</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o: any) => {
                  const ls = linesByOrder.get(o.id) ?? [];
                  return (
                    <tr key={o.id} className="border-t hover:bg-muted/20">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selected.has(o.id)}
                          onChange={() => toggle(o.id)}
                        />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {new Date(o.created_at).toLocaleString("nl-BE", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            o.status === "paid"
                              ? "bg-accent/20 text-accent-foreground"
                              : o.status === "printed"
                                ? "bg-yellow-100 text-yellow-900"
                                : o.status === "shipped"
                                  ? "bg-green-100 text-green-900"
                                  : "bg-muted"
                          }`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div>{o.shipping_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{o.customer_email}</div>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {o.shipping_line1 || "—"}
                        <br />
                        {o.shipping_postal_code} {o.shipping_city} {o.shipping_country}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {ls.length
                          ? ls.map((l) => `${l.bundle_sku}×${l.quantity}`).join(", ")
                          : o.product_name}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {(o.amount_total / 100).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {o.id.slice(0, 8).toUpperCase()}
                      </td>
                    </tr>
                  );
                })}
                {!filtered.length && (
                  <tr>
                    <td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">
                      Geen bestellingen voor filter “{filter}”.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
