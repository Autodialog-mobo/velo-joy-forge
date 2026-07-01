import { createFileRoute, notFound } from "@tanstack/react-router";
import { BUNDLES } from "@/routes/$lang/order";
import { VAT_RATE } from "@/lib/shipping";

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
        width="28"
        height="28"
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
      <span style={styles.logoWord}>velopass</span>
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
      <div style={styles.container}>
        <header style={styles.header}>
          <VelopassLogo />
          <div style={styles.dateLine}>
            Opgemaakt op <strong>{createdOn}</strong> · Geldig tot{" "}
            <strong>{validUntil}</strong>
          </div>
        </header>

        <h1 style={styles.h1}>Marge­toelichting Frame-ID</h1>
        <p style={styles.lede}>
          Een transparant overzicht van de Frame-ID bundels zoals ze op de
          Velopass-webshop staan, en de marge die je als vakhandel per bundel
          realiseert. Alle marges zijn berekend excl. btw, op basis van een
          inkoopprijs van <strong>{eur(PURCHASE_PRICE_EXCL_VAT_CENTS)}</strong>{" "}
          per Frame-ID.
        </p>

        <section style={styles.section}>
          <h2 style={styles.h2}>De bundels in één oogopslag</h2>
          <div style={styles.grid}>
            {rows.map((r) => (
              <BundleCard
                key={r.key}
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
          <p style={styles.small}>
            Verkoopprijs = vaste adviesprijs aan de eindklant (incl. 21% btw).
            Marge berekend als (verkoopprijs excl. btw −{" "}
            {eur(PURCHASE_PRICE_EXCL_VAT_CENTS)} inkoop) × aantal Frame-ID's.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>Waarom deze marge werkt</h2>
          <ul style={styles.list}>
            <li>
              <strong>Vaste verkoopprijs.</strong> Elke Frame-ID heeft één
              publieksprijs — geen prijsverwarring, geen onderbieding tussen
              vakhandels.
            </li>
            <li>
              <strong>Snelle omloop.</strong> De Frame-ID wordt aan de kassa
              of bij aflevering geplaatst in minder dan twee minuten.
            </li>
            <li>
              <strong>Herhaalaankoop.</strong> Elke nieuwe fiets, elke
              tweedehandsdoorverkoop is een nieuwe Frame-ID — terugkerende
              omzet op je bestaande klanten.
            </li>
            <li>
              <strong>Geen voorraadrisico.</strong> Bundels zijn onbeperkt
              houdbaar en nemen amper plaats in.
            </li>
          </ul>
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
      style={{
        ...styles.card,
        ...(props.featured ? styles.cardFeatured : null),
      }}
    >
      {props.featured && <div style={styles.badge}>Meest gekozen</div>}
      <div style={styles.cardSize}>{props.title}</div>
      <div style={styles.cardQty}>{props.qty}</div>
      <div style={styles.cardRow}>
        <span>Verkoopprijs incl. btw</span>
        <span>{props.priceIncl}</span>
      </div>
      <div style={styles.cardRow}>
        <span>Verkoopprijs excl. btw</span>
        <span>{props.priceExcl}</span>
      </div>
      <div style={styles.cardMarginBlock}>
        <div style={styles.cardMarginLabel}>Jouw marge</div>
        <div style={styles.cardMarginValue}>{props.margin}</div>
        <div style={styles.cardMarginSub}>{props.pct} van verkoopprijs excl. btw</div>
      </div>
      <div style={styles.cardPerUnit}>{props.perUnit}</div>
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
    padding: "48px 20px 80px",
  },
  container: { maxWidth: 880, margin: "0 auto" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 48,
    paddingBottom: 20,
    borderBottom: `1px solid ${BORDER}`,
    flexWrap: "wrap",
    gap: 12,
  },
  logo: { display: "flex", alignItems: "center", gap: 10 },
  logoWord: {
    fontFamily: "'Syne', 'DM Sans', sans-serif",
    fontWeight: 800,
    fontSize: 22,
    letterSpacing: -0.5,
    color: NACHT,
  },
  dateLine: { fontSize: 13, color: MUTED },
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
    fontFamily: "'Syne', sans-serif",
    fontSize: 28,
    fontWeight: 800,
    color: GROEN,
    lineHeight: 1,
  },
  cardMarginSub: { fontSize: 12, color: MUTED, marginTop: 4 },
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
  link: { color: NACHT, textDecoration: "underline" },
};
