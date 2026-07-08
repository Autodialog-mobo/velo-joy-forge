import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { ArrowLeft, RefreshCw, Mail, Send, Search, X } from "lucide-react";
import { listEmailEvents } from "@/lib/admin.functions";

export const Route = createFileRoute("/_admin/admin-email-events")({
  ssr: false,
  component: EmailEventsPage,
  head: () => ({ meta: [{ title: "E-mail events — Velopass admin" }] }),
});

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
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: TEXT_MUTED,
};

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("nl-BE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

const EVENT_LABELS: Record<string, string> = {
  confirmation_email_resent: "Bevestiging opnieuw",
  confirmation_email_test_sent: "Testmail",
};

const EVENT_PILL: Record<string, React.CSSProperties> = {
  confirmation_email_resent: {
    background: "rgba(46,204,138,0.12)",
    color: GREEN,
    border: "1px solid rgba(46,204,138,0.30)",
  },
  confirmation_email_test_sent: {
    background: "rgba(255,255,255,0.07)",
    color: "rgba(255,255,255,0.60)",
    border: "1px solid rgba(255,255,255,0.12)",
  },
};

function extractRecipient(note: string | null): string {
  if (!note) return "—";
  const m = note.match(/Verzonden naar\s+(.+)$/i);
  return m ? m[1].trim() : note;
}

function EmailEventsPage() {
  const fetchEvents = useServerFn(listEmailEvents);
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-email-events"],
    queryFn: () => fetchEvents({ data: { limit: 500 } }),
  });

  const events = data?.events ?? [];

  const [typeFilter, setTypeFilter] = useState<"all" | "confirmation_email_resent" | "confirmation_email_test_sent">("all");
  const [orderIdInput, setOrderIdInput] = useState("");
  const [orderIdQuery, setOrderIdQuery] = useState("");
  const [recipientInput, setRecipientInput] = useState("");
  const [recipientQuery, setRecipientQuery] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setOrderIdQuery(orderIdInput.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [orderIdInput]);

  useEffect(() => {
    const t = setTimeout(() => setRecipientQuery(recipientInput.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [recipientInput]);

  const filtered = useMemo(() => {
    return events.filter((e: any) => {
      if (typeFilter !== "all" && e.event_type !== typeFilter) return false;
      if (orderIdQuery && !String(e.order_id).toLowerCase().includes(orderIdQuery)) return false;
      if (recipientQuery) {
        const note = (e.note || "").toLowerCase();
        if (!note.includes(recipientQuery)) return false;
      }
      return true;
    });
  }, [events, typeFilter, orderIdQuery, recipientQuery]);

  const hasFilters = typeFilter !== "all" || orderIdQuery || recipientQuery;

  return (
    <div style={{ minHeight: "100vh", background: NAVY, color: TEXT_PRI }}>
      <div className="mx-auto max-w-7xl px-6 py-10">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 text-sm"
          style={{ color: TEXT_SEC }}
        >
          <ArrowLeft size={14} /> Terug naar fulfillment
        </Link>

        <div className="mt-4 flex items-center justify-between">
          <div>
            <div style={EYEBROW}>Velopass · Back-office</div>
            <h1
              className="mt-2"
              style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 700,
                fontSize: 32,
                letterSpacing: "-0.6px",
              }}
            >
              E-mail events
            </h1>
            <p className="mt-1 text-[13px]" style={{ color: TEXT_SEC }}>
              Overzicht van alle testmails en handmatige resends. {events.length} geregistreerd.
            </p>
          </div>
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

        {/* Filters */}
        <div
          className="mt-6 flex flex-wrap items-center gap-3"
          style={{ background: SURFACE, border: `1px solid ${SURFACE_BORDER}`, borderRadius: 14, padding: "14px 16px" }}
        >
          {/* Type filter */}
          <div className="flex items-center gap-2">
            <Mail size={14} style={{ color: TEXT_MUTED }} />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="rounded-[10px] px-3 py-2 text-[13px] outline-none"
              style={{ background: "rgba(255,255,255,0.06)", color: TEXT_PRI, border: `1px solid ${SURFACE_BORDER}` }}
            >
              <option value="all">Alle types</option>
              <option value="confirmation_email_resent">Bevestiging opnieuw</option>
              <option value="confirmation_email_test_sent">Testmail</option>
            </select>
          </div>

          {/* Order ID filter */}
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
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

          {/* Recipient filter */}
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Send size={14} style={{ color: TEXT_MUTED }} />
            <input
              type="text"
              placeholder="Ontvanger (e-mail)…"
              value={recipientInput}
              onChange={(e) => setRecipientInput(e.target.value)}
              className="w-full rounded-[10px] px-3 py-2 text-[13px] outline-none"
              style={{ background: "rgba(255,255,255,0.06)", color: TEXT_PRI, border: `1px solid ${SURFACE_BORDER}` }}
            />
          </div>

          {hasFilters && (
            <button
              onClick={() => {
                setTypeFilter("all");
                setOrderIdInput("");
                setOrderIdQuery("");
                setRecipientInput("");
                setRecipientQuery("");
              }}
              className="inline-flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-[12px] font-medium"
              style={{ background: "transparent", color: TEXT_SEC, border: `1px solid ${SURFACE_BORDER}` }}
            >
              <X size={12} /> Wis filters
            </button>
          )}
        </div>

        {/* Table */}
        <div className="mt-4 overflow-hidden rounded-2xl" style={{ background: SURFACE, border: `1px solid ${SURFACE_BORDER}` }}>
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ color: TEXT_MUTED, textAlign: "left" }}>
                <th className="px-4 py-3 font-medium">Tijdstip</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Order-ID</th>
                <th className="px-4 py-3 font-medium">Ontvanger</th>
                <th className="px-4 py-3 font-medium">Acteur</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center" style={{ color: TEXT_MUTED }}>
                    Laden…
                  </td>
                </tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center" style={{ color: TEXT_MUTED }}>
                    {hasFilters ? "Geen events gevonden voor deze filters." : "Nog geen e-mail events geregistreerd."}
                  </td>
                </tr>
              )}
              {filtered.map((e: any) => (
                <tr key={e.id} style={{ borderTop: `1px solid ${SURFACE_BORDER}` }}>
                  <td className="px-4 py-3 whitespace-nowrap" style={{ color: TEXT_SEC }}>
                    {fmtDateTime(e.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] inline-flex items-center gap-1.5"
                      style={EVENT_PILL[e.event_type] ?? { background: SURFACE, color: TEXT_SEC, border: `1px solid ${SURFACE_BORDER}` }}
                    >
                      {e.event_type === "confirmation_email_resent" ? <Send size={11} /> : <Mail size={11} />}
                      {EVENT_LABELS[e.event_type] || e.event_type}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: TEXT_PRI, fontFamily: "ui-monospace, monospace", fontSize: 12 }}>
                    <Link
                      to="/admin"
                      search={{ order: e.order_id }}
                      className="underline decoration-dotted underline-offset-2 hover:opacity-80"
                      style={{ color: TEXT_PRI }}
                    >
                      {String(e.order_id).slice(0, 12)}
                    </Link>
                  </td>
                  <td className="px-4 py-3" style={{ color: TEXT_PRI }}>
                    {extractRecipient(e.note)}
                  </td>
                  <td className="px-4 py-3" style={{ color: TEXT_SEC }}>
                    {e.actor || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
