import { createFileRoute, notFound } from "@tanstack/react-router";
import { BUNDLES } from "@/lib/bundles";

// =============================================================
// Margetoelichting — private, unlisted page for shops
// -------------------------------------------------------------
// URL: /m/AJZkAqItiw4HN9Gq1ahkLJOaB9dc3WjOmmsCsKh6hds
// Reachable ONLY via direct link in email. Not in sitemap,
// not in nav, noindex/nofollow, disallowed in robots.txt.
// =============================================================

// --- Editable config -----------------------------------------
// Format: [dag, maand (1-12), jaar]
const CREATED_ON: [number, number, number] = [1, 7, 2026];
const VALID_UNTIL: [number, number, number] = [30, 9, 2026];

// Purchase price the shop pays per Frame-ID (excl. VAT), in cents.
// Update this single value if the wholesale price changes.
const PURCHASE_PRICE_EXCL_VAT_CENTS = 350; // €3,50 excl. btw

// BE-btw-tarief gebruikt om verkoopprijzen (incl. btw) op de order-pagina
// om te rekenen naar excl. btw voor een eerlijke margeberekening.
const VAT_RATE = 0.21;
// -------------------------------------------------------------

const TOKEN = "AJZkAqItiw4HN9Gq1ahkLJOaB9dc3WjOmmsCsKh6hds";

const MONTHS_NL = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

function formatDate([d, m, y]: [number, number, number]) {
  return `${d} ${MONTHS_NL[m - 1]} ${y}`;
}

const eur = (cents: number) =>
  new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);

/** Strip VAT from a VAT-inclusive amount (cents), rounded to cents. */
function exclVat(inclCents: number): number {
  return Math.round(inclCents / (1 + VAT_RATE));
}

export const Route = createFileRoute("/m/$token")({
  ssr: false,
  beforeLoad: ({ params }) => {
    if (params.token !== TOKEN) throw notFound();
  },
  head: () => ({
    meta: [
      { title: "Margetoelichting — Velopass" },
      { name: "robots", content: "noindex, nofollow, noarchive, nosnippet" },
      { name: "googlebot", content: "noindex, nofollow" },
    ],
  }),
  component: MargePage,
});

function VelopassLogo() {
  return (
    <div style={styles.logo}>
      <svg
        width="32"
        height="32"
        viewBox="0 0 100 100"
        aria-hidden="true"
        style={{ display: "block" }}
      >
        <rect width="100" height="100" rx="22" fill="#2ECC8A" />
        <path
          d="M24 54 L42 72 L76 30"
          fill="none"
          stroke="#0D1F3C"
          strokeWidth="11"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span style={styles.logoWord}>
        velopass<span style={styles.logoPro}>pro</span>
      </span>
    </div>
  );
}

