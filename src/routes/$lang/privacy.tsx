import { createFileRoute } from "@tanstack/react-router";
import { useCurrentLang } from "@/i18n/useCurrentLang";
import { Footer } from "@/components/Footer";
import { buildLocalizedHead } from "@/i18n/seo";

export const Route = createFileRoute("/$lang/privacy")({
  component: PrivacyPage,
  head: ({ params }) =>
    buildLocalizedHead({
      lang: params.lang,
      path: "privacy",
      title: "Privacybeleid — Velopass",
      description: "Lees hoe Velopass je persoonsgegevens verwerkt en beschermt.",
    }),
});

function PrivacyPage() {
  const lang = useCurrentLang();
  return (
    <>
      <main
        style={{
          maxWidth: 800,
          margin: "0 auto",
          padding: "120px 6vw 80px",
          minHeight: "100vh",
        }}
      >
        <p
          style={{
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "1.2px",
            textTransform: "uppercase",
            color: "var(--green)",
            marginBottom: 14,
          }}
        >
          Privacybeleid
        </p>
        <h1
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(28px, 3.5vw, 42px)",
            lineHeight: 1.1,
            letterSpacing: "-1px",
            color: "var(--navy)",
            marginBottom: 16,
          }}
        >
          Hoe we je gegevens beschermen
        </h1>
        <p
          style={{
            fontSize: 16,
            color: "var(--text-muted)",
            lineHeight: 1.65,
            marginBottom: 48,
          }}
        >
          Laatst bijgewerkt: 17 mei 2026
        </p>

        <Section title="1. Wie zijn we?">
          Velopass BV, gevestigd aan Stokerijstraat 29/bus a1, 2110 Wijnegem,
          BTW BE0777.359.681, is de verantwoordelijke voor de verwerking van
          je persoonsgegevens via deze website en de Velopass-diensten.
        </Section>

        <Section title="2. Welke gegevens verzamelen we?">
          We verzamelen enkel gegevens die noodzakelijk zijn voor onze dienst:
          <ul style={ulStyle}>
            <li>Naam en contactgegevens (e-mail, telefoon)</li>
            <li>Fietsgegevens (frame-ID, merk, model, foto)</li>
            <li>Accountinformatie en loginhistoriek</li>
            <li>Gebruiksgegevens en interacties met onze dienst</li>
          </ul>
        </Section>

        <Section title="3. Waarvoor gebruiken we je gegevens?">
          Je gegevens worden gebruikt voor:
          <ul style={ulStyle}>
            <li>Het aanmaken en beheren van je Velopass-account</li>
            <li>Fietsregistratie en eigendomsverificatie</li>
            <li>Klantenservice en communicatie</li>
            <li>Statistische analyses om onze dienst te verbeteren</li>
          </ul>
        </Section>

        <Section title="4. Cookies">
          Onze website maakt gebruik van cookies:
          <ul style={ulStyle}>
            <li>
              <strong>Functionele cookies:</strong> noodzakelijk voor het
              correct werken van de website (bijv. sessiebeheer).
            </li>
            <li>
              <strong>Analytische cookies:</strong> helpen ons begrijpen hoe
              bezoekers onze website gebruiken. Deze worden enkel geplaatst
              nadat je toestemming hebt gegeven.
            </li>
          </ul>
          Je kunt je cookievoorkeuren op elk moment aanpassen via de banner
          onderaan de pagina.
        </Section>

        <Section title="5. Hoe lang bewaren we je gegevens?">
          We bewaren je persoonsgegevens niet langer dan nodig is voor het
          doel waarvoor ze zijn verzameld, tenzij een langere bewaartermijn
          wettelijk verplicht is. Fietsregistratiegegevens worden bewaard
          zolang je account actief is.
        </Section>

        <Section title="6. Je rechten">
          Je hebt het recht om:
          <ul style={ulStyle}>
            <li>Je gegevens in te kijken</li>
            <li>Je gegevens te laten corrigeren of verwijderen</li>
            <li>De verwerking te laten beperken</li>
            <li>Bezwaar te maken tegen verwerking</li>
            <li>Je gegevens over te dragen</li>
          </ul>
          Contacteer ons via{" "}
          <a
            href="mailto:privacy@velopass.com"
            style={{ color: "var(--green)", textDecoration: "underline" }}
          >
            privacy@velopass.com
          </a>{" "}
          om deze rechten uit te oefenen.
        </Section>

        <Section title="7. Beveiliging">
          We nemen passende technische en organisatorische maatregelen om je
          gegevens te beschermen tegen ongeoorloofde toegang, verlies of
          diefstal, waaronder encryptie, toegangscontrole en regelmatige
          beveiligingsaudits.
        </Section>

        <Section title="8. Contact">
          Vragen over dit privacybeleid? Mail naar{" "}
          <a
            href="mailto:privacy@velopass.com"
            style={{ color: "var(--green)", textDecoration: "underline" }}
          >
            privacy@velopass.com
          </a>{" "}
          of gebruik ons{" "}
          <a
            href={`/${lang}/contact`}
            style={{ color: "var(--green)", textDecoration: "underline" }}
          >
            contactformulier
          </a>.
        </Section>
      </main>
      <Footer />
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2
        style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: 18,
          fontWeight: 700,
          color: "var(--navy)",
          marginBottom: 12,
          letterSpacing: "-0.2px",
        }}
      >
        {title}
      </h2>
      <div
        style={{
          fontSize: 15,
          color: "var(--text-mid)",
          lineHeight: 1.7,
        }}
      >
        {children}
      </div>
    </section>
  );
}

const ulStyle: React.CSSProperties = {
  listStyle: "disc",
  paddingLeft: 20,
  marginTop: 10,
  marginBottom: 10,
  display: "flex",
  flexDirection: "column",
  gap: 6,
};
