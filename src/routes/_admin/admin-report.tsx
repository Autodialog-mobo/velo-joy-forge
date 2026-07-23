import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from "recharts";
import { TrendingUp, AlertTriangle, Info, RefreshCw } from "lucide-react";
import {
  orderReport,
  type ReportOrder,
  type ReportLine,
  type ExperimentImpression,
} from "@/lib/report.functions";
import {
  BUNDLE_ORDER,
  BUNDLE_LABELS,
  BUNDLE_COLORS,
  REFERRAL_LABELS,
  bucketOf,
  buildBuckets,
  computeSignals,
  twoProportionZTest,
  type Granularity,
  type Signal,
} from "@/lib/report.aggregate";

export const Route = createFileRoute("/_admin/admin-report")({
  ssr: false,
  component: AdminReportPage,
});

/* ------------------------------------------------------------------ */
/* Palette (dark surface) — categorical trio validated with dataviz    */
/* validator (all checks pass on #15171C-class surface).               */
/* ------------------------------------------------------------------ */
const BG = "#0E0F12";
const CARD = "#15171C";
const BORDER = "rgba(255,255,255,0.08)";
const TEXT = "#fff";
const TEXT_2 = "rgba(255,255,255,0.72)";
const TEXT_MUTED = "rgba(255,255,255,0.5)";
const GRID = "rgba(255,255,255,0.07)";

const ACCENT = "#2ECC8A"; // brand green — single-series evolution
const POSITIVE = "#2ECC8A";
const WARNING = "#F5B94D";
const INFO = "#7AB0FF";