function MargePage() {
  const createdOn = formatDate(CREATED_ON);
  const validUntil = formatDate(VALID_UNTIL);

  const rows = BUNDLES.map((b) => {
    const totalExcl = exclVat(b.price);
    const perUnitExcl = totalExcl / b.stickers;
    const purchaseTotal = PURCHASE_PRICE_EXCL_VAT_CENTS * b.stickers;
    const marginTotal = totalExcl - purchaseTotal;
    const marginPerUnit = marginTotal / b.stickers;
    const pct = Math.round((marginTotal / totalExcl) * 100);
    return {
      key: b.key,
      stickers: b.stickers,
      priceIncl: b.price,
      priceExcl: totalExcl,
      perUnitExcl,
      marginTotal,
      marginPerUnit,
      pct,
      featured: !!b.featured,
    };
  });

  return (
    <div style={styles.page}>
      <header style={styles.topBar}>
        <div style={styles.topBarInner}>
          <VelopassLogo />
          <div style={styles.dateLine}>
            Opgemaakt op <strong>{createdOn}</strong> · Geldig tot{" "}
            <strong>{validUntil}</strong>
          </div>
        </div>
      </header>
      <div style={styles.container}>

        <h1 style={styles.h1}>Marge­toelichting Frame-ID</h1>
        <p style={styles.lede}>
          Een transparant overzicht van de Frame-ID bundels zoals ze op de
          Velopass-webshop staan, en de marge die je als vakhandel per bundel
          realiseert. Alle marges zijn berekend excl. btw ({Math.round(VAT_RATE * 100)}%),
          op basis van een inkoopprijs van{" "}
          <strong>{eur(PURCHASE_PRICE_EXCL_VAT_CENTS)}</strong> per Frame-ID.
        </p>

        <div style={styles.notice}>
          <strong>Belangrijk:</strong> de marges hieronder gelden voor de
          Frame-ID <em>zonder plaatsing door de winkel</em>. De prijs voor het
          aanbrengen van de Frame-ID op de fiets bepaal je zelf en komt bovenop
          de hier getoonde productmarge.
        </div>

        <section style={styles.section}>
          <h2 style={styles.h2}>Waarom het werkt</h2>
          <ul style={styles.list}>
            <li>
              <strong>Je klant blijft je klant.</strong> De Frame-ID bindt je
              klant aan jouw winkel: hij komt terug voor onderhoud, herstelling
              en zijn volgende fiets. Je verdient niet in de eerste plaats aan
              de Frame-ID zelf — je verdient aan de klant die blijft. Elke
              Frame-ID die je meegeeft, is een klant die je vasthoudt.
            </li>
            <li>
              <strong>Snelle omloop.</strong> Aan de kassa neemt de klant de
              Frame-ID zelf uit het display. Geen verkoopgesprek nodig, geen
              moeite — het is een impulsartikel dat vlot meegaat met elke
              fiets.
            </li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>De bundels in één oogopslag</h2>
          <div style={styles.grid}>
            {rows.map((r) => (
              <BundleCard
                key={r.key}
                bundleKey={r.key}
                stickers={r.stickers}
                marginCents={r.marginTotal}
                marginPerUnitCents={Math.round(r.marginPerUnit)}
                priceInclCents={r.priceIncl}
                priceExclCents={r.priceExcl}
                pctNum={r.pct}
                title={`${r.stickers}-pack`}
                qty={`${r.stickers} Frame-ID${r.stickers > 1 ? "'s" : ""}`}
                priceIncl={eur(r.priceIncl)}
                priceExcl={eur(r.priceExcl)}
                margin={eur(r.marginTotal)}
                perUnit={`${eur(r.marginPerUnit)} marge / Frame-ID`}
                pct={`${r.pct}%`}
                featured={r.featured}
              />
            ))}
          </div>
          <p style={styles.framing} data-testid="framing">
            De marge op de Frame-ID is mooi meegenomen. Maar de echte winst
            zit in de klant die terugkomt — voor alles wat daarna volgt.
          </p>
          <p style={styles.small}>
            Verkoopprijs = vaste adviesprijs aan de eindklant (incl.{" "}
            {Math.round(VAT_RATE * 100)}% btw). Marge berekend als
            (verkoopprijs ÷ {(1 + VAT_RATE).toFixed(2)} −{" "}
            {eur(PURCHASE_PRICE_EXCL_VAT_CENTS)} inkoop) × aantal Frame-ID's.
            Dit is de <strong>productmarge zonder plaatsing</strong>; een
            eventueel plaatsingstarief reken je apart aan.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>Bestellen &amp; leveren</h2>
          <p style={styles.p}>
            Bestellingen worden binnen <strong>2 werkdagen</strong> geleverd op
            het adres van de vakhandel. Facturatie verloopt via Velopass, met
            de standaard betaaltermijn van 30 dagen.
          </p>
        </section>

        <footer style={styles.footer}>
          <div>
            Vragen over deze toelichting? Neem contact op via{" "}
            <a href="mailto:support@velopass.com" style={styles.link}>
              support@velopass.com
            </a>
            .
          </div>
          <div style={styles.footerDates}>
            Opgemaakt op {createdOn} · Geldig tot {validUntil}
          </div>
        </footer>
      </div>
    </div>
  );
}

function BundleCard(props: {
  bundleKey: string;
  stickers: number;
  marginCents: number;
  marginPerUnitCents: number;
  priceInclCents: number;
  priceExclCents: number;
  pctNum: number;
  title: string;
  qty: string;
  priceIncl: string;
  priceExcl: string;
  margin: string;
  perUnit: string;
  pct: string;
  featured?: boolean;
}) {
  return (
    <div
      data-testid="bundle-card"
      data-bundle-key={props.bundleKey}
      data-stickers={props.stickers}
      data-margin-cents={props.marginCents}
      data-margin-per-unit-cents={props.marginPerUnitCents}
      data-price-incl-cents={props.priceInclCents}
      data-price-excl-cents={props.priceExclCents}
      data-pct={props.pctNum}
      style={{
        ...styles.card,
        ...(props.featured ? styles.cardFeatured : null),
      }}
    >
      {props.featured && <div style={styles.badge}>Meest gekozen</div>}
      <div style={styles.cardSize}>{props.title}</div>
      <div style={styles.cardQty}>{props.qty}</div>

      <div style={styles.cardPriceRow}>
        <div style={styles.cardPriceLabel}>Verkoopprijs incl. btw</div>
        <div style={styles.cardPriceValue} data-testid="price-incl">{props.priceIncl}</div>
      </div>

      <div style={styles.cardRow}>
        <span>Verkoopprijs excl. btw</span>
        <span data-testid="price-excl">{props.priceExcl}</span>
      </div>
      <div style={styles.cardMarginBlock}>
        <div style={styles.cardMarginLabel}>Jouw marge</div>
        <div style={styles.cardMarginValue} data-testid="margin-value">{props.margin}</div>
        <div style={styles.cardMarginSub} data-testid="margin-pct">{props.pct} van verkoopprijs excl. btw</div>
      </div>
      <div style={styles.cardPerUnit} data-testid="margin-per-unit">{props.perUnit}</div>
    </div>
  );
}

