import { createFileRoute, notFound } from "@tanstack/react-router";

// =============================================================
// Margetoelichting — private, unlisted page for shops
// -------------------------------------------------------------
// URL: /m/AJZkAqItiw4HN9Gq1ahkLJOaB9dc3WjOmmsCsKh6hds
// Reachable ONLY via direct link in email. Not in sitemap,
// not in nav, noindex/nofollow, disallowed in robots.txt.
// =============================================================

// --- Edit these two dates in one place -----------------------
// Format: [dag, maand (1-12), jaar]
const CREATED_ON: [number, number, number] = [1, 7, 2026];
const VALID_UNTIL: [number, number, number] = [30, 9, 2026];
// -------------------------------------------------------------

const TOKEN = "AJZkAqItiw4HN9Gq1ahkLJOaB9dc3WjOmmsCsKh6hds";

const MONTHS_NL = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

function formatDate([d, m, y]: [number, number, number]) {
  return `${d} ${MONTHS_NL[m - 1]} ${y}`;
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

function MargePage() {
  const createdOn = formatDate(CREATED_ON);
  const validUntil = formatDate(VALID_UNTIL);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.brand}>VELOPASS</div>
          <div style={styles.dateLine}>
            Opgemaakt op <strong>{createdOn}</strong> · Geldig tot{" "}
            <strong>{validUntil}</strong>
          </div>
        </header>

        <h1 style={styles.h1}>Marge­toelichting Frame-ID</h1>
        <p style={styles.lede}>
          Een duidelijk overzicht van de Frame-ID bundels, de vaste
          verkoopprijs en de marge die je als vakhandel realiseert per bundel.
        </p>

        <section style={styles.section}>
          <h2 style={styles.h2}>De bundels in één oogopslag</h2>
          <div style={styles.grid}>
            <BundleCard
              size="Starter"
              qty="10 Frame-ID's"
              cost="€ 79"
              price="€ 149"
              margin="€ 70"
              perUnit="€ 7,00 marge / Frame-ID"
              pct="47%"
            />
            <BundleCard
              size="Standaard"
              qty="25 Frame-ID's"
              cost="€ 175"
              price="€ 349"
              margin="€ 174"
              perUnit="€ 6,96 marge / Frame-ID"
              pct="50%"
              featured
            />
            <BundleCard
              size="Pro"
              qty="50 Frame-ID's"
              cost="€ 325"
              price="€ 675"
              margin="€ 350"
              perUnit="€ 7,00 marge / Frame-ID"
              pct="52%"
            />
          </div>
          <p style={styles.small}>
            Alle bedragen exclusief btw. Verkoopprijs = adviesprijs aan de
            eindklant, vast per bundel.
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
              <strong>Geen voorraadrisico.</strong> Bundels zijn
              onbeperkt houdbaar en nemen amper plaats in.
            </li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>Rekenvoorbeeld</h2>
          <div style={styles.example}>
            <p style={styles.exampleLine}>
              Een vakhandel die <strong>1 Standaard-bundel per maand</strong>{" "}
              verkoopt, realiseert:
            </p>
            <div style={styles.exampleFigures}>
              <Figure label="Marge / maand" value="€ 174" />
              <Figure label="Marge / jaar" value="€ 2.088" />
              <Figure label="Frame-ID's / jaar" value="300" />
            </div>
          </div>
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
  size: string;
  qty: string;
  cost: string;
  price: string;
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
      <div style={styles.cardSize}>{props.size}</div>
      <div style={styles.cardQty}>{props.qty}</div>
      <div style={styles.cardRow}>
        <span>Inkoop</span>
        <span>{props.cost}</span>
      </div>
      <div style={styles.cardRow}>
        <span>Verkoopprijs</span>
        <span>{props.price}</span>
      </div>
      <div style={styles.cardMarginBlock}>
        <div style={styles.cardMarginValue}>{props.margin}</div>
        <div style={styles.cardMarginLabel}>marge per bundel · {props.pct}</div>
      </div>
      <div style={styles.cardPerUnit}>{props.perUnit}</div>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.figure}>
      <div style={styles.figureValue}>{value}</div>
      <div style={styles.figureLabel}>{label}</div>
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
  brand: {
    fontFamily: "'Syne', 'DM Sans', sans-serif",
    fontWeight: 800,
    letterSpacing: 2,
    fontSize: 18,
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
  cardMarginValue: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 28,
    fontWeight: 800,
    color: GROEN,
    lineHeight: 1,
  },
  cardMarginLabel: { fontSize: 12, color: MUTED, marginTop: 4 },
  cardPerUnit: { fontSize: 12, color: MUTED, marginTop: 8 },
  list: { margin: 0, paddingLeft: 20, lineHeight: 1.7, fontSize: 16 },
  example: {
    background: "#fff",
    border: `1px solid ${BORDER}`,
    borderRadius: 14,
    padding: 24,
  },
  exampleLine: { margin: "0 0 20px", fontSize: 16 },
  exampleFigures: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 16,
  },
  figure: {
    borderLeft: `3px solid ${GROEN}`,
    paddingLeft: 12,
  },
  figureValue: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: 24,
    color: NACHT,
  },
  figureLabel: { fontSize: 12, color: MUTED, marginTop: 2 },
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
