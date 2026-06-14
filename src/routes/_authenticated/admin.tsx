import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowUp, ArrowDown, Inbox, Package, CreditCard, MapPin, Calendar, User, Hash, ArrowRight, Copy, Check, Languages } from "lucide-react";
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

// Dark-theme pill badges with leading status dot
function statusDotColor(status: string) {
  switch (status) {
    case "paid": return "#2ECC8A";
    case "printed": return "#E0A33E";
    case "shipped": return "rgba(255,255,255,0.60)";
    case "pending": return "rgba(255,255,255,0.50)";
    case "expired":
    case "failed":
    case "cancelled":
    case "canceled":
      return "#E05252";
    case "refunded": return "rgba(255,255,255,0.50)";
    default: return "rgba(255,255,255,0.40)";
  }
}
function statusLabelNl(status: string) {
  switch (status) {
    case "paid": return "Betaald";
    case "printed": return "Geprint";
    case "shipped": return "Verzonden";
    case "pending": return "Wachtend";
    case "expired": return "Verlopen";
    case "cancelled":
    case "canceled":
      return "Geannuleerd";
    case "failed": return "Mislukt";
    case "refunded": return "Terugbetaald";
    default: return status;
  }
}
function statusPillStyle(status: string): React.CSSProperties {
  switch (status) {
    case "paid":
      return { background: "rgba(46,204,138,0.12)", color: "#2ECC8A", border: "1px solid rgba(46,204,138,0.30)" };
    case "printed":
      return { background: "rgba(224,163,62,0.12)", color: "#E0A33E", border: "1px solid rgba(224,163,62,0.30)" };
    case "shipped":
      return { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.60)", border: "1px solid rgba(255,255,255,0.12)" };
    case "pending":
      return { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.60)", border: "1px solid rgba(255,255,255,0.10)" };
    case "expired":
    case "failed":
    case "cancelled":
    case "canceled":
      return { background: "rgba(224,82,82,0.12)", color: "#E05252", border: "1px solid rgba(224,82,82,0.30)" };
    case "refunded":
      return { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.10)" };
    default:
      return { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.10)" };
  }
}

const NAVY = "#0D1F3C";
const GREEN = "#2ECC8A";
const SURFACE = "rgba(255,255,255,0.04)";
const SURFACE_BORDER = "rgba(255,255,255,0.08)";
const TEXT_PRI = "rgba(255,255,255,0.92)";
const TEXT_SEC = "rgba(255,255,255,0.60)";
const TEXT_MUTED = "rgba(255,255,255,0.40)";

const EYEBROW: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color: TEXT_MUTED,
};

