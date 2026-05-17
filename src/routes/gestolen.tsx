import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  ArrowLeft,
  CheckCircle2,
  CheckSquare,
  Lightbulb,
  ExternalLink,
  Search,
} from "lucide-react";
import { VelopassMark } from "@/components/VelopassMark";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/gestolen")({
  head: () => ({
    meta: [
      { title: "Fiets gestolen? Doe snel aangifte — Velopass" },
      {
        name: "description",
        content:
          "Stappenplan na fietsdiefstal: meld je fiets in je Velopass, doe online aangifte via Police-on-web en activeer de Velopass Community.",
      },
      { property: "og:title", content: "Fiets gestolen? Doe snel aangifte — Velopass" },
      {
        property: "og:description",
        content:
          "Met Velopass heb je alle fietsgegevens bij de hand om snel online aangifte te doen via Police-on-web.",
      },
    ],
  }),
  component: GestolenPage,
});

const APP_LOGIN = "https://app.velopass.com/login";

const NAVY = "#0D1F3C";
const GREEN = "#2ECC8A";
const MUTED = "#5A7090";

const sectionStyle: React.CSSProperties = {
  maxWidth: 880,
  margin: "0 auto",
  padding: "0 6vw",
};

const h2Style: React.CSSProperties = {
  fontFamily: "'Syne', sans-serif",
  fontWeight: 700,
  fontSize: "clamp(24px, 3vw, 32px)",
  color: NAVY,
  letterSpacing: "-0.5px",
  lineHeight: 1.15,
  marginBottom: 14,
};

const bodyStyle: React.CSSProperties = {
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 16,
  lineHeight: 1.65,
  color: MUTED,
};

const navyBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  background: NAVY,
  color: "#F5F3EE",
  padding: "12px 22px",
  borderRadius: 10,
  fontFamily: "'DM Sans', sans-serif",
  fontWeight: 500,
  fontSize: 14,
  textDecoration: "none",
  border: "none",
  cursor: "pointer",
};

const cardStyle: React.CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid rgba(13,31,60,0.1)",
  borderRadius: 16,
  padding: "28px 28px",
};

function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        background: `${color}1F`,
        color,
        border: `1px solid ${color}55`,
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 600,
        fontSize: 11,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        padding: "4px 10px",
        borderRadius: 100,
      }}
    >
      {label}
    </span>
  );
}

