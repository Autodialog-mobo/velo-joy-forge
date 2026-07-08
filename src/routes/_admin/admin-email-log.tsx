import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { ArrowLeft, RefreshCw, Search, X, Mail, AlertTriangle, CheckCircle2 } from "lucide-react";
import { listEmailSendLog } from "@/lib/admin.functions";

export const Route = createFileRoute("/_admin/admin-email-log")({
  ssr: false,
  component: EmailLogPage,
  head: () => ({ meta: [{ title: "E-mail verzendlog — Velopass admin" }] }),
});

const NAVY = "#0D1F3C";
const GREEN = "#2ECC8A";
const RED = "#EF4444";
const AMBER = "#F59E0B";
const SURFACE = "rgba(255,255,255,0.04)";
const SURFACE_BORDER = "rgba(255,255,255,0.08)";
const TEXT_PRI = "rgba(255,255,255,0.92)";
const TEXT_SEC = "rgba(255,255,255,0.60)";
const TEXT_MUTED = "rgba(255,255,255,0.40)";

const EYEBROW: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: TEXT_MUTED,
};

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("nl-BE", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch { return iso; }
}

function statusStyle(status: string): React.CSSProperties {
  if (status === "sent") return { background: "rgba(46,204,138,0.12)", color: GREEN, border: "1px solid rgba(46,204,138,0.30)" };
  if (status === "gateway_error" || status === "exception" || status === "config_error" || status === "invalid_recipient")
    return { background: "rgba(239,68,68,0.12)", color: RED, border: "1px solid rgba(239,68,68,0.30)" };
  if (status === "skipped_no_recipient")
    return { background: "rgba(245,158,11,0.12)", color: AMBER, border: "1px solid rgba(245,158,11,0.30)" };
  return { background: SURFACE, color: TEXT_SEC, border: `1px solid ${SURFACE_BORDER}` };
}

const PRESETS: { label: string; hours: number | null }[] = [
  { label: "24u", hours: 24 },
  { label: "7d", hours: 24 * 7 },
  { label: "30d", hours: 24 * 30 },
  { label: "Alles", hours: null },
];

