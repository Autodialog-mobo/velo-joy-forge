import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Sparkles } from "lucide-react";
import { getSeoAdvice, type GscRow } from "@/lib/seo-advisor.functions";

export const Route = createFileRoute("/_admin/admin-seo")({
  ssr: false,
  component: SeoAdvisorPage,
  head: () => ({ meta: [{ title: "SEO-advies — Velopass admin" }, { name: "robots", content: "noindex" }] }),
});

const NAVY = "#0D1F3C";
const GREEN = "#2ECC8A";
const SURFACE = "rgba(255,255,255,0.04)";
const SURFACE_BORDER = "rgba(255,255,255,0.08)";
const TEXT_PRI = "rgba(255,255,255,0.92)";
const TEXT_SEC = "rgba(255,255,255,0.60)";
const TEXT_MUTED = "rgba(255,255,255,0.40)";

function Table({ title, rows }: { title: string; rows: GscRow[] }) {
  return (
    <div className="rounded-2xl p-4 overflow-x-auto" style={{ background: SURFACE, border: `1px solid ${SURFACE_BORDER}` }}>
      <div className="mb-2 text-[13px] font-semibold">{title}</div>
      <table className="w-full text-[12px]">
        <thead>
          <tr style={{ color: TEXT_MUTED }}>
            <th className="text-left py-1">Item</th>
            <th className="text-right">Klikken</th>
            <th className="text-right">Vertoningen</th>
            <th className="text-right">CTR</th>
            <th className="text-right">Positie</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 20).map((r) => (
            <tr key={r.key} style={{ borderTop: `1px solid ${SURFACE_BORDER}` }}>
              <td className="py-1 pr-2 break-all">{r.key.replace("https://www.velopass.com", "")}</td>
              <td className="text-right">{r.clicks}</td>
              <td className="text-right">{r.impressions}</td>
              <td className="text-right">{(r.ctr * 100).toFixed(1)}%</td>
              <td className="text-right">{r.position.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SeoAdvisorPage() {
  const run = useServerFn(getSeoAdvice);
  const m = useMutation({ mutationFn: () => run() });
  const d = m.data;

  return (
    <div style={{ minHeight: "100vh", background: NAVY, color: TEXT_PRI }}>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link to="/admin" className="inline-flex items-center gap-2 text-sm" style={{ color: TEXT_SEC }}>
          <ArrowLeft size={14} /> Terug naar fulfillment
        </Link>
        <div className="mt-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 32 }}>SEO-advies</h1>
            <p className="mt-1 text-[13px]" style={{ color: TEXT_SEC }}>
              Haalt de zoekopdrachten en pagina's van de laatste 28 dagen uit Search Console en laat AI concrete verbeteringen voorstellen.
            </p>
          </div>
          <button
            onClick={() => m.mutate()}
            disabled={m.isPending}
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-semibold disabled:opacity-60"
            style={{ background: GREEN, color: NAVY }}
          >
            <Sparkles size={14} className={m.isPending ? "animate-pulse" : ""} />
            {m.isPending ? "Bezig met analyseren… (± 1 min)" : d ? "Opnieuw analyseren" : "Analyseer nu"}
          </button>
        </div>

        {m.error && <p className="mt-6 text-[13px]" style={{ color: "#F5B94D" }}>{(m.error as Error).message}</p>}
        {d?.error && <p className="mt-6 text-[13px]" style={{ color: "#F5B94D" }}>{d.error}</p>}

        {d && (d.queries.length > 0 || d.pages.length > 0) && (
          <p className="mt-6 text-[12px]" style={{ color: TEXT_MUTED }}>
            Periode {d.startDate} t/m {d.endDate} · {d.siteUrl}
          </p>
        )}

        {d?.advice && (
          <div className="mt-4 rounded-2xl p-6 whitespace-pre-wrap text-[14px] leading-relaxed" style={{ background: SURFACE, border: `1px solid ${SURFACE_BORDER}` }}>
            {d.advice}
          </div>
        )}

        {d && (d.queries.length > 0 || d.pages.length > 0) && (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Table title="Top zoekopdrachten" rows={d.queries} />
            <Table title="Top pagina's" rows={d.pages} />
          </div>
        )}
      </div>
    </div>
  );
}