function GestolenPage() {
  const [navOpen, setNavOpen] = useState(false);
  const [country, setCountry] = useState<"BE" | "NL" | "FR">("BE");

  const policeChecklist: Array<{ text: string; velopass?: string }> = [
    { text: "Je identiteitskaart (eID) of de itsme-app" },
    { text: "Merk, model, kleur en type fiets", velopass: "Al beschikbaar in je Velopass" },
    { text: "Het framenummer", velopass: "Al beschikbaar in je Velopass" },
    { text: "Graveernummer of fietspas", velopass: "Je Velopass-code volstaat" },
    { text: "Exacte locatie, datum en uur van de diefstal" },
    { text: "Foto's van de fiets", velopass: "Al opgeslagen in je Velopass" },
    { text: "Aankoopfactuur (indien beschikbaar)", velopass: "Gekoppeld aan je Velopass" },
  ];

  const policeSteps: Array<{ title: string; body: React.ReactNode; tip?: string; link?: string }> = [
    {
      title: "Surf naar police-on-web.be",
      body: (
        <a
          href="https://www.police-on-web.be"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: GREEN, textDecoration: "underline", textUnderlineOffset: 3, display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          www.police-on-web.be <ExternalLink size={14} strokeWidth={2} />
        </a>
      ),
    },
    {
      title: "Start een nieuwe aangifte",
      body: <>Klik op <strong style={{ color: NAVY }}>'Nieuwe aangifte starten'</strong> en kies <strong style={{ color: NAVY }}>'Fietsdiefstal'</strong>.</>,
    },
    {
      title: "Meld je aan via CSAM",
      body: <>Identificeer je met je eID-kaartlezer of de itsme-app.</>,
    },
    {
      title: "Vul het formulier in",
      body: (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
          <li>• Persoonsgegevens als eigenaar/aangever</li>
          <li>• Feiten: waar en wanneer gestolen?</li>
          <li>• Voorwerp: alle details van de fiets (hoe meer details, hoe groter de kans op terugvinden)</li>
        </ul>
      ),
      tip: "Open je Velopass om alle fietsgegevens in één oogopslag bij de hand te hebben.",
    },
    {
      title: "Controleer en verzend",
      body: <>Controleer de gegevens en klik op <strong style={{ color: NAVY }}>Verzenden</strong>.</>,
    },
  ];

  return (
    <>
      <div className={`nav-backdrop${navOpen ? " open" : ""}`} onClick={() => setNavOpen(false)} aria-hidden="true" />
      <nav className="vp-nav">
        <Link to="/" className="nav-logo">
          <div className="logo-mark"><VelopassMark /></div>
          <span className="logo-text">velopass</span>
        </Link>
        <ul className={`nav-links${navOpen ? " open" : ""}`} onClick={() => setNavOpen(false)}>
          <li><Link to="/" hash="voordelen" hashScrollIntoView={{ behavior: "smooth", block: "start" }}>Wat je krijgt</Link></li>
          <li><Link to="/" hash="al-sticker" hashScrollIntoView={{ behavior: "smooth", block: "start" }}>Al een sticker?</Link></li>
          <li><Link to="/" hash="nieuwe-sticker" hashScrollIntoView={{ behavior: "smooth", block: "start" }}>Sticker bestellen</Link></li>
          <li><Link to="/" hash="community" hashScrollIntoView={{ behavior: "smooth", block: "start" }}>Community</Link></li>
          <li><Link to="/pro" style={{ color: "var(--green-mid)", display: "inline-flex", alignItems: "center", gap: 6 }}><ArrowUpRight size={15} strokeWidth={2.2} />Voor fietswinkels</Link></li>
        </ul>
        <div className="nav-actions">
          <a href={APP_LOGIN} className="btn-login">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M2 13c0-2.5 2.7-4 6-4s6 1.5 6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Inloggen
          </a>
          <button
            type="button"
            className="nav-toggle"
            aria-label="Menu"
            aria-expanded={navOpen}
            onClick={() => setNavOpen((o) => !o)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              {navOpen ? (
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* BACK BUTTON */}
      <div className="back-btn-wrap">
        <button
          type="button"
          onClick={() => { if (window.history.length > 1) { window.history.back(); } else { window.location.href = "/"; } }}
          className="back-btn"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Terug
        </button>
      </div>

      <main style={{ background: "var(--bg)", paddingTop: 16, paddingBottom: 80, minHeight: "100vh" }}>
        {/* HERO */}
        <section style={{ ...sectionStyle, textAlign: "center", padding: "24px 6vw 48px", maxWidth: 880 }}>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
              fontSize: 12,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: GREEN,
              marginBottom: 14,
            }}
          >
            Fiets gestolen of vermist?
          </p>
          <h1
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(34px, 5vw, 52px)",
              color: NAVY,
              letterSpacing: "-1.2px",
              lineHeight: 1.05,
              marginBottom: 18,
            }}
          >
            Doe snel aangifte. Velopass helpt je.
          </h1>
          <p style={{ ...bodyStyle, maxWidth: 560, margin: "0 auto" }}>
            Voor een aangifte heb je exacte fietsgegevens nodig — gegevens die je niet meer bij de hand hebt als je fiets weg is. Tenzij je Velopass hebt.
          </p>
        </section>

        {/* VELOPASS ARGUMENT */}
        <section style={{ ...sectionStyle, marginBottom: 64 }}>
          <div style={{ ...cardStyle, padding: "32px 32px" }}>
            <h2
              style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 700,
                fontSize: 20,
                color: NAVY,
                lineHeight: 1.3,
                marginBottom: 24,
              }}
            >
              Alles wat de politie nodig heeft, staat in jouw Velopass
            </h2>
            <div className="vp-compare-grid">
              {[
                ["Merk, model en kleur", "In je Velopass-paspoort"],
                ["Framenummer", "In je Velopass-paspoort"],
                ["Foto's van de fiets", "Opgeslagen in je Velopass"],
                ["Aankoopfactuur", "Gekoppeld aan je Velopass"],
                ["Exacte locatie van de diefstal", "Al ingegeven bij je melding in Velopass"],
                ["Bewijs van eigenaarschap", "Je Velopass IS het bewijs"],
              ].map(([left, right]) => (
                <div key={left} className="vp-compare-row">
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: 15, color: MUTED }}>
                    {left}
                  </div>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      fontFamily: "'DM Sans', sans-serif",
                      fontWeight: 500,
                      fontSize: 15,
                      color: GREEN,
                    }}
                  >
                    <CheckCircle2 size={16} strokeWidth={2.2} />
                    {right}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 28, textAlign: "center" }}>
              <a href={APP_LOGIN} style={navyBtn} target="_blank" rel="noopener noreferrer">
                Open mijn Velopass →
              </a>
            </div>
          </div>
        </section>

        {/* STAP 1 */}
        <section style={{ ...sectionStyle, marginBottom: 64 }}>
          <h2 style={h2Style}>Stap 1 — Meld je fiets als vermist</h2>
          <p style={{ ...bodyStyle, marginBottom: 20 }}>
            Log in op je Velopass-account en ga naar <strong style={{ color: NAVY }}>'Mijn fiets'</strong>.
            Klik op <strong style={{ color: NAVY }}>'Melden als vermist'</strong>. De status van je fiets verandert naar REPORTED — de Velopass Community wordt meteen geactiveerd.
          </p>

          <div
            style={{
              ...cardStyle,
              display: "flex",
              gap: 16,
              alignItems: "flex-start",
              padding: "20px 22px",
              marginBottom: 24,
            }}
          >
            <div style={{ flexShrink: 0, marginTop: 2 }}>
              <StatusBadge label="REPORTED" color="#F59E0B" />
            </div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: MUTED, lineHeight: 1.6, margin: 0 }}>
              Iedereen die jouw Frame-ID scant ziet dat jouw fiets gezocht wordt en kan je anoniem een seintje geven.
            </p>
          </div>

          <a href={APP_LOGIN} style={navyBtn} target="_blank" rel="noopener noreferrer">
            Meld mijn fiets →
          </a>
        </section>

        {/* STAP 2 */}
        <section style={{ ...sectionStyle, marginBottom: 64 }}>
          <h2 style={h2Style}>Stap 2 — Doe online aangifte bij de politie</h2>
          <p style={{ ...bodyStyle, marginBottom: 20 }}>Kies jouw land voor het stappenplan.</p>

          {/* Country tabs */}
          <div
            role="tablist"
            style={{
              display: "inline-flex",
              gap: 4,
              padding: 4,
              background: "rgba(13,31,60,0.06)",
              borderRadius: 12,
              marginBottom: 28,
              flexWrap: "wrap",
            }}
          >
            {[
              { code: "BE" as const, label: "🇧🇪 België", enabled: true },
              { code: "NL" as const, label: "🇳🇱 Nederland", enabled: false },
              { code: "FR" as const, label: "🇫🇷 Frankrijk", enabled: false },
            ].map((t) => {
              const active = country === t.code;
              return (
                <button
                  key={t.code}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  disabled={!t.enabled}
                  onClick={() => t.enabled && setCountry(t.code)}
                  title={!t.enabled ? "Binnenkort beschikbaar" : undefined}
                  style={{
                    border: "none",
                    background: active ? "#FFFFFF" : "transparent",
                    color: t.enabled ? (active ? NAVY : MUTED) : "rgba(13,31,60,0.3)",
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: active ? 600 : 500,
                    fontSize: 14,
                    padding: "8px 16px",
                    borderRadius: 8,
                    cursor: t.enabled ? "pointer" : "not-allowed",
                    boxShadow: active ? "0 2px 8px rgba(13,31,60,0.08)" : "none",
                  }}
                >
                  {t.label}
                  {!t.enabled && (
                    <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.7 }}>
                      Binnenkort beschikbaar
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {country === "BE" && (
            <div style={{ display: "grid", gap: 24 }}>
              {/* Intro card */}
              <div
                style={{
                  background: "rgba(46,204,138,0.08)",
                  border: "1px solid rgba(46,204,138,0.25)",
                  borderRadius: 14,
                  padding: "18px 22px",
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                }}
              >
                <CheckCircle2 size={22} strokeWidth={2} color={GREEN} style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: NAVY, lineHeight: 1.6, margin: 0 }}>
                  In België doe je online aangifte via Police-on-web. Zo bespaar je een rit naar het commissariaat.
                </p>
              </div>

              {/* Checklist */}
              <div style={cardStyle}>
                <h3
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 700,
                    fontSize: 18,
                    color: NAVY,
                    marginBottom: 16,
                  }}
                >
                  Wat heb je vooraf nodig?
                </h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
                  {policeChecklist.map((item, i) => (
                    <li key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <CheckSquare size={18} strokeWidth={2} color={NAVY} style={{ flexShrink: 0, marginTop: 2, opacity: 0.7 }} />
                      <div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: NAVY, lineHeight: 1.5 }}>
                          {item.text}
                        </div>
                        {item.velopass && (
                          <div
                            style={{
                              fontFamily: "'DM Sans', sans-serif",
                              fontWeight: 500,
                              fontSize: 13,
                              color: GREEN,
                              marginTop: 2,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            → {item.velopass}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Steps */}
              <div style={{ display: "grid", gap: 14 }}>
                {policeSteps.map((step, i) => (
                  <div key={i} style={{ ...cardStyle, padding: "22px 24px", display: "flex", gap: 18 }}>
                    <div
                      style={{
                        flexShrink: 0,
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: NAVY,
                        color: "#F5F3EE",
                        fontFamily: "'Syne', sans-serif",
                        fontWeight: 700,
                        fontSize: 16,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4
                        style={{
                          fontFamily: "'Syne', sans-serif",
                          fontWeight: 700,
                          fontSize: 16,
                          color: NAVY,
                          marginBottom: 8,
                        }}
                      >
                        {step.title}
                      </h4>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14.5, color: MUTED, lineHeight: 1.6 }}>
                        {step.body}
                      </div>
                      {step.tip && (
                        <div
                          style={{
                            marginTop: 14,
                            background: "rgba(46,204,138,0.08)",
                            border: "1px solid rgba(46,204,138,0.25)",
                            borderRadius: 10,
                            padding: "10px 14px",
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 13.5,
                            color: NAVY,
                            lineHeight: 1.5,
                          }}
                        >
                          💡 {step.tip}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Na de aangifte */}
              <div
                style={{
                  background: "rgba(13,31,60,0.04)",
                  border: "1px solid rgba(13,31,60,0.08)",
                  borderRadius: 14,
                  padding: "18px 22px",
                }}
              >
                <h4
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 700,
                    fontSize: 15,
                    color: NAVY,
                    marginBottom: 8,
                  }}
                >
                  Wat gebeurt er na de aangifte?
                </h4>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: MUTED, lineHeight: 1.65, margin: 0 }}>
                  Je ontvangt een dossiernummer en een ontvangstbewijs. Het officieel proces-verbaal (PV) wordt opgesteld door de lokale politiezone.
                  Heb je een fietsverzekering? Stuur het PV-nummer door naar je verzekeraar om je claim te starten.
                </p>
              </div>

              {/* Extra tip — gevondenfietsen */}
              <div
                style={{
                  background: "rgba(245, 158, 11, 0.08)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  borderRadius: 14,
                  padding: "18px 22px",
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                }}
              >
                <Lightbulb size={22} strokeWidth={2} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <h4
                    style={{
                      fontFamily: "'Syne', sans-serif",
                      fontWeight: 700,
                      fontSize: 15,
                      color: NAVY,
                      marginBottom: 6,
                    }}
                  >
                    Check ook gevondenfietsen.be
                  </h4>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: MUTED, lineHeight: 1.6, margin: 0 }}>
                    Gestolen fietsen worden vaak ergens achtergelaten. Kijk regelmatig op{" "}
                    <a
                      href="https://www.gevondenfietsen.be"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: NAVY, fontWeight: 500, textDecoration: "underline", textUnderlineOffset: 3 }}
                    >
                      www.gevondenfietsen.be
                    </a>
                    {" "}— je fiets duikt er misschien op.
                  </p>
                </div>
              </div>
            </div>
          )}

          {country !== "BE" && (
            <div style={{ ...cardStyle, textAlign: "center", padding: "40px 24px" }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: MUTED, margin: 0 }}>
                Het stappenplan voor dit land is binnenkort beschikbaar.
              </p>
            </div>
          )}
        </section>

        {/* STAP 3 */}
        <section style={{ ...sectionStyle, marginBottom: 64 }}>
          <h2 style={h2Style}>Stap 3 — Fiets teruggevonden? Meld het!</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
            <StatusBadge label="ALL CLEAR" color={GREEN} />
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: MUTED }}>
              status na terugvinden
            </span>
          </div>
          <p style={{ ...bodyStyle, marginBottom: 22 }}>
            Gefeliciteerd! Log in op je Velopass en meld je fiets als <strong style={{ color: NAVY }}>'Teruggevonden'</strong>.
            De status verandert automatisch terug naar ALL CLEAR. Controleer daarna of je Frame-ID nog intact is — zo niet, bestel een nieuwe via onze webshop of bij een Velopass-fietswinkel.
          </p>
          <a href={APP_LOGIN} style={navyBtn} target="_blank" rel="noopener noreferrer">
            Mijn fiets teruggevonden →
          </a>
        </section>

        {/* CTA — geen Velopass */}
        <section style={{ ...sectionStyle, maxWidth: 1000 }}>
          <div
            style={{
              background: NAVY,
              borderRadius: 20,
              padding: "48px 40px",
              textAlign: "center",
              color: "#fff",
            }}
          >
            <h2
              style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 700,
                fontSize: "clamp(26px, 3vw, 34px)",
                color: "#fff",
                marginBottom: 14,
                letterSpacing: "-0.5px",
              }}
            >
              Nog geen Velopass?
            </h2>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 16,
                color: "rgba(255,255,255,0.6)",
                lineHeight: 1.6,
                maxWidth: 520,
                margin: "0 auto 28px",
              }}
            >
              Registreer je fiets nu en zorg dat alle gegevens altijd beschikbaar zijn — ook als je je fiets niet meer bij de hand hebt.
            </p>
            <Link
              to="/"
              hash="nieuwe-sticker"
              hashScrollIntoView={{ behavior: "smooth", block: "start" }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: GREEN,
                color: NAVY,
                padding: "14px 26px",
                borderRadius: 10,
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: 15,
                textDecoration: "none",
              }}
            >
              Registreer je fiets →
            </Link>
          </div>
        </section>
      </main>

      <Footer />

      <style>{`
        .back-btn-wrap { padding: 72px 6vw 0; max-width: 1100px; margin: 0 auto; }
        .back-btn { display: inline-flex; align-items: center; gap: 6px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; color: var(--text-muted); background: none; border: none; cursor: pointer; padding: 0; text-decoration: underline; text-underline-offset: 3px; }
        .vp-compare-grid { display: grid; gap: 0; }
        .vp-compare-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 14px 0; border-bottom: 1px solid rgba(13,31,60,0.08); align-items: center; }
        .vp-compare-row:last-child { border-bottom: none; }
        @media (max-width: 640px) {
          .back-btn-wrap { padding-top: 64px; }
          .back-btn { font-size: 12px; }
          .vp-compare-row { grid-template-columns: 1fr; gap: 4px; padding: 12px 0; }
        }
      `}</style>
    </>
  );
}