function EmailLogPage() {
  const fetchLog = useServerFn(listEmailSendLog);
  const [status, setStatus] = useState<string>("all");
  const [orderIdInput, setOrderIdInput] = useState("");
  const [orderIdQuery, setOrderIdQuery] = useState("");
  const [recipientInput, setRecipientInput] = useState("");
  const [recipientQuery, setRecipientQuery] = useState("");
  const [presetHours, setPresetHours] = useState<number | null>(24 * 7);
  const [customSince, setCustomSince] = useState<string>("");
  const [customUntil, setCustomUntil] = useState<string>("");

  useEffect(() => {
    const t = setTimeout(() => setOrderIdQuery(orderIdInput.trim()), 250);
    return () => clearTimeout(t);
  }, [orderIdInput]);
  useEffect(() => {
    const t = setTimeout(() => setRecipientQuery(recipientInput.trim()), 250);
    return () => clearTimeout(t);
  }, [recipientInput]);

  const sinceIso = useMemo(() => {
    if (customSince) return new Date(customSince).toISOString();
    if (presetHours == null) return null;
    return new Date(Date.now() - presetHours * 3600 * 1000).toISOString();
  }, [customSince, presetHours]);
  const untilIso = useMemo(() => (customUntil ? new Date(customUntil).toISOString() : null), [customUntil]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin-email-log", status, orderIdQuery, recipientQuery, sinceIso, untilIso],
    queryFn: () =>
      fetchLog({
        data: {
          status,
          orderId: orderIdQuery || null,
          recipient: recipientQuery || null,
          sinceIso,
          untilIso,
          limit: 1000,
        },
      }),
  });

  const entries = data?.entries ?? [];
  const statuses: string[] = data?.statuses ?? [];

  const stats = useMemo(() => {
    const total = entries.length;
    let sent = 0, failed = 0, other = 0;
    for (const e of entries) {
      if (e.status === "sent") sent++;
      else if (e.status === "gateway_error" || e.status === "exception" || e.status === "config_error" || e.status === "invalid_recipient") failed++;
      else other++;
    }
    return { total, sent, failed, other };
  }, [entries]);

  const hasFilters = status !== "all" || orderIdQuery || recipientQuery || customSince || customUntil;

  // Group by order_id
  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const e of entries) {
      const key = e.order_id ?? "__no_order__";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries()).sort((a, b) => {
      const at = new Date(a[1][0].created_at).getTime();
      const bt = new Date(b[1][0].created_at).getTime();
      return bt - at;
    });
  }, [entries]);

  const [groupView, setGroupView] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: NAVY, color: TEXT_PRI }}>
      <div className="mx-auto max-w-7xl px-6 py-10">
        <Link to="/admin" className="inline-flex items-center gap-2 text-sm" style={{ color: TEXT_SEC }}>
          <ArrowLeft size={14} /> Terug naar fulfillment
        </Link>

        <div className="mt-4 flex items-center justify-between">
          <div>
            <div style={EYEBROW}>Velopass · Back-office</div>
            <h1 className="mt-2" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 32, letterSpacing: "-0.6px" }}>
              E-mail verzendlog
            </h1>
            <p className="mt-1 text-[13px]" style={{ color: TEXT_SEC }}>
              Elke poging om een ordermail te versturen, met status en foutdetails.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setGroupView((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px]"
              style={{ background: SURFACE, border: `1px solid ${SURFACE_BORDER}`, color: TEXT_PRI }}
            >
              {groupView ? "Lijstweergave" : "Groepeer per order"}
            </button>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px]"
              style={{ background: SURFACE, border: `1px solid ${SURFACE_BORDER}`, color: TEXT_PRI }}
            >
              <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
              Vernieuwen
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Totaal" value={stats.total} icon={<Mail size={14} />} />
          <StatCard label="Verzonden" value={stats.sent} color={GREEN} icon={<CheckCircle2 size={14} />} />
          <StatCard label="Mislukt" value={stats.failed} color={RED} icon={<AlertTriangle size={14} />} />
          <StatCard label="Andere" value={stats.other} color={AMBER} />
        </div>

        {/* Filters */}
        <div
          className="mt-4 flex flex-wrap items-center gap-3"
          style={{ background: SURFACE, border: `1px solid ${SURFACE_BORDER}`, borderRadius: 14, padding: "14px 16px" }}
        >
          <div className="flex items-center gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => { setPresetHours(p.hours); setCustomSince(""); setCustomUntil(""); }}
                className="rounded-[10px] px-3 py-1.5 text-[12px] font-medium"
                style={{
                  background: presetHours === p.hours && !customSince ? "rgba(46,204,138,0.15)" : "rgba(255,255,255,0.06)",
                  color: presetHours === p.hours && !customSince ? GREEN : TEXT_PRI,
                  border: `1px solid ${presetHours === p.hours && !customSince ? "rgba(46,204,138,0.3)" : SURFACE_BORDER}`,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px]" style={{ color: TEXT_MUTED }}>Van</span>
            <input
              type="datetime-local"
              value={customSince}
              onChange={(e) => { setCustomSince(e.target.value); setPresetHours(null); }}
              className="rounded-[10px] px-2 py-1.5 text-[12px] outline-none"
              style={{ background: "rgba(255,255,255,0.06)", color: TEXT_PRI, border: `1px solid ${SURFACE_BORDER}`, colorScheme: "dark" }}
            />
            <span className="text-[11px]" style={{ color: TEXT_MUTED }}>tot</span>
            <input
              type="datetime-local"
              value={customUntil}
              onChange={(e) => { setCustomUntil(e.target.value); setPresetHours(null); }}
              className="rounded-[10px] px-2 py-1.5 text-[12px] outline-none"
              style={{ background: "rgba(255,255,255,0.06)", color: TEXT_PRI, border: `1px solid ${SURFACE_BORDER}`, colorScheme: "dark" }}
            />
          </div>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-[10px] px-3 py-2 text-[13px] outline-none"
            style={{ background: "rgba(255,255,255,0.06)", color: TEXT_PRI, border: `1px solid ${SURFACE_BORDER}` }}
          >
            <option value="all">Alle statussen</option>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <div className="flex items-center gap-2 flex-1 min-w-[180px]">
            <Search size={14} style={{ color: TEXT_MUTED }} />
            <input
              type="text"
              placeholder="Order-ID…"
              value={orderIdInput}
              onChange={(e) => setOrderIdInput(e.target.value)}
              className="w-full rounded-[10px] px-3 py-2 text-[13px] outline-none"
              style={{ background: "rgba(255,255,255,0.06)", color: TEXT_PRI, border: `1px solid ${SURFACE_BORDER}` }}
            />
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-[180px]">
            <Mail size={14} style={{ color: TEXT_MUTED }} />
            <input
              type="text"
              placeholder="Ontvanger…"
              value={recipientInput}
              onChange={(e) => setRecipientInput(e.target.value)}
              className="w-full rounded-[10px] px-3 py-2 text-[13px] outline-none"
              style={{ background: "rgba(255,255,255,0.06)", color: TEXT_PRI, border: `1px solid ${SURFACE_BORDER}` }}
            />
          </div>

          {hasFilters && (
            <button
              onClick={() => {
                setStatus("all"); setOrderIdInput(""); setOrderIdQuery("");
                setRecipientInput(""); setRecipientQuery("");
                setCustomSince(""); setCustomUntil(""); setPresetHours(24 * 7);
              }}
              className="inline-flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-[12px] font-medium"
              style={{ background: "transparent", color: TEXT_SEC, border: `1px solid ${SURFACE_BORDER}` }}
            >
              <X size={12} /> Wis filters
            </button>
          )}
        </div>

        {/* Body */}
        {groupView ? (
          <div className="mt-4 space-y-3">
            {isLoading && <EmptyRow text="Laden…" />}
            {!isLoading && grouped.length === 0 && <EmptyRow text="Geen log-entries voor deze filters." />}
            {grouped.map(([orderId, rows]) => (
              <OrderGroup key={orderId} orderId={orderId} rows={rows} />
            ))}
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl" style={{ background: SURFACE, border: `1px solid ${SURFACE_BORDER}` }}>
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ color: TEXT_MUTED, textAlign: "left" }}>
                  <th className="px-4 py-3 font-medium">Tijdstip</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Order-ID</th>
                  <th className="px-4 py-3 font-medium">Ontvanger</th>
                  <th className="px-4 py-3 font-medium">HTTP</th>
                  <th className="px-4 py-3 font-medium">Duur</th>
                  <th className="px-4 py-3 font-medium">Fout / Resend-ID</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center" style={{ color: TEXT_MUTED }}>Laden…</td></tr>
                )}
                {!isLoading && entries.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center" style={{ color: TEXT_MUTED }}>Geen log-entries voor deze filters.</td></tr>
                )}
                {entries.map((e: any) => (
                  <tr key={e.id} style={{ borderTop: `1px solid ${SURFACE_BORDER}` }}>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: TEXT_SEC }}>{fmtDateTime(e.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full px-2 py-0.5 text-[11px]" style={statusStyle(e.status)}>{e.status}</span>
                    </td>
                    <td className="px-4 py-3" style={{ color: TEXT_PRI, fontFamily: "ui-monospace, monospace", fontSize: 12 }}>
                      {e.order_id ? (
                        <Link to="/admin" search={{ order: e.order_id }} className="underline decoration-dotted underline-offset-2 hover:opacity-80" style={{ color: TEXT_PRI }}>
                          {String(e.order_id).slice(0, 12)}
                        </Link>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3" style={{ color: TEXT_PRI }}>{e.recipient || "—"}</td>
                    <td className="px-4 py-3" style={{ color: TEXT_SEC }}>{e.http_status ?? "—"}</td>
                    <td className="px-4 py-3" style={{ color: TEXT_SEC }}>{e.duration_ms != null ? `${e.duration_ms}ms` : "—"}</td>
                    <td className="px-4 py-3" style={{ color: e.error_message ? RED : TEXT_SEC, maxWidth: 340 }}>
                      <div className="truncate" title={e.error_message ?? e.resend_id ?? ""}>
                        {e.error_message || e.resend_id || "—"}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: number; color?: string; icon?: React.ReactNode }) {
  return (
    <div style={{ background: SURFACE, border: `1px solid ${SURFACE_BORDER}`, borderRadius: 14, padding: "14px 16px" }}>
      <div className="flex items-center gap-2" style={{ color: TEXT_MUTED, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>
        {icon}{label}
      </div>
      <div className="mt-1" style={{ fontSize: 24, fontWeight: 700, color: color ?? TEXT_PRI }}>{value}</div>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="rounded-2xl px-4 py-8 text-center" style={{ background: SURFACE, border: `1px solid ${SURFACE_BORDER}`, color: TEXT_MUTED }}>
      {text}
    </div>
  );
}

function OrderGroup({ orderId, rows }: { orderId: string; rows: any[] }) {
  const last = rows[0];
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: SURFACE, border: `1px solid ${SURFACE_BORDER}` }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${SURFACE_BORDER}` }}>
        <div className="flex items-center gap-3">
          <span style={{ color: TEXT_MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Order</span>
          {orderId === "__no_order__" ? (
            <span style={{ color: TEXT_SEC, fontFamily: "ui-monospace, monospace" }}>(geen order_id)</span>
          ) : (
            <Link to="/admin" search={{ order: orderId }} className="underline decoration-dotted underline-offset-2" style={{ color: TEXT_PRI, fontFamily: "ui-monospace, monospace", fontSize: 12 }}>
              {orderId.slice(0, 12)}
            </Link>
          )}
          <span className="rounded-full px-2 py-0.5 text-[11px]" style={statusStyle(last.status)}>laatst: {last.status}</span>
          <span style={{ color: TEXT_MUTED, fontSize: 12 }}>{rows.length} poging(en)</span>
        </div>
        <span style={{ color: TEXT_SEC, fontSize: 12 }}>{fmtDateTime(last.created_at)}</span>
      </div>
      <div>
        {rows.map((e: any) => (
          <div key={e.id} className="px-4 py-2.5 flex items-center gap-3" style={{ borderTop: `1px solid ${SURFACE_BORDER}`, fontSize: 12 }}>
            <span style={{ color: TEXT_SEC, minWidth: 160 }}>{fmtDateTime(e.created_at)}</span>
            <span className="rounded-full px-2 py-0.5 text-[11px]" style={statusStyle(e.status)}>{e.status}</span>
            <span style={{ color: TEXT_PRI }}>{e.recipient || "—"}</span>
            {e.http_status != null && <span style={{ color: TEXT_MUTED }}>HTTP {e.http_status}</span>}
            {e.duration_ms != null && <span style={{ color: TEXT_MUTED }}>{e.duration_ms}ms</span>}
            <span className="flex-1 truncate" style={{ color: e.error_message ? RED : TEXT_MUTED }} title={e.error_message ?? e.resend_id ?? ""}>
              {e.error_message || e.resend_id || ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
