import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { listAuditLog } from "@/lib/admin.functions";

export const Route = createFileRoute("/_admin/admin-audit")({
  ssr: false,
  component: AuditLogPage,
  head: () => ({ meta: [{ title: "Audit log — Velopass admin" }] }),
});

const NAVY = "#0D1F3C";
const GREEN = "#2ECC8A";
const SURFACE = "rgba(255,255,255,0.04)";
const SURFACE_BORDER = "rgba(255,255,255,0.08)";
const TEXT_PRI = "rgba(255,255,255,0.92)";
const TEXT_SEC = "rgba(255,255,255,0.60)";
const TEXT_MUTED = "rgba(255,255,255,0.40)";

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("nl-BE", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch { return iso; }
}

const ACTION_LABELS: Record<string, string> = {
  "order.printed": "Bestelling geprint",
  "order.shipped": "Bestelling verzonden",
  "order.reverted": "Status teruggedraaid",
  "order.deleted": "Bestelling verwijderd",
  "order.restored": "Bestelling hersteld",
  "admin.invite": "Gebruiker uitgenodigd",
  "admin.role_updated": "Rol gewijzigd",
  "admin.removed": "Gebruiker verwijderd",
};

function AuditLogPage() {
  const fetchAudit = useServerFn(listAuditLog);
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-audit-log"],
    queryFn: () => fetchAudit({ data: { limit: 300 } }),
  });

  const entries = data?.entries ?? [];

  return (
    <div style={{ minHeight: "100vh", background: NAVY, color: TEXT_PRI }}>
      <div className="mx-auto max-w-7xl px-6 py-10">
        <Link to="/admin" className="inline-flex items-center gap-2 text-sm" style={{ color: TEXT_SEC }}>
          <ArrowLeft size={14} /> Terug naar fulfillment
        </Link>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: TEXT_MUTED }}>
              Velopass · Back-office
            </div>
            <h1 className="mt-2" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 32, letterSpacing: "-0.6px" }}>
              Audit log
            </h1>
            <p className="mt-1 text-[13px]" style={{ color: TEXT_SEC }}>
              Alle admin-acties met gebruiker, tijdstip en route. Laatste {entries.length} entries.
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

        <div className="mt-6 overflow-hidden rounded-2xl" style={{ background: SURFACE, border: `1px solid ${SURFACE_BORDER}` }}>
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ color: TEXT_MUTED, textAlign: "left" }}>
                <th className="px-4 py-3 font-medium">Tijdstip</th>
                <th className="px-4 py-3 font-medium">Gebruiker</th>
                <th className="px-4 py-3 font-medium">Actie</th>
                <th className="px-4 py-3 font-medium">Route</th>
                <th className="px-4 py-3 font-medium">Doel</th>
                <th className="px-4 py-3 font-medium">Details</th>
                <th className="px-4 py-3 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} className="px-4 py-8 text-center" style={{ color: TEXT_MUTED }}>Laden…</td></tr>
              )}
              {!isLoading && entries.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center" style={{ color: TEXT_MUTED }}>Nog geen entries.</td></tr>
              )}
              {entries.map((e: any) => (
                <tr key={e.id} style={{ borderTop: `1px solid ${SURFACE_BORDER}` }}>
                  <td className="px-4 py-3 whitespace-nowrap" style={{ color: TEXT_SEC }}>{fmtDateTime(e.created_at)}</td>
                  <td className="px-4 py-3" style={{ color: TEXT_PRI }}>{e.actor_email || e.user_id?.slice(0, 8) || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full px-2 py-0.5 text-[11px]" style={{ background: "rgba(46,204,138,0.12)", color: GREEN, border: `1px solid rgba(46,204,138,0.3)` }}>
                      {ACTION_LABELS[e.action] || e.action}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: TEXT_SEC }}>{e.route || "—"}</td>
                  <td className="px-4 py-3" style={{ color: TEXT_SEC }}>
                    {e.target_type ? `${e.target_type}` : "—"}
                    {e.target_id ? <span style={{ color: TEXT_MUTED }}> · {String(e.target_id).slice(0, 12)}</span> : null}
                  </td>
                  <td className="px-4 py-3" style={{ color: TEXT_MUTED, fontFamily: "ui-monospace, monospace", fontSize: 11, maxWidth: 280 }}>
                    {e.metadata ? <span title={JSON.stringify(e.metadata)}>{JSON.stringify(e.metadata).slice(0, 80)}</span> : "—"}
                  </td>
                  <td className="px-4 py-3" style={{ color: TEXT_MUTED, fontFamily: "ui-monospace, monospace", fontSize: 11 }}>{e.ip || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
