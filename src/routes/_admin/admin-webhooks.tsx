import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, RefreshCw, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { listWebhookEvents } from "@/lib/admin.functions";

export const Route = createFileRoute("/_admin/admin-webhooks")({
  ssr: false,
  component: WebhookStatusPage,
  head: () => ({
    meta: [{ title: "Webhook status — Velopass admin" }],
  }),
});


const NAVY = "#0D1F3C";
const GREEN = "#2ECC8A";
const RED = "#E05252";
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

const ORIGIN_LABELS: Record<string, string> = {
  production: "Productie",
  preview: "Preview",
  other: "Overige",
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

function relTime(iso: string | null) {
  if (!iso) return "nooit";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return "—";
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s geleden`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m geleden`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}u geleden`;
  const d = Math.floor(h / 24);
  return `${d}d geleden`;
}

function WebhookStatusPage() {
  const fetchEvents = useServerFn(listWebhookEvents);
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["webhook-events"],
    queryFn: () => fetchEvents({ data: { limit: 200 } }),
    refetchInterval: 15_000,
  });

  const summary = data?.summary ?? {};
  const events = data?.events ?? [];
  const kinds: Array<"production" | "preview" | "other"> = ["production", "preview", "other"];

  return (
    <div className="vp-pro-admin" style={{ minHeight: "100vh", background: NAVY, color: TEXT_PRI }}>
      <style>{`
        .vp-pro-admin { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; }
        .vp-pro-admin .card { background: ${SURFACE}; border: 1px solid ${SURFACE_BORDER}; border-radius: 12px; }
        .vp-pro-admin .btn-ghost {
          background: transparent; border: 1px solid ${SURFACE_BORDER};
          color: ${TEXT_PRI}; padding: 8px 14px; border-radius: 8px;
          font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;
          transition: all 0.15s ease;
        }
        .vp-pro-admin .btn-ghost:hover { background: rgba(255,255,255,0.06); }
        .vp-pro-admin .btn-ghost:focus-visible { outline: 2px solid ${GREEN}; outline-offset: 2px; }
        .vp-pro-admin .row { display: grid; grid-template-columns: 110px 110px 1fr 1fr 90px; gap: 16px; padding: 12px 16px; align-items: center; border-bottom: 1px solid ${SURFACE_BORDER}; }
        .vp-pro-admin .row:last-child { border-bottom: none; }
        .vp-pro-admin .pill {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600;
        }
        .vp-pro-admin code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
      `}</style>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px 64px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <Link to="/admin" style={{ ...EYEBROW, color: TEXT_SEC, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <ArrowLeft size={12} /> Terug naar admin
            </Link>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: "8px 0 4px" }}>Webhook status</h1>
            <p style={{ color: TEXT_SEC, fontSize: 14, margin: 0 }}>
              Inkomende Mollie-webhook calls per origin. Auto-refresh om de 15s.
            </p>
          </div>
          <button className="btn-ghost" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw size={14} style={{ opacity: isFetching ? 0.5 : 1 }} />
            {isFetching ? "Verversen…" : "Ververs"}
          </button>
        </div>

        {/* Per-origin summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
          {kinds.map((k) => {
            const s = summary[k] ?? { total: 0, success: 0, error: 0, last_received_at: null, last_success_at: null, last_error_at: null, last_error_message: null, last_24h: 0 };
            const healthy = s.last_success_at && (!s.last_error_at || new Date(s.last_success_at) >= new Date(s.last_error_at));
            const never = s.total === 0;
            const dot = never ? TEXT_MUTED : healthy ? GREEN : RED;
            return (
              <div key={k} className="card" style={{ padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={EYEBROW}>{ORIGIN_LABELS[k]}</div>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: dot, boxShadow: `0 0 8px ${dot}` }} />
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
                  {s.total}
                  <span style={{ fontSize: 13, color: TEXT_SEC, fontWeight: 400, marginLeft: 8 }}>
                    calls ({s.last_24h} laatste 24u)
                  </span>
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 12, color: TEXT_SEC, marginBottom: 16 }}>
                  <span><CheckCircle2 size={12} style={{ display: "inline", verticalAlign: -2, color: GREEN }} /> {s.success} ok</span>
                  <span><AlertCircle size={12} style={{ display: "inline", verticalAlign: -2, color: RED }} /> {s.error} fout</span>
                </div>
                <div style={{ display: "grid", gap: 6, fontSize: 12 }}>
                  <div>
                    <div style={{ ...EYEBROW, marginBottom: 2 }}>Laatst ontvangen</div>
                    <div style={{ color: TEXT_PRI }}>{fmtDateTime(s.last_received_at)}</div>
                    <div style={{ color: TEXT_MUTED, fontSize: 11 }}>{relTime(s.last_received_at)}</div>
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <div style={{ ...EYEBROW, marginBottom: 2 }}>Laatste succesvolle verwerking</div>
                    <div style={{ color: TEXT_PRI }}>{fmtDateTime(s.last_success_at)}</div>
                    <div style={{ color: TEXT_MUTED, fontSize: 11 }}>{relTime(s.last_success_at)}</div>
                  </div>
                  {s.last_error_at && (
                    <div style={{ marginTop: 4 }}>
                      <div style={{ ...EYEBROW, marginBottom: 2, color: RED }}>Laatste fout</div>
                      <div style={{ color: TEXT_PRI }}>{fmtDateTime(s.last_error_at)}</div>
                      {s.last_error_message && (
                        <div style={{ color: TEXT_SEC, fontSize: 11, marginTop: 2 }}>{s.last_error_message}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent events */}
        <div className="card">
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${SURFACE_BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={EYEBROW}>Recente calls</div>
              <div style={{ fontSize: 13, color: TEXT_SEC, marginTop: 2 }}>
                {events.length} weergegeven (max 200, nieuwste eerst)
              </div>
            </div>
            {isLoading && <Clock size={14} style={{ color: TEXT_MUTED }} />}
          </div>
          <div className="row" style={{ ...EYEBROW, color: TEXT_MUTED, paddingTop: 10, paddingBottom: 10 }}>
            <div>Tijd</div>
            <div>Status</div>
            <div>Origin</div>
            <div>Payment</div>
            <div style={{ textAlign: "right" }}>Resultaat</div>
          </div>
          {events.length === 0 && !isLoading && (
            <div style={{ padding: 32, textAlign: "center", color: TEXT_MUTED, fontSize: 13 }}>
              Nog geen webhook calls geregistreerd.
            </div>
          )}
          {events.map((ev: any) => (
            <div key={ev.id} className="row">
              <div style={{ fontSize: 12, color: TEXT_SEC }}>
                <div style={{ color: TEXT_PRI }}>{fmtDateTime(ev.received_at)}</div>
                <div style={{ color: TEXT_MUTED, fontSize: 11 }}>{relTime(ev.received_at)}</div>
              </div>
              <div>
                <span
                  className="pill"
                  style={
                    ev.status === "success"
                      ? { background: "rgba(46,204,138,0.12)", color: GREEN, border: "1px solid rgba(46,204,138,0.30)" }
                      : { background: "rgba(224,82,82,0.12)", color: RED, border: "1px solid rgba(224,82,82,0.30)" }
                  }
                >
                  {ev.status === "success" ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                  {ev.status === "success" ? "ok" : "fout"}
                </span>
              </div>
              <div style={{ fontSize: 12 }}>
                <div style={{ color: TEXT_PRI }}>{ORIGIN_LABELS[ev.origin_kind] ?? ev.origin_kind}</div>
                <div style={{ color: TEXT_MUTED, fontSize: 11 }}><code>{ev.origin_host ?? "—"}</code></div>
              </div>
              <div style={{ fontSize: 12 }}>
                <code style={{ color: TEXT_PRI }}>{ev.payload_id ?? "—"}</code>
                {ev.error_message && (
                  <div style={{ color: RED, fontSize: 11, marginTop: 2 }}>{ev.error_message}</div>
                )}
              </div>
              <div style={{ textAlign: "right", fontSize: 12, color: TEXT_SEC }}>
                {ev.payment_status ?? "—"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