function AdminPage() {
  const navigate = useNavigate();
  const fetchOrders = useServerFn(listOrders);
  const doPrint = useServerFn(markPrinted);
  const doShip = useServerFn(markShipped);

  const [filter, setFilter] = useState<StatusFilter>("paid");
  const [statusFilter, setStatusFilter] = useState<string>("any");
  const [environment, setEnvironment] = useState<"live" | "sandbox">("live");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [sort, setSort] = useState<{ column: "date" | "amount"; dir: "asc" | "desc" }>({
    column: "date",
    dir: "desc",
  });
  const [detailOrder, setDetailOrder] = useState<any>(null);
  const [labelCopied, setLabelCopied] = useState(false);
  const [detailBusy, setDetailBusy] = useState(false);
  const [batchStatus, setBatchStatus] = useState<string | null>(null);
  const [batchQueue, setBatchQueue] = useState<string[]>([]);
  const [batchIndex, setBatchIndex] = useState(0);
  const [batchDone, setBatchDone] = useState(false);

  const openDetail = (o: any, queueSource?: any[]) => {
    setDetailOrder(o);
    setBatchStatus(o.status);
    const source = queueSource ?? [];
    const queue = source.filter((x: any) => x.status === o.status).map((x: any) => x.id);
    setBatchQueue(queue);
    setBatchIndex(Math.max(0, queue.indexOf(o.id)));
    setBatchDone(false);
  };

  const closeDetail = () => {
    setDetailOrder(null);
    setBatchStatus(null);
    setBatchQueue([]);
    setBatchIndex(0);
    setBatchDone(false);
  };

  const advanceBatch = async () => {
    const res = await refetch();
    if (!batchStatus) return;
    const latest = res.data?.orders ?? [];
    const byId = new Map<string, any>(latest.map((o: any) => [o.id, o]));
    for (let i = batchIndex + 1; i < batchQueue.length; i++) {
      const candidate = byId.get(batchQueue[i]);
      if (candidate && candidate.status === batchStatus) {
        setDetailOrder(candidate);
        setBatchIndex(i);
        return;
      }
    }
    setBatchDone(true);
  };

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

  const availableStatuses = useMemo(() => {
    const s = new Set<string>();
    for (const o of orders) if (o.status) s.add(o.status);
    return Array.from(s).sort();
  }, [orders]);

  const filtered = useMemo(() => {
    const arr = orders.filter((o: any) => {
      const pipelineMatch = filter === "all" || o.status === filter;
      const secondaryMatch = statusFilter === "any" || o.status === statusFilter;
      return pipelineMatch && secondaryMatch;
    });
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
  }, [orders, filter, statusFilter, sort]);

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
      <ArrowUp className="w-3 h-3" style={{ color: GREEN }} />
    ) : (
      <ArrowDown className="w-3 h-3" style={{ color: GREEN }} />
    );
  };

  // Pipeline stage definition
  const PIPELINE: { key: StatusFilter; label: string; caption: string; dot: string }[] = [
    { key: "all", label: "Alle", caption: "totaal in pipeline", dot: "rgba(255,255,255,0.35)" },
    { key: "paid", label: "Betaald", caption: "klaar om te printen", dot: "#2ECC8A" },
    { key: "printed", label: "Geprint", caption: "klaar om te verzenden", dot: "#F5B547" },
    { key: "shipped", label: "Verzonden", caption: "afgerond", dot: "rgba(255,255,255,0.40)" },
  ];

  return (
    <div
      className="min-h-screen vp-pro-page"
      style={{
        backgroundColor: NAVY,
        color: TEXT_PRI,
        fontFamily: "'DM Sans', sans-serif",
        minHeight: "100dvh",
      }}
    >
      <style>{`
        .vp-pro-admin input[type="checkbox"] {
          appearance: none;
          -webkit-appearance: none;
          width: 16px; height: 16px;
          border: 1.5px solid rgba(255,255,255,0.30);
          border-radius: 4px;
          background: rgba(255,255,255,0.04);
          cursor: pointer;
          position: relative;
          transition: all 0.15s;
        }
        .vp-pro-admin input[type="checkbox"]:hover { border-color: ${GREEN}; }
        .vp-pro-admin input[type="checkbox"]:checked {
          background: ${GREEN};
          border-color: ${GREEN};
        }
        .vp-pro-admin input[type="checkbox"]:checked::after {
          content: '';
          position: absolute;
          left: 4px; top: 1px;
          width: 4px; height: 8px;
          border: solid ${NAVY};
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }
        .vp-pro-admin input[type="checkbox"]:focus-visible {
          outline: 2px solid ${GREEN};
          outline-offset: 2px;
        }
        .vp-pro-admin button:focus-visible,
        .vp-pro-admin .stage-card:focus-visible {
          outline: 2px solid ${GREEN};
          outline-offset: 2px;
        }
        .vp-pro-admin .stage-card { transition: all 0.18s ease; }
        .vp-pro-page { background-color: #0D1F3C !important; min-height: 100dvh; }
        .vp-pro-admin .stage-card:hover { background: rgba(255,255,255,0.06); }
        .vp-pro-admin .stage-card.active {
          background: rgba(46,204,138,0.08);
          border-color: rgba(46,204,138,0.45);
        }
        .vp-pro-admin .row-link:hover { background: rgba(255,255,255,0.03); }
        .vp-pro-admin .btn-ghost {
          background: transparent;
          color: ${TEXT_PRI};
          border: 1px solid ${SURFACE_BORDER};
          transition: all 0.15s;
        }
        .vp-pro-admin .btn-ghost:hover:not(:disabled) {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.18);
        }
        .vp-pro-admin .btn-primary {
          background: ${GREEN};
          color: ${NAVY};
          border: 1px solid ${GREEN};
          transition: all 0.15s;
          font-weight: 600;
        }
        .vp-pro-admin .btn-primary:hover:not(:disabled) {
          background: #25b277;
          border-color: #25b277;
        }
        .vp-pro-admin .btn-primary:disabled,
        .vp-pro-admin .btn-ghost:disabled { opacity: 0.35; cursor: not-allowed; }
      `}</style>

      <div className="vp-pro-admin max-w-[1280px] mx-auto px-5 py-6 md:px-10 md:py-10">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div style={EYEBROW}>Velopass · Back-office</div>
            <h1
              className="mt-2"
              style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 700,
                fontSize: "clamp(28px, 3.2vw, 36px)",
                lineHeight: 1.05,
                letterSpacing: "-0.6px",
                color: TEXT_PRI,
              }}
            >
              Fulfillment
            </h1>
            <p className="mt-1.5 text-[13px]" style={{ color: TEXT_SEC }}>
              Beheer betaalde bestellingen en print verzendlabels
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Live/Sandbox segmented pill */}
            <div
              className="inline-flex p-1 rounded-full"
              style={{
                background: SURFACE,
                border: `1px solid ${SURFACE_BORDER}`,
              }}
              role="tablist"
              aria-label="Environment"
            >
              {(["live", "sandbox"] as const).map((env) => {
                const active = environment === env;
                return (
                  <button
                    key={env}
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setEnvironment(env);
                      setSelected(new Set());
                    }}
                    className="px-4 py-1.5 rounded-full text-[12px] font-semibold transition"
                    style={{
                      background: active ? GREEN : "transparent",
                      color: active ? NAVY : TEXT_SEC,
                      letterSpacing: "0.02em",
                    }}
                  >
                    {env === "live" ? "Live" : "Sandbox"}
                  </button>
                );
              })}
            </div>
            <button
              onClick={signOut}
              className="text-[12px] transition"
              style={{ color: TEXT_SEC, letterSpacing: "0.02em" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = TEXT_PRI)}
              onMouseLeave={(e) => (e.currentTarget.style.color = TEXT_SEC)}
            >
              Uitloggen
            </button>
          </div>
        </header>

        {/* Pipeline */}
        <section className="mb-6" aria-label="Fulfillment pipeline">
          <div style={{ ...EYEBROW, marginBottom: 12 }}>Pipeline</div>
          <div className="flex flex-wrap items-stretch gap-3 md:gap-2">
            {PIPELINE.map((stage, idx) => {
              const active = filter === stage.key;
              const count = counts[stage.key] ?? 0;
              return (
                <div key={stage.key} className="flex items-center gap-2 md:gap-3 flex-1 min-w-[220px]">
                  <button
                    type="button"
                    onClick={() => {
                      setFilter(stage.key);
                      setSelected(new Set());
                    }}
                    aria-pressed={active}
                    className={`stage-card text-left w-full p-5 rounded-[18px] ${active ? "active" : ""}`}
                    style={{
                      background: active ? "rgba(46,204,138,0.08)" : SURFACE,
                      border: `1px solid ${active ? "rgba(46,204,138,0.45)" : SURFACE_BORDER}`,
                      cursor: "pointer",
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span style={{ ...EYEBROW, color: active ? GREEN : TEXT_MUTED }}>
                        {stage.label}
                      </span>
                      <span
                        aria-hidden
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: stage.dot,
                          boxShadow: stage.key === "paid" ? "0 0 0 4px rgba(46,204,138,0.12)" : undefined,
                        }}
                      />
                    </div>
                    <div
                      style={{
                        fontFamily: "'Syne', sans-serif",
                        fontWeight: 700,
                        fontSize: 44,
                        lineHeight: 1,
                        letterSpacing: "-1.5px",
                        color: active ? GREEN : TEXT_PRI,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {count}
                    </div>
                    <div
                      className="mt-2 text-[12px]"
                      style={{ color: TEXT_SEC, lineHeight: 1.4 }}
                    >
                      {stage.caption}
                    </div>
                  </button>
                  {idx < PIPELINE.length - 1 && (
                    <ArrowRight
                      className="shrink-0 hidden md:block"
                      style={{ color: "rgba(255,255,255,0.20)" }}
                      strokeWidth={1.5}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {isLoading && (
          <p className="text-sm" style={{ color: TEXT_SEC }}>Laden…</p>
        )}
        {error && (
          <div
            className="rounded-[18px] p-4 text-sm"
            style={{
              background: "rgba(244,82,82,0.08)",
              border: "1px solid rgba(244,82,82,0.30)",
              color: "#FF8A8A",
            }}
          >
            {(error as Error).message || "Fout bij laden"}
          </div>
        )}

        {!isLoading && !error && (
          <div
            className="rounded-[18px] overflow-hidden"
            style={{
              background: SURFACE,
              border: `1px solid ${SURFACE_BORDER}`,
            }}
          >
            {/* Toolbar */}
            <div
              className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-6 py-4"
              style={{ borderBottom: `1px solid ${SURFACE_BORDER}` }}
            >
              <div className="flex items-center gap-3 flex-wrap">
                <span style={EYEBROW}>Bestellingen</span>
                <span className="text-[12px]" style={{ color: TEXT_MUTED }}>
                  {selectedOrders.length > 0
                    ? `${selectedOrders.length} geselecteerd`
                    : `${filtered.length} weergegeven`}
                </span>
                <label className="inline-flex items-center gap-2 ml-1">
                  <span className="text-[11px]" style={{ color: TEXT_MUTED, letterSpacing: "0.02em" }}>
                    Status:
                  </span>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setSelected(new Set());
                    }}
                    className="h-7 px-2 rounded-[8px] text-[12px]"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      color: TEXT_PRI,
                      border: `1px solid ${SURFACE_BORDER}`,
                      outline: "none",
                    }}
                    aria-label="Filter op status"
                  >
                    <option value="any" style={{ background: NAVY }}>Alle statussen</option>
                    {availableStatuses.map((s) => (
                      <option key={s} value={s} style={{ background: NAVY }}>
                        {statusLabelNl(s)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={generateLabels}
                  disabled={!hasSelection}
                  className="btn-primary h-9 px-4 rounded-[12px] text-[13px]"
                >
                  Labels PDF ({selectedOrders.length})
                </button>
                <button
                  onClick={exportCsv}
                  disabled={!hasSelection}
                  className="btn-ghost h-9 px-4 rounded-[12px] text-[13px] font-medium"
                >
                  CSV export
                </button>
                <button
                  onClick={handleMarkPrinted}
                  disabled={busy || !hasSelection}
                  className="btn-ghost h-9 px-4 rounded-[12px] text-[13px] font-medium"
                >
                  Markeer geprint
                </button>
                <button
                  onClick={handleMarkShipped}
                  disabled={busy || !hasSelection}
                  className="btn-ghost h-9 px-4 rounded-[12px] text-[13px] font-medium"
                >
                  Markeer verzonden
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-[14px]">
                <thead style={{ background: "rgba(255,255,255,0.02)" }}>
                  <tr style={{ borderBottom: `1px solid ${SURFACE_BORDER}` }}>
                    <th className="px-6 py-3 w-8">
                      <input
                        type="checkbox"
                        checked={filtered.length > 0 && selected.size === filtered.length}
                        onChange={toggleAll}
                        aria-label="Selecteer alle bestellingen"
                      />
                    </th>
                    <th
                      className="px-6 py-3 text-left cursor-pointer select-none"
                      style={EYEBROW}
                      onClick={() => handleSort("date")}
                    >
                      <span className="inline-flex items-center gap-1">
                        Datum <SortIcon column="date" />
                      </span>
                    </th>
                    <th className="px-6 py-3 text-left" style={EYEBROW}>Status</th>
                    <th className="px-6 py-3 text-left" style={EYEBROW}>Klant</th>
                    <th className="px-6 py-3 text-left hidden md:table-cell" style={EYEBROW}>Adres</th>
                    <th className="px-6 py-3 text-left hidden md:table-cell" style={EYEBROW}>Items</th>
                    <th
                      className="px-6 py-3 text-right cursor-pointer select-none"
                      style={EYEBROW}
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
                        onClick={() => openDetail(o, filtered)}
                        className="row-link cursor-pointer"
                        style={{
                          borderBottom: isLast ? "none" : `1px solid ${SURFACE_BORDER}`,
                        }}
                      >
                        <td className="px-6 py-4 align-middle" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selected.has(o.id)}
                            onChange={() => toggle(o.id)}
                            aria-label={`Selecteer order ${o.id.slice(0, 8)}`}
                          />
                        </td>
                        <td
                          className="px-6 py-4 whitespace-nowrap text-[13px] align-middle"
                          style={{ color: TEXT_SEC, fontVariantNumeric: "tabular-nums" }}
                        >
                          {new Date(o.created_at).toLocaleString("nl-BE", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="px-6 py-4 align-middle">
                          <span
                            className="inline-flex items-center gap-1.5 h-[24px] px-2.5 rounded-full text-[11px] font-semibold"
                            style={statusPillStyle(o.status)}
                          >
                            <span
                              aria-hidden
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: statusDotColor(o.status),
                              }}
                            />
                            {statusLabelNl(o.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 align-middle">
                          <div className="text-[14px] font-medium leading-[1.4]" style={{ color: TEXT_PRI }}>
                            {o.shipping_name || <span style={{ color: TEXT_MUTED }}>—</span>}
                          </div>
                          <div className="text-[12px] leading-[1.4]" style={{ color: TEXT_SEC }}>
                            {o.customer_email}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[13px] hidden md:table-cell align-middle">
                          <div style={{ color: TEXT_PRI }}>{o.shipping_line1 || "—"}</div>
                          <div style={{ color: TEXT_SEC }}>
                            {o.shipping_postal_code} {o.shipping_city}{" "}
                            <span style={{ color: TEXT_MUTED }}>{o.shipping_country}</span>
                          </div>
                        </td>
                        <td
                          className="px-6 py-4 text-[13px] hidden md:table-cell align-middle"
                          style={{ color: TEXT_SEC }}
                        >
                          {items}
                        </td>
                        <td className="px-6 py-4 text-right align-middle">
                          <div
                            className="text-[15px] font-semibold"
                            style={{ color: TEXT_PRI, fontVariantNumeric: "tabular-nums" }}
                          >
                            {formatEur(o.amount_total)}
                          </div>
                          <div
                            className="text-[11px] font-mono mt-0.5"
                            style={{ color: TEXT_MUTED, fontVariantNumeric: "tabular-nums" }}
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
                          <Inbox className="w-10 h-10 mb-4" strokeWidth={1.5} style={{ color: TEXT_MUTED }} />
                          <p className="text-[15px] font-semibold" style={{ color: TEXT_PRI }}>
                            Geen bestellingen in deze status
                          </p>
                          <p className="text-[13px] mt-1 max-w-sm" style={{ color: TEXT_SEC }}>
                            Orders verschijnen hier zodra ze betaald zijn en gemarkeerd worden.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Order Detail Modal */}
            <Dialog open={!!detailOrder} onOpenChange={(open) => !open && setDetailOrder(null)}>
              {detailOrder && (
                <DialogContent
                  className="max-w-lg p-0 overflow-hidden rounded-[18px]"
                  style={{
                    background: "#13294D",
                    border: `1px solid ${SURFACE_BORDER}`,
                    color: TEXT_PRI,
                  }}
                >
                  <div
                    className="px-6 py-5"
                    style={{
                      borderBottom: `1px solid ${SURFACE_BORDER}`,
                      background: "rgba(255,255,255,0.02)",
                    }}
                  >
                    <DialogHeader>
                      <DialogTitle
                        className="text-[18px]"
                        style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: TEXT_PRI }}
                      >
                        <span className="flex items-center gap-2">
                          <Hash className="w-4 h-4" style={{ color: GREEN }} />
                          Order {detailOrder.id.slice(0, 8)}
                        </span>
                      </DialogTitle>
                    </DialogHeader>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className="inline-flex items-center gap-1.5 h-[24px] px-2.5 rounded-full text-[11px] font-semibold"
                        style={statusPillStyle(detailOrder.status)}
                      >
                        <span
                          aria-hidden
                          style={{
                            width: 6, height: 6, borderRadius: "50%",
                            background: statusDotColor(detailOrder.status),
                          }}
                        />
                        {statusLabelNl(detailOrder.status)}
                      </span>
                      <span className="text-[11px]" style={{ color: TEXT_MUTED }}>
                        {detailOrder.environment === "live" ? "Live" : "Sandbox"}
                      </span>
                    </div>
                  </div>

                  <div className="px-6 py-5 space-y-5">
                    <div>
                      <h4 className="mb-2 flex items-center gap-1.5" style={EYEBROW}>
                        <User className="w-3.5 h-3.5" /> Klant
                      </h4>
                      <p className="text-[14px] font-medium" style={{ color: TEXT_PRI }}>
                        {detailOrder.shipping_name || "—"}
                      </p>
                      <p className="text-[13px]" style={{ color: TEXT_SEC }}>{detailOrder.customer_email}</p>
                      <p className="text-[12px] mt-1 flex items-center gap-1.5" style={{ color: TEXT_MUTED }}>
                        <Languages className="w-3 h-3" />
                        Taal: <span style={{ color: TEXT_SEC, fontWeight: 600 }}>
                          {detailOrder.lang ? String(detailOrder.lang).toUpperCase() : "—"}
                        </span>
                      </p>
                    </div>

                    <div>
                      <h4 className="mb-2 flex items-center gap-1.5" style={EYEBROW}>
                        <MapPin className="w-3.5 h-3.5" /> Verzendadres
                      </h4>
                      <p className="text-[14px]" style={{ color: TEXT_PRI }}>{detailOrder.shipping_line1 || "—"}</p>
                      {detailOrder.shipping_line2 && (
                        <p className="text-[14px]" style={{ color: TEXT_PRI }}>{detailOrder.shipping_line2}</p>
                      )}
                      <p className="text-[13px]" style={{ color: TEXT_SEC }}>
                        {detailOrder.shipping_postal_code} {detailOrder.shipping_city}
                        {detailOrder.shipping_state && `, ${detailOrder.shipping_state}`}
                      </p>
                      <p className="text-[13px]" style={{ color: TEXT_SEC }}>{detailOrder.shipping_country}</p>

                      {(() => {
                        const labelLines = [
                          detailOrder.shipping_name,
                          detailOrder.shipping_line1,
                          detailOrder.shipping_line2,
                          [detailOrder.shipping_postal_code, detailOrder.shipping_city].filter(Boolean).join(" "),
                          detailOrder.shipping_country ? String(detailOrder.shipping_country).toUpperCase() : null,
                        ].filter((l) => l && String(l).trim().length > 0) as string[];
                        const labelText = labelLines.join("\n");
                        return (
                          <div
                            className="mt-3 rounded-[10px] p-3"
                            style={{
                              background: "rgba(255,255,255,0.03)",
                              border: `1px solid ${SURFACE_BORDER}`,
                            }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <pre
                                className="text-[13px] leading-[1.45] m-0 whitespace-pre-wrap"
                                style={{
                                  color: TEXT_PRI,
                                  fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
                                }}
                              >{labelText}</pre>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(labelText);
                                    setLabelCopied(true);
                                    setTimeout(() => setLabelCopied(false), 1600);
                                  } catch {}
                                }}
                                className="inline-flex items-center gap-1.5 h-[28px] px-2.5 rounded-[8px] text-[11px] font-medium shrink-0 transition-colors focus:outline-none focus-visible:ring-2"
                                style={{
                                  background: "transparent",
                                  border: `1px solid ${SURFACE_BORDER}`,
                                  color: labelCopied ? GREEN : TEXT_SEC,
                                }}
                                aria-label="Kopieer adreslabel"
                              >
                                {labelCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                {labelCopied ? "Gekopieerd" : "Kopieer adreslabel"}
                              </button>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Contextual status transition */}
                      {(() => {
                        if (detailOrder.status === "paid") {
                          return (
                            <button
                              type="button"
                              disabled={detailBusy}
                              onClick={async () => {
                                setDetailBusy(true);
                                try {
                                  await doPrint({ data: { orderIds: [detailOrder.id] } });
                                  setDetailOrder((prev: any) => (prev ? { ...prev, status: "printed" } : prev));
                                  await refetch();
                                } finally {
                                  setDetailBusy(false);
                                }
                              }}
                              className="btn-primary h-10 px-4 rounded-[12px] text-[13px] font-semibold w-full mt-3"
                            >
                              Markeer als geprint
                            </button>
                          );
                        }
                        if (detailOrder.status === "printed") {
                          return (
                            <button
                              type="button"
                              disabled={detailBusy}
                              onClick={async () => {
                                setDetailBusy(true);
                                try {
                                  await doShip({ data: { orderIds: [detailOrder.id] } });
                                  setDetailOrder((prev: any) => (prev ? { ...prev, status: "shipped" } : prev));
                                  await refetch();
                                } finally {
                                  setDetailBusy(false);
                                }
                              }}
                              className="btn-primary h-10 px-4 rounded-[12px] text-[13px] font-semibold w-full mt-3"
                            >
                              Markeer als verzonden
                            </button>
                          );
                        }
                        if (detailOrder.status === "shipped") {
                          return (
                            <div className="flex items-center gap-2 mt-3 text-[12px]" style={{ color: TEXT_MUTED }}>
                              <Check className="w-3.5 h-3.5" style={{ color: GREEN }} />
                              Afgerond — verzonden
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    <div>
                      <h4 className="mb-2 flex items-center gap-1.5" style={EYEBROW}>
                        <Package className="w-3.5 h-3.5" /> Items
                      </h4>
                      {(linesByOrder.get(detailOrder.id) ?? []).length > 0 ? (
                        <ul className="space-y-1">
                          {(linesByOrder.get(detailOrder.id) ?? []).map((l: any) => (
                            <li key={l.id} className="text-[14px] flex justify-between" style={{ color: TEXT_PRI }}>
                              <span>{mapLegacyItem(l.bundle_sku)} × {l.quantity}</span>
                              <span className="text-[13px]" style={{ color: TEXT_SEC }}>{l.sticker_count} stickers</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[14px]" style={{ color: TEXT_PRI }}>
                          {mapLegacyItem(detailOrder.product_name || "—")}
                        </p>
                      )}
                    </div>

                    <div>
                      <h4 className="mb-2 flex items-center gap-1.5" style={EYEBROW}>
                        <CreditCard className="w-3.5 h-3.5" /> Betaling
                      </h4>
                      <div className="flex justify-between text-[14px]">
                        <span style={{ color: TEXT_SEC }}>Subtotaal</span>
                        <span style={{ color: TEXT_PRI, fontVariantNumeric: "tabular-nums" }}>
                          {formatEur(detailOrder.amount_subtotal)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[14px]">
                        <span style={{ color: TEXT_SEC }}>BTW</span>
                        <span style={{ color: TEXT_PRI, fontVariantNumeric: "tabular-nums" }}>
                          {formatEur(detailOrder.amount_tax)}
                        </span>
                      </div>
                      <div
                        className="flex justify-between text-[15px] font-semibold mt-1 pt-2"
                        style={{ borderTop: `1px solid ${SURFACE_BORDER}` }}
                      >
                        <span style={{ color: TEXT_PRI }}>Totaal</span>
                        <span style={{ color: GREEN, fontVariantNumeric: "tabular-nums" }}>
                          {formatEur(detailOrder.amount_total)}
                        </span>
                      </div>
                      {detailOrder.mollie_payment_id && (
                        <p className="text-[11px] mt-2 font-mono" style={{ color: TEXT_MUTED }}>
                          Mollie: {detailOrder.mollie_payment_id}
                        </p>
                      )}
                      {detailOrder.stripe_session_id && (
                        <p className="text-[11px] mt-1 font-mono" style={{ color: TEXT_MUTED }}>
                          Stripe: {detailOrder.stripe_session_id}
                        </p>
                      )}
                    </div>

                    <div className="pt-2" style={{ borderTop: `1px solid ${SURFACE_BORDER}` }}>
                      <div className="flex items-center gap-1.5 text-[11px]" style={{ color: TEXT_MUTED }}>
                        <Calendar className="w-3 h-3" />
                        {new Date(detailOrder.created_at).toLocaleString("nl-BE", {
                          dateStyle: "full",
                          timeStyle: "short",
                        })}
                      </div>
                    </div>
                  </div>
                </DialogContent>
              )}
            </Dialog>
          </div>
        )}
      </div>
    </div>
  );
}