const NACHT = "#0D1F3C";
const GROEN = "#2ECC8A";
const OFFWHITE = "#F5F3EE";
const INK = "#0D1F3C";
const MUTED = "#5C6B84";
const BORDER = "#E4DFD4";

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: OFFWHITE,
    color: INK,
    fontFamily: "'DM Sans', system-ui, sans-serif",
    padding: "0 0 80px",
  },
  container: { maxWidth: 880, margin: "0 auto", padding: "0 20px" },
  topBar: {
    background: "rgba(13,31,60,0.97)",
    borderBottom: "1px solid rgba(46,204,138,0.15)",
    marginBottom: 48,
  },
  topBarInner: {
    maxWidth: 880,
    margin: "0 auto",
    padding: "16px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  logo: { display: "flex", alignItems: "center", gap: 10 },
  logoWord: {
    fontFamily: "'Syne', 'DM Sans', sans-serif",
    fontWeight: 700,
    fontSize: 17,
    letterSpacing: -0.3,
    color: "#fff",
  },
  logoPro: {
    fontSize: 10,
    fontWeight: 600,
    color: GROEN,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginLeft: 2,
    verticalAlign: "super",
  },
  dateLine: { fontSize: 13, color: "rgba(255,255,255,0.55)" },
  h1: {
    fontFamily: "'Syne', 'DM Sans', sans-serif",
    fontWeight: 800,
    fontSize: 40,
    lineHeight: 1.1,
    letterSpacing: -0.5,
    margin: "0 0 16px",
    color: NACHT,
  },
  lede: { fontSize: 18, lineHeight: 1.55, color: MUTED, margin: "0 0 40px", maxWidth: 640 },
  section: { marginBottom: 48 },
  h2: {
    fontFamily: "'Syne', 'DM Sans', sans-serif",
    fontWeight: 700,
    fontSize: 22,
    margin: "0 0 20px",
    color: NACHT,
  },
  p: { fontSize: 16, lineHeight: 1.65, margin: "0 0 12px" },
  small: { fontSize: 13, color: MUTED, marginTop: 16 },
  framing: {
    marginTop: 20,
    padding: "16px 20px",
    background: "#fff",
    borderLeft: `4px solid ${GROEN}`,
    borderRadius: 10,
    fontSize: 15,
    lineHeight: 1.55,
    color: INK,
    fontStyle: "italic",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
  },
  card: {
    background: "#fff",
    border: `1px solid ${BORDER}`,
    borderRadius: 14,
    padding: 24,
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  cardFeatured: {
    borderColor: GROEN,
    boxShadow: `0 0 0 3px ${GROEN}22`,
  },
  badge: {
    position: "absolute",
    top: -10,
    right: 16,
    background: GROEN,
    color: NACHT,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    padding: "4px 10px",
    borderRadius: 999,
  },
  cardSize: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 700,
    fontSize: 18,
    color: NACHT,
  },
  cardQty: { fontSize: 13, color: MUTED, marginBottom: 12 },
  cardRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 14,
    color: INK,
    padding: "4px 0",
  },
  cardMarginBlock: {
    marginTop: 12,
    padding: "14px 0 8px",
    borderTop: `1px dashed ${BORDER}`,
  },
  cardMarginLabel: {
    fontSize: 12,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cardMarginValue: {
    fontFamily: "'DM Sans', system-ui, sans-serif",
    fontSize: 28,
    fontWeight: 600,
    color: GROEN,
    lineHeight: 1,
  },
  cardMarginSub: { fontSize: 12, color: MUTED, marginTop: 4 },
  cardPriceRow: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    marginBottom: 8,
  },
  cardPriceLabel: {
    fontSize: 12,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: 600,
  },
  cardPriceValue: {
    fontFamily: "'DM Sans', system-ui, sans-serif",
    fontSize: 32,
    fontWeight: 700,
    color: NACHT,
    lineHeight: 1.1,
    letterSpacing: -0.5,
  },
  cardPerUnit: { fontSize: 12, color: MUTED, marginTop: 8 },
  list: { margin: 0, paddingLeft: 20, lineHeight: 1.7, fontSize: 16 },
  footer: {
    marginTop: 64,
    paddingTop: 20,
    borderTop: `1px solid ${BORDER}`,
    fontSize: 13,
    color: MUTED,
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
  },
  footerDates: { color: MUTED },
  notice: {
    background: "#fff",
    border: `1px solid ${BORDER}`,
    borderLeft: `4px solid ${GROEN}`,
    borderRadius: 10,
    padding: "14px 18px",
    fontSize: 14,
    lineHeight: 1.55,
    color: INK,
    marginBottom: 40,
  },
  link: { color: NACHT, textDecoration: "underline" },
};
