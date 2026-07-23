// Pure aggregation + signal logic for the /admin-report page.
// No React / recharts imports so it stays unit-testable in isolation.
import type { ReportOrder, ReportLine } from "@/lib/report.functions";

export type Granularity = "day" | "week" | "month";

export const BUNDLE_ORDER = [
  "frameid_solo_onetime",
  "frameid_duo_onetime",
  "frameid_family_onetime",
] as const;

export const BUNDLE_LABELS: Record<string, string> = {
  frameid_solo_onetime: "Solo (1)",
  frameid_duo_onetime: "Duo (2)",
  frameid_family_onetime: "Family (5)",
};
// Categorical trio (dataviz slots 1-3, dark): blue / orange / aqua.
export const BUNDLE_COLORS: Record<string, string> = {
  frameid_solo_onetime: "#3987e5",
  frameid_duo_onetime: "#d95926",
  frameid_family_onetime: "#199e70",
};
export function bundleLabel(key: string) {
  return BUNDLE_LABELS[key] ?? key;
}

export const REFERRAL_LABELS: Record<string, string> = {
  bike_shop: "Fietswinkel",
  friend_family: "Vriend / familie",
  social: "Social media",
  search: "Google / zoekmachine",
  ai: "AI (ChatGPT, ...)",
  insurance: "Verzekering",
  roadside: "Pechhulp",
  other: "Anders",
  __unknown: "Niet opgegeven",
};

/* ---------------- time bucketing ---------------- */
function pad2(n: number) {
  return String(n).padStart(2, "0");
}

// ISO-week number + ISO week-year.
export function isoWeek(d: Date): { year: number; week: number } {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7; // Mon=1..Sun=7
  date.setUTCDate(date.getUTCDate() + 4 - day); // nearest Thursday
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: date.getUTCFullYear(), week };
}

const MONTHS_NL = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

export function bucketOf(dateStr: string, g: Granularity): { key: string; label: string } {
  const d = new Date(dateStr);
  if (g === "day") {
    const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    return { key, label: `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}` };
  }
  if (g === "month") {
    const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
    return { key, label: `${MONTHS_NL[d.getMonth()]} '${pad2(d.getFullYear() % 100)}` };
  }
  const { year, week } = isoWeek(d);
  const key = `${year}-W${pad2(week)}`;
  return { key, label: `wk ${week}` };
}

// Ordered, gap-filled bucket list across [min,max].
export function buildBuckets(min: Date, max: Date, g: Granularity): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  const seen = new Set<string>();
  const cur = new Date(min.getFullYear(), min.getMonth(), min.getDate());
  const end = new Date(max.getFullYear(), max.getMonth(), max.getDate());
  let guard = 0;
  while (cur <= end && guard < 4000) {
    guard++;
    const b = bucketOf(cur.toISOString(), g);
    if (!seen.has(b.key)) {
      seen.add(b.key);
      out.push(b);
    }
    if (g === "day") cur.setDate(cur.getDate() + 1);
    else if (g === "week") cur.setDate(cur.getDate() + 7);
    else cur.setMonth(cur.getMonth() + 1);
  }
  return out;
}

/* ---------------- significance (two-proportion z-test) ---------------- */
export type ZTestResult = {
  pA: number; // conversion rate A (0..1)
  pB: number; // conversion rate B (0..1)
  diffPp: number; // (pB - pA) in percentage points
  z: number;
  p: number; // two-tailed p-value
  significant: boolean; // p < 0.05 AND enough data
  enoughData: boolean;
};

// Abramowitz & Stegun 7.1.26 approximation of the error function.
function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x);
  return x >= 0 ? y : -y;
}
function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

// Two-proportion z-test comparing conversion of B (xB/nB) vs A (xA/nA).
// x = conversions (orders), n = visitors. Returns null if a group has no visitors.
export function twoProportionZTest(
  xA: number,
  nA: number,
  xB: number,
  nB: number,
): ZTestResult | null {
  if (nA <= 0 || nB <= 0) return null;
  const pA = xA / nA;
  const pB = xB / nB;
  // Guard against the normal approximation on tiny samples.
  const enoughData = nA >= 30 && nB >= 30 && xA + xB >= 10;
  const pool = (xA + xB) / (nA + nB);
  const se = Math.sqrt(pool * (1 - pool) * (1 / nA + 1 / nB));
  if (se === 0) {
    return { pA, pB, diffPp: (pB - pA) * 100, z: 0, p: 1, significant: false, enoughData };
  }
  const z = (pB - pA) / se;
  const p = 2 * (1 - normalCdf(Math.abs(z)));
  return { pA, pB, diffPp: (pB - pA) * 100, z, p, significant: enoughData && p < 0.05, enoughData };
}

/* ---------------- signals ---------------- */
export type Signal = { tone: "positive" | "warning" | "info"; title: string; body: string };