function bundleMeta(key: string) {
  return { label: BUNDLE_LABELS[key] ?? key, color: BUNDLE_COLORS[key] ?? "#9085e9" };
}

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                  */
/* ------------------------------------------------------------------ */
const eur = new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" });
const eur0 = new Intl.NumberFormat("nl-BE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
function fmtEUR(cents: number) {
  return eur.format((cents || 0) / 100);
}
function fmtEURcompact(cents: number) {
  const v = (cents || 0) / 100;
  if (v >= 1000) return "€" + (v / 1000).toFixed(1).replace(".", ",") + "k";
  return eur0.format(v);
}

let regionNames: Intl.DisplayNames | null = null;
try {
  regionNames = new Intl.DisplayNames(["nl"], { type: "region" });
} catch {
  regionNames = null;
}
function countryLabel(code: string) {
  if (!code || code === "??") return "Onbekend";
  const up = code.toUpperCase();
  try {
    return regionNames?.of(up) ?? up;
  } catch {
    return up;
  }
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
function AdminReportPage() {
  const [environment, setEnvironment] = useState<"live" | "sandbox">("live");
  const [granularity, setGranularity] = useState<Granularity>("week");
  const [metric, setMetric] = useState<"count" | "revenue">("count");
  const [country, setCountry] = useState<string>("__all");
  const [showEvoTable, setShowEvoTable] = useState(false);

  const run = useServerFn(orderReport);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["order-report", environment],
    queryFn: () => run({ data: { environment } }),
  });

  const allOrders: ReportOrder[] = data?.orders ?? [];
  const lines: ReportLine[] = data?.lines ?? [];
  const impressions: ExperimentImpression[] = data?.impressions ?? [];

  const linesByOrder = useMemo(() => {
    const m = new Map<string, ReportLine[]>();
    for (const l of lines) {
      const arr = m.get(l.order_id) ?? [];
      arr.push(l);
      m.set(l.order_id, arr);
    }
    return m;
  }, [lines]);

  // Country options come from the full (environment-level) set, so the filter
  // lists every market regardless of the current selection.
  const countryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const o of allOrders) {
      const c = (o.shipping_country || "").trim().toUpperCase();
      if (c) set.add(c);
    }
    return Array.from(set).sort();
  }, [allOrders]);

  const orders = useMemo(() => {
    if (country === "__all") return allOrders;
    return allOrders.filter((o) => (o.shipping_country || "").trim().toUpperCase() === country);
  }, [allOrders, country]);

  /* ---- KPIs ---- */
  const kpis = useMemo(() => {
    let revenue = 0;
    let stickers = 0;
    for (const o of orders) revenue += o.amount_total || 0;
    for (const o of orders) {
      for (const l of linesByOrder.get(o.id) ?? []) stickers += l.sticker_count || 0;
    }
    const count = orders.length;
    return { count, revenue, stickers, aov: count ? revenue / count : 0 };
  }, [orders, linesByOrder]);

  /* ---- Evolution series (count + revenue) ---- */
  const evolution = useMemo(() => {
    if (!orders.length)
      return [] as {
        key: string;
        label: string;
        count: number;
        revenue: number;
        refs: Record<string, number>;
      }[];
    const dates = orders.map((o) => new Date(o.created_at));
    const min = new Date(Math.min(...dates.map((d) => d.getTime())));
    const max = new Date(Math.max(...dates.map((d) => d.getTime())));
    const buckets = buildBuckets(min, max, granularity);
    const idx = new Map(buckets.map((b, i) => [b.key, i]));
    const rows = buckets.map((b) => ({
      key: b.key,
      label: b.label,
      count: 0,
      revenue: 0,
      refs: {} as Record<string, number>,
    }));
    for (const o of orders) {
      const b = bucketOf(o.created_at, granularity);
      const i = idx.get(b.key);
      if (i == null) continue;
      rows[i].count += 1;
      rows[i].revenue += (o.amount_total || 0) / 100;
      const refKey = o.referral_source && o.referral_source !== "" ? o.referral_source : "__unknown";
      rows[i].refs[refKey] = (rows[i].refs[refKey] ?? 0) + 1;
    }
    return rows;
  }, [orders, granularity]);

  /* ---- Bundle evolution (units per bundle per bucket, stacked) ---- */
  const bundleEvolution = useMemo(() => {
    if (!orders.length) return [] as any[];
    const dates = orders.map((o) => new Date(o.created_at));
    const min = new Date(Math.min(...dates.map((d) => d.getTime())));
    const max = new Date(Math.max(...dates.map((d) => d.getTime())));
    const buckets = buildBuckets(min, max, granularity);
    const idx = new Map(buckets.map((b, i) => [b.key, i]));
    const rows: any[] = buckets.map((b) => {
      const r: any = { key: b.key, label: b.label };
      for (const k of BUNDLE_ORDER) r[k] = 0;
      return r;
    });
    for (const o of orders) {
      const b = bucketOf(o.created_at, granularity);
      const i = idx.get(b.key);
      if (i == null) continue;
      for (const l of linesByOrder.get(o.id) ?? []) {
        if (rows[i][l.bundle_key] == null) rows[i][l.bundle_key] = 0;
        rows[i][l.bundle_key] += l.quantity || 0;
      }
    }
    return rows;
  }, [orders, linesByOrder, granularity]);

  /* ---- Bundle breakdown totals ---- */
  const bundleStats = useMemo(() => {
    const map = new Map<string, { units: number; stickers: number; revenue: number; orders: number }>();
    for (const o of orders) {
      const seenBundles = new Set<string>();
      for (const l of linesByOrder.get(o.id) ?? []) {
        const cur = map.get(l.bundle_key) ?? { units: 0, stickers: 0, revenue: 0, orders: 0 };
        cur.units += l.quantity || 0;
        cur.stickers += l.sticker_count || 0;
        cur.revenue += (l.unit_price_cents || 0) * (l.quantity || 0);
        if (!seenBundles.has(l.bundle_key)) {
          cur.orders += 1;
          seenBundles.add(l.bundle_key);
        }
        map.set(l.bundle_key, cur);
      }
    }
    const totalUnits = Array.from(map.values()).reduce((s, v) => s + v.units, 0) || 1;
    const keys = Array.from(map.keys()).sort(
      (a, b) => BUNDLE_ORDER.indexOf(a as any) - BUNDLE_ORDER.indexOf(b as any),
    );
    return keys.map((k) => ({ key: k, ...map.get(k)!, share: (map.get(k)!.units / totalUnits) * 100 }));
  }, [orders, linesByOrder]);

  /* ---- Referral breakdown ---- */
  const referralStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of orders) {
      const key = o.referral_source && o.referral_source !== "" ? o.referral_source : "__unknown";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    const total = orders.length || 1;
    return Array.from(map.entries())
      .map(([key, count]) => ({
        key,
        label: REFERRAL_LABELS[key] ?? key,
        count,
        share: (count / total) * 100,
      }))
      .sort((a, b) => b.count - a.count);
  }, [orders]);

  /* ---- Country breakdown (always full, ignores the country filter) ---- */
  const countryStats = useMemo(() => {
    const map = new Map<string, { orders: number; revenue: number }>();
    for (const o of allOrders) {
      const c = (o.shipping_country || "??").trim().toUpperCase() || "??";
      const cur = map.get(c) ?? { orders: 0, revenue: 0 };
      cur.orders += 1;
      cur.revenue += o.amount_total || 0;
      map.set(c, cur);
    }
    const total = allOrders.length || 1;
    return Array.from(map.entries())
      .map(([code, v]) => ({ code, ...v, share: (v.orders / total) * 100 }))
      .sort((a, b) => b.orders - a.orders);
  }, [allOrders]);

  /* ---- Rule-based signals ---- */
  const signals = useMemo(() => computeSignals(orders, linesByOrder), [orders, linesByOrder]);

  /* ---- A/B experiment (global, not country-filtered) ---- */
  const experiment = useMemo(() => {
    const markers = new Set<string>();
    for (const im of impressions) markers.add(im.marker);
    for (const o of allOrders) if (o.experiment_variant) markers.add(o.experiment_variant);
    if (!markers.size) return null;
    const imprByMarker = new Map(impressions.map((i) => [i.marker, i]));
    const rows = Array.from(markers)
      .map((marker) => {
        const [key, variant] = marker.split(":");
        const os = allOrders.filter((o) => o.experiment_variant === marker);
        let revenue = 0;
        let solo = 0;
        let duo = 0;
        let family = 0;
        let units = 0;
        for (const o of os) {
          revenue += o.amount_total || 0;
          for (const l of linesByOrder.get(o.id) ?? []) {
            const q = l.quantity || 0;
            units += q;
            if (l.bundle_key === "frameid_solo_onetime") solo += q;
            else if (l.bundle_key === "frameid_duo_onetime") duo += q;
            else if (l.bundle_key === "frameid_family_onetime") family += q;
          }
        }
        const im = imprByMarker.get(marker);
        const visitors = im?.visitors ?? 0;
        const orders = os.length;
        return {
          marker,
          key,
          variant,
          visitors,
          impressions: im?.impressions ?? 0,
          orders,
          revenue,
          aov: orders ? revenue / orders : 0,
          duoShare: units ? (duo / units) * 100 : 0,
          soloShare: units ? (solo / units) * 100 : 0,
          conv: visitors ? (orders / visitors) * 100 : 0,
          solo,
          duo,
          family,
        };
      })
      .sort((a, b) => (a.variant < b.variant ? -1 : 1));
    return { key: rows[0]?.key ?? "", rows };
  }, [impressions, allOrders, linesByOrder]);

  /* ---------------------------------------------------------------- */
  const evoColor = metric === "revenue" ? INFO : ACCENT;

  return (
    <div style={{ background: BG, minHeight: "100vh", color: TEXT }}>
      <div className="max-w-[1100px] mx-auto px-5 py-8 md:px-10 md:py-12">
        {/* Header */}
        <div className="mb-2 text-xs uppercase tracking-wider" style={{ color: TEXT_MUTED }}>
          Velopass · Back-office
        </div>
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 32 }}>Rapportage</h1>
          <a href="/admin" className="text-sm" style={{ color: ACCENT, borderBottom: `1px dashed ${ACCENT}` }}>
            &larr; Terug naar fulfillment
          </a>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <Segmented
            options={[
              { v: "live", label: "Live" },
              { v: "sandbox", label: "Sandbox" },
            ]}
            value={environment}
            onChange={(v) => setEnvironment(v as any)}
          />
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            style={selectStyle}
            aria-label="Filter op land"
          >
            <option value="__all">Alle landen</option>
            {countryOptions.map((c) => (
              <option key={c} value={c}>
                {countryLabel(c)} ({c})
              </option>
            ))}
          </select>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => refetch()}
              style={{ ...selectStyle, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
              title="Ververs"
            >
              <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
              Ververs
            </button>
          </div>
        </div>

        {error && (
          <Card>
            <div style={{ color: "#ff8f8f" }}>Rapport laden mislukt: {(error as Error).message}</div>
          </Card>
        )}

        {isLoading ? (
          <Card>
            <div style={{ color: TEXT_MUTED }}>Rapport laden...</div>
          </Card>
        ) : !allOrders.length ? (
          <Card>
            <div style={{ color: TEXT_MUTED }}>
              Nog geen betaalde bestellingen in deze omgeving ({environment}).
            </div>
          </Card>
        ) : (
          <>
            {/* KPI tiles */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <Kpi label="Bestellingen" value={kpis.count.toLocaleString("nl-BE")} />
              <Kpi label="Omzet (incl. btw)" value={fmtEUR(kpis.revenue)} />
              <Kpi label="Frame-ID's verkocht" value={kpis.stickers.toLocaleString("nl-BE")} />
              <Kpi label="Gem. orderwaarde" value={fmtEUR(kpis.aov)} />
            </div>

            {/* Signals */}
            {signals.length > 0 && (
              <Card className="mb-6">
                <SectionTitle>Signalen &amp; advies</SectionTitle>
                <div style={{ color: TEXT_MUTED, fontSize: 12, marginBottom: 12 }}>
                  Vergelijking laatste 30 dagen t.o.v. de 30 dagen ervoor
                  {country !== "__all" ? ` — ${countryLabel(country)}` : ""}.
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  {signals.map((s, i) => (
                    <SignalCard key={i} signal={s} />
                  ))}
                </div>
              </Card>
            )}

            {/* A/B experiment */}
            {experiment ? (
              <Card className="mb-6">
                <SectionTitle>A/B-test: bundelkeuze</SectionTitle>
                <div style={{ color: TEXT_MUTED, fontSize: 12, marginBottom: 12 }}>
                  Variant A = huidige pagina · Variant B = duo voorgeselecteerd met besparing benadrukt.
                  Wereldwijd, niet beperkt door het landfilter.
                </div>
                <div className="overflow-x-auto">
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <Th>Variant</Th>
                        <Th right>Bezoekers</Th>
                        <Th right>Bestellingen</Th>
                        <Th right>Conversie</Th>
                        <Th right>Gem. orderwaarde</Th>
                        <Th right>Duo-aandeel</Th>
                        <Th right>Solo-aandeel</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {experiment.rows.map((r) => (
                        <tr key={r.marker}>
                          <Td>
                            <strong style={{ color: TEXT }}>{r.variant}</strong>{" "}
                            <span style={{ color: TEXT_MUTED }}>
                              {r.variant === "A" ? "(controle)" : r.variant === "B" ? "(duo vooraf)" : ""}
                            </span>
                          </Td>
                          <Td right>{r.visitors || "-"}</Td>
                          <Td right>{r.orders}</Td>
                          <Td right>{r.visitors ? `${r.conv.toFixed(1)}%` : "-"}</Td>
                          <Td right>{fmtEUR(r.aov)}</Td>
                          <Td right>{r.duoShare.toFixed(0)}%</Td>
                          <Td right>{r.soloShare.toFixed(0)}%</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <ExperimentInsight rows={experiment.rows} />
              </Card>
            ) : (
              <Card className="mb-6">
                <SectionTitle>A/B-test: bundelkeuze</SectionTitle>
                <div style={{ color: TEXT_2, fontSize: 13, lineHeight: 1.6 }}>
                  Test loopt - nog geen data. Zodra bezoekers de bestelpagina openen en bestellen,
                  verschijnen hier per variant de bezoekers, conversie, gemiddelde orderwaarde en het
                  duo-/solo-aandeel, met een significantietoets. Variant A = huidige pagina, variant B =
                  duo voorgeselecteerd met besparing benadrukt.
                </div>
                <div style={{ color: TEXT_MUTED, fontSize: 11, marginTop: 8 }}>
                  Blijft dit leeg terwijl er wel verkeer is? Controleer of de databasemigratie (tabel
                  experiment_impressions) is toegepast.
                </div>
              </Card>
            )}

            {/* Evolution */}
            <Card className="mb-6">
              <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <SectionTitle noMargin>Evolutie van de bestellingen</SectionTitle>
                <div className="flex items-center gap-2">
                  <Segmented
                    options={[
                      { v: "count", label: "Aantal" },
                      { v: "revenue", label: "Omzet" },
                    ]}
                    value={metric}
                    onChange={(v) => setMetric(v as any)}
                  />
                  <Segmented
                    options={[
                      { v: "day", label: "Dag" },
                      { v: "week", label: "Week" },
                      { v: "month", label: "Maand" },
                    ]}
                    value={granularity}
                    onChange={(v) => setGranularity(v as any)}
                  />
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={evolution} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                  <defs>
                    <linearGradient id="evoFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={evoColor} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={evoColor} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: TEXT_MUTED, fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: GRID }}
                    minTickGap={16}
                  />
                  <YAxis
                    tick={{ fill: TEXT_MUTED, fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={54}
                    tickFormatter={(v) =>
                      metric === "revenue" ? fmtEURcompact(Number(v) * 100) : String(v)
                    }
                  />
                  <Tooltip
                    content={<EvoTooltip metric={metric} />}
                    cursor={{ stroke: "rgba(255,255,255,0.25)", strokeDasharray: "3 3" }}
                  />
                  <Area
                    type="monotone"
                    dataKey={metric}
                    stroke={evoColor}
                    strokeWidth={2}
                    fill="url(#evoFill)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    name={metric === "revenue" ? "Omzet" : "Bestellingen"}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <button
                onClick={() => setShowEvoTable((s) => !s)}
                style={{ ...linkBtn, marginTop: 8 }}
              >
                {showEvoTable ? "Verberg tabel" : "Toon als tabel"}
              </button>
              {showEvoTable && (
                <div className="mt-3 overflow-x-auto">
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <Th>Periode</Th>
                        <Th right>Bestellingen</Th>
                        <Th right>Omzet</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {evolution.map((r) => (
                        <tr key={r.key}>
                          <Td>{r.label}</Td>
                          <Td right>{r.count}</Td>
                          <Td right>{fmtEUR(r.revenue * 100)}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Bundles */}
            <Card className="mb-6">
              <SectionTitle>Succes per bundel</SectionTitle>
              <div className="grid lg:grid-cols-2 gap-6">
                <div>
                  <div style={{ color: TEXT_MUTED, fontSize: 12, marginBottom: 8 }}>
                    Verkochte bundels per periode (aantal)
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={bundleEvolution} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                      <CartesianGrid stroke={GRID} vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: TEXT_MUTED, fontSize: 11 }}
                        tickLine={false}
                        axisLine={{ stroke: GRID }}
                        minTickGap={16}
                      />
                      <YAxis tick={{ fill: TEXT_MUTED, fontSize: 11 }} tickLine={false} axisLine={false} width={32} />
                      <Tooltip content={<BundleTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                      <Legend
                        formatter={(v) => <span style={{ color: TEXT_2, fontSize: 12 }}>{bundleMeta(v).label}</span>}
                      />
                      {BUNDLE_ORDER.map((k) => (
                        <Area
                          key={k}
                          type="monotone"
                          dataKey={k}
                          stackId="u"
                          stroke={bundleMeta(k).color}
                          strokeWidth={1.5}
                          fill={bundleMeta(k).color}
                          fillOpacity={0.55}
                          name={k}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <div style={{ color: TEXT_MUTED, fontSize: 12, marginBottom: 8 }}>Totalen &amp; aandeel</div>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <Th>Bundel</Th>
                        <Th right>Bundels</Th>
                        <Th right>Frame-ID's</Th>
                        <Th right>Omzet</Th>
                        <Th right>Aandeel</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {bundleStats.map((b) => (
                        <tr key={b.key}>
                          <Td>
                            <span
                              style={{
                                display: "inline-block",
                                width: 10,
                                height: 10,
                                borderRadius: 3,
                                background: bundleMeta(b.key).color,
                                marginRight: 8,
                              }}
                            />
                            {bundleMeta(b.key).label}
                          </Td>
                          <Td right>{b.units}</Td>
                          <Td right>{b.stickers}</Td>
                          <Td right>{fmtEUR(b.revenue)}</Td>
                          <Td right>{b.share.toFixed(0)}%</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>

            {/* Referral */}
            <Card className="mb-6">
              <SectionTitle>Hoe hebben klanten Velopass gevonden?</SectionTitle>
              <div className="grid lg:grid-cols-2 gap-6 items-center">
                <ResponsiveContainer width="100%" height={Math.max(180, referralStats.length * 34)}>
                  <BarChart
                    layout="vertical"
                    data={referralStats}
                    margin={{ top: 4, right: 48, left: 4, bottom: 4 }}
                  >
                    <CartesianGrid stroke={GRID} horizontal={false} />
                    <XAxis type="number" tick={{ fill: TEXT_MUTED, fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis
                      type="category"
                      dataKey="label"
                      tick={{ fill: TEXT_2, fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      width={130}
                    />
                    <Tooltip content={<ReferralTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                    <Bar dataKey="count" fill={INFO} radius={[0, 4, 4, 0]} barSize={18}>
                      <LabelList
                        dataKey="count"
                        position="right"
                        formatter={(v: any, _n?: any, entry?: any) => {
                          const share = entry?.payload?.share;
                          return typeof share === "number" ? `${v}  (${share.toFixed(0)}%)` : String(v);
                        }}
                        style={{ fill: TEXT_2, fontSize: 11 }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <Th>Kanaal</Th>
                      <Th right>Bestellingen</Th>
                      <Th right>Aandeel</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {referralStats.map((r) => (
                      <tr key={r.key}>
                        <Td>{r.label}</Td>
                        <Td right>{r.count}</Td>
                        <Td right>{r.share.toFixed(0)}%</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Country */}
            <Card>
              <SectionTitle>Bestellingen per land</SectionTitle>
              <div style={{ color: TEXT_MUTED, fontSize: 12, marginBottom: 12 }}>
                Volledige verdeling (niet beperkt door het landfilter). Klik een land in het filter bovenaan om de
                rest van het rapport erop te richten.
              </div>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <Th>Land</Th>
                    <Th right>Bestellingen</Th>
                    <Th right>Omzet</Th>
                    <Th right>Aandeel</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {countryStats.map((c) => (
                    <tr key={c.code}>
                      <Td>
                        {countryLabel(c.code)}{" "}
                        <span style={{ color: TEXT_MUTED }}>({c.code})</span>
                      </Td>
                      <Td right>{c.orders}</Td>
                      <Td right>{fmtEUR(c.revenue)}</Td>
                      <Td right>{c.share.toFixed(0)}%</Td>
                      <Td>
                        <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 4, height: 8, width: 120 }}>
                          <div
                            style={{
                              width: `${Math.max(2, c.share)}%`,
                              height: 8,
                              borderRadius: 4,
                              background: ACCENT,
                            }}
                          />
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <div style={{ color: TEXT_MUTED, fontSize: 11, marginTop: 16 }}>
              Omzet = betaald bedrag incl. btw en verzending. Bundelomzet = productprijs per bundel (excl.
              verzending). Alleen betaalde bestellingen (paid / printed / shipped).
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small presentational components                                     */
/* ------------------------------------------------------------------ */
function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl p-5 md:p-6 ${className ?? ""}`}
      style={{ background: CARD, border: `1px solid ${BORDER}` }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children, noMargin }: { children: React.ReactNode; noMargin?: boolean }) {
  return (
    <h2
      className="text-sm font-semibold uppercase tracking-wider"
      style={{ color: "rgba(255,255,255,0.6)", marginBottom: noMargin ? 0 : 16 }}
    >
      {children}
    </h2>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
      <div style={{ color: TEXT_MUTED, fontSize: 12, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 24 }}>{value}</div>
    </div>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { v: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "inline-flex", background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: 3 }}>
      {options.map((o) => {
        const active = o.v === value;
        return (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: 13,
              border: "none",
              cursor: "pointer",
              background: active ? ACCENT : "transparent",
              color: active ? "#062015" : TEXT_2,
              fontWeight: active ? 600 : 500,
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function SignalCard({ signal }: { signal: Signal }) {
  const map = {
    positive: { color: POSITIVE, Icon: TrendingUp },
    warning: { color: WARNING, Icon: AlertTriangle },
    info: { color: INFO, Icon: Info },
  } as const;
  const { color, Icon } = map[signal.tone];
  return (
    <div
      className="rounded-xl p-4 flex items-start gap-3"
      style={{ background: "rgba(255,255,255,0.03)", borderLeft: `3px solid ${color}`, border: `1px solid ${BORDER}` }}
    >
      <Icon size={16} style={{ color, marginTop: 2, flexShrink: 0 }} />
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{signal.title}</div>
        <div style={{ color: TEXT_2, fontSize: 13, lineHeight: 1.5 }}>{signal.body}</div>
      </div>
    </div>
  );
}

function ExperimentInsight({ rows }: { rows: any[] }) {
  const A = rows.find((r) => r.variant === "A");
  const B = rows.find((r) => r.variant === "B");
  if (!A || !B) return null;
  const duoDiff = B.duoShare - A.duoShare;
  const bothVisitors = A.visitors > 0 && B.visitors > 0;
  const convDiff = B.conv - A.conv;
  const tone = duoDiff > 0 ? POSITIVE : duoDiff < 0 ? WARNING : INFO;

  // Significance of the conversion difference (orders per visitor).
  const zt = bothVisitors ? twoProportionZTest(A.orders, A.visitors, B.orders, B.visitors) : null;
  let sigLabel = "";
  let sigColor = TEXT_MUTED;
  if (zt) {
    if (!zt.enoughData) {
      sigLabel = "nog niet genoeg data";
      sigColor = WARNING;
    } else if (zt.significant) {
      sigLabel = "significant";
      sigColor = POSITIVE;
    } else {
      sigLabel = "niet significant";
      sigColor = TEXT_MUTED;
    }
  }

  return (
    <div
      className="rounded-xl p-4 mt-4"
      style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderLeft: `3px solid ${tone}` }}
    >
      <div style={{ fontSize: 13, color: TEXT_2, lineHeight: 1.6 }}>
        Duo-aandeel: variant B {B.duoShare.toFixed(0)}% vs A {A.duoShare.toFixed(0)}% ({duoDiff >= 0 ? "+" : ""}
        {duoDiff.toFixed(0)} pp).{" "}
        {bothVisitors
          ? `Conversie: B ${B.conv.toFixed(1)}% vs A ${A.conv.toFixed(1)}% (${convDiff >= 0 ? "+" : ""}${convDiff.toFixed(1)} pp).`
          : "Conversie nog niet te vergelijken (impressies ontbreken nog)."}
      </div>
      {zt && (
        <div style={{ fontSize: 12, marginTop: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span
            style={{
              padding: "2px 8px",
              borderRadius: 999,
              background: sigColor === TEXT_MUTED ? "rgba(255,255,255,0.08)" : `${sigColor}22`,
              color: sigColor === TEXT_MUTED ? TEXT_2 : sigColor,
              fontWeight: 600,
            }}
          >
            {sigLabel}
          </span>
          <span style={{ color: TEXT_MUTED }}>
            p = {zt.p < 0.001 ? "<0,001" : zt.p.toFixed(3).replace(".", ",")} (conversie B vs A)
          </span>
        </div>
      )}
      <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 6 }}>
        {zt?.enoughData
          ? "Significant = p < 0,05: het conversieverschil is waarschijnlijk echt, niet toeval."
          : "Nog te weinig bezoekers/bestellingen per variant voor een betrouwbare toets. Laat de test langer lopen."}
      </div>
    </div>
  );
}

/* Tooltips */
function tooltipBox(children: React.ReactNode) {
  return (
    <div
      style={{
        background: "#0B0C0F",
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
        padding: "8px 10px",
        fontSize: 12,
        color: TEXT,
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
      }}
    >
      {children}
    </div>
  );
}

function EvoTooltip({ active, payload, label, metric }: any) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  const row = payload[0].payload ?? {};
  const refs = Object.entries(row.refs ?? {}).sort(
    (a, b) => (b[1] as number) - (a[1] as number),
  ) as [string, number][];
  return tooltipBox(
    <>
      <div style={{ color: TEXT_MUTED, marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 600 }}>
        {metric === "revenue" ? fmtEUR(Number(v) * 100) : `${v} bestellingen`}
      </div>
      {refs.length > 0 && (
        <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: 6, paddingTop: 6 }}>
          <div style={{ color: TEXT_MUTED, fontSize: 11, marginBottom: 4 }}>Hoe gevonden</div>
          {refs.map(([k, n]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              <span style={{ color: TEXT_2 }}>{REFERRAL_LABELS[k] ?? k}</span>
              <span style={{ fontWeight: 600 }}>{n}</span>
            </div>
          ))}
        </div>
      )}
    </>,
  );
}

function BundleTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (p.value || 0), 0);
  return tooltipBox(
    <>
      <div style={{ color: TEXT_MUTED, marginBottom: 4 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color, display: "inline-block" }} />
          <span style={{ color: TEXT_2 }}>{bundleMeta(p.dataKey).label}:</span>
          <span style={{ fontWeight: 600 }}>{p.value}</span>
        </div>
      ))}
      <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: 4, paddingTop: 4, color: TEXT_MUTED }}>
        Totaal: {total}
      </div>
    </>,
  );
}

function ReferralTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return tooltipBox(
    <>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{p.label}</div>
      <div style={{ color: TEXT_2 }}>
        {p.count} bestellingen ({p.share.toFixed(0)}%)
      </div>
    </>,
  );
}

/* Table primitives */
const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};
function Th({ children, right }: { children?: React.ReactNode; right?: boolean }) {
  return (
    <th
      style={{
        textAlign: right ? "right" : "left",
        color: TEXT_MUTED,
        fontWeight: 500,
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        padding: "6px 8px",
        borderBottom: `1px solid ${BORDER}`,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}
function Td({ children, right }: { children?: React.ReactNode; right?: boolean }) {
  return (
    <td
      style={{
        textAlign: right ? "right" : "left",
        padding: "8px 8px",
        borderBottom: `1px solid rgba(255,255,255,0.05)`,
        color: TEXT_2,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </td>
  );
}

const selectStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: `1px solid ${BORDER}`,
  borderRadius: 10,
  color: TEXT,
  fontSize: 13,
  padding: "8px 12px",
  outline: "none",
};

const linkBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: INFO,
  fontSize: 12,
  cursor: "pointer",
  padding: 0,
  borderBottom: `1px dashed ${INFO}`,
};