export function computeSignals(
  orders: ReportOrder[],
  linesByOrder: Map<string, ReportLine[]>,
  nowMs?: number,
): Signal[] {
  if (!orders.length) return [];
  const now = nowMs ?? Date.now();
  const DAY = 86400000;
  const recentFrom = now - 30 * DAY;
  const prevFrom = now - 60 * DAY;

  const recent = orders.filter((o) => new Date(o.created_at).getTime() >= recentFrom);
  const prev = orders.filter((o) => {
    const t = new Date(o.created_at).getTime();
    return t >= prevFrom && t < recentFrom;
  });

  const out: Signal[] = [];
  const pct = (a: number, b: number) => (b === 0 ? (a > 0 ? 100 : 0) : ((a - b) / b) * 100);

  // Overall order volume trend
  if (prev.length > 0 || recent.length > 0) {
    const change = pct(recent.length, prev.length);
    if (prev.length === 0 && recent.length > 0) {
      out.push({
        tone: "info",
        title: "Nog geen vergelijkingsbasis",
        body: `${recent.length} bestelling(en) in de laatste 30 dagen, maar geen data in de 30 dagen ervoor om tegen af te zetten.`,
      });
    } else if (change <= -20) {
      out.push({
        tone: "warning",
        title: `Bestellingen dalen (${change.toFixed(0)}%)`,
        body: `${recent.length} in de laatste 30 dagen t.o.v. ${prev.length} ervoor. Overweeg bijsturing in marketing of aanbod.`,
      });
    } else if (change >= 20) {
      out.push({
        tone: "positive",
        title: `Bestellingen groeien (+${change.toFixed(0)}%)`,
        body: `${recent.length} in de laatste 30 dagen t.o.v. ${prev.length} ervoor. Goede momentum.`,
      });
    } else {
      out.push({
        tone: "info",
        title: "Stabiel volume",
        body: `${recent.length} bestellingen in de laatste 30 dagen (${change >= 0 ? "+" : ""}${change.toFixed(0)}% t.o.v. de periode ervoor).`,
      });
    }
  }

  // Low-volume caveat
  if (recent.length > 0 && recent.length < 10) {
    out.push({
      tone: "info",
      title: "Beperkt volume",
      body: `Met ${recent.length} recente bestelling(en) zijn trends gevoelig voor toeval. Interpreteer signalen voorzichtig.`,
    });
  }

  // Per-bundle unit trend
  const unitsBy = (list: ReportOrder[]) => {
    const m = new Map<string, number>();
    for (const o of list)
      for (const l of linesByOrder.get(o.id) ?? [])
        m.set(l.bundle_key, (m.get(l.bundle_key) ?? 0) + (l.quantity || 0));
    return m;
  };
  const rUnits = unitsBy(recent);
  const pUnits = unitsBy(prev);
  for (const k of BUNDLE_ORDER) {
    const r = rUnits.get(k) ?? 0;
    const p = pUnits.get(k) ?? 0;
    if (p >= 3 && r < p) {
      const change = pct(r, p);
      if (change <= -30) {
        out.push({
          tone: "warning",
          title: `${bundleLabel(k)} verliest terrein (${change.toFixed(0)}%)`,
          body: `${r} verkocht in de laatste 30 dagen t.o.v. ${p} ervoor. Bekijk prijs, positionering of promotie van deze bundel.`,
        });
      }
    } else if (r >= 3 && r > p) {
      const change = pct(r, p);
      if (change >= 40) {
        out.push({
          tone: "positive",
          title: `${bundleLabel(k)} in de lift (+${change.toFixed(0)}%)`,
          body: `${r} verkocht in de laatste 30 dagen t.o.v. ${p} ervoor.`,
        });
      }
    }
  }

  // Bundle mix advice
  const totalUnits = Array.from(rUnits.values()).reduce((s, v) => s + v, 0);
  if (totalUnits >= 8) {
    const solo = rUnits.get("frameid_solo_onetime") ?? 0;
    const duo = rUnits.get("frameid_duo_onetime") ?? 0;
    const family = rUnits.get("frameid_family_onetime") ?? 0;
    const multiShare = ((duo + family) / totalUnits) * 100;
    if (multiShare < 30) {
      out.push({
        tone: "info",
        title: "Vooral losse bundels",
        body: `Slechts ${multiShare.toFixed(0)}% van de recente bundels zijn duo of family. Een duidelijker prijsvoordeel of upsell bij checkout kan de gemiddelde orderwaarde verhogen.`,
      });
    }
    if (solo > 0 && duo > 0 && duo < solo * 0.5) {
      out.push({
        tone: "info",
        title: "Duo (aanbevolen bundel) blijft achter",
        body: `De duo-bundel is gemarkeerd als aanrader, maar verkoopt minder dan de helft van solo. Overweeg de duo-bundel prominenter te tonen.`,
      });
    }
  }

  // Referral data-quality + concentration
  if (recent.length >= 8) {
    const refCount = new Map<string, number>();
    for (const o of recent) {
      const key = o.referral_source && o.referral_source !== "" ? o.referral_source : "__unknown";
      refCount.set(key, (refCount.get(key) ?? 0) + 1);
    }
    const unknown = refCount.get("__unknown") ?? 0;
    const unknownShare = (unknown / recent.length) * 100;
    if (unknownShare > 40) {
      out.push({
        tone: "warning",
        title: "Veel bestellingen zonder herkomst",
        body: `${unknownShare.toFixed(0)}% van de recente bestellingen heeft geen 'hoe gevonden' ingevuld. Overweeg dit veld verplicht(er) te maken voor beter inzicht.`,
      });
    }
    let topKey = "";
    let topVal = 0;
    for (const [k, v] of refCount) {
      if (k === "__unknown") continue;
      if (v > topVal) {
        topVal = v;
        topKey = k;
      }
    }
    if (topKey) {
      const topShare = (topVal / recent.length) * 100;
      out.push({
        tone: "info",
        title: `Grootste kanaal: ${REFERRAL_LABELS[topKey] ?? topKey}`,
        body: `${topShare.toFixed(0)}% van de recente bestellingen komt via ${(REFERRAL_LABELS[topKey] ?? topKey).toLowerCase()}.${topShare > 55 ? " Sterke afhankelijkheid van een enkel kanaal; spreiding verlaagt risico." : ""}`,
      });
    }
  }

  return out;
}
