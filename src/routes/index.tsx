import { useState, useMemo, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Store, Package, QrCode, ArrowRightLeft, Mail, KeyRound, CheckCircle2, ArrowUpRight, Sticker } from "lucide-react";
import stickerImg from "@/assets/velopass-sticker.jpg";
import { VelopassMark } from "@/components/VelopassMark";
import { ShopFinder } from "@/components/ShopFinder";
import { QrScanDialog } from "@/components/QrScanDialog";
import { FaqSection } from "@/components/FaqSection";
import { Footer } from "@/components/Footer";
import shopsData from "@/data/shops.json";

const pathIconBox: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 12,
  background: "#0D1F3C",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Velopass — Altijd op de fiets. Alles geregeld." },
      {
        name: "description",
        content:
          "Eén Frame-ID op je fiets en je hebt altijd toegang tot diefstalprotectie, pechhulp, verzekering en je fietswinkel. Het digitale fietspaspoort.",
      },
      { property: "og:title", content: "Velopass — Altijd op de fiets. Alles geregeld." },
      {
        property: "og:description",
        content:
          "Eén Frame-ID op je fiets en je hebt altijd toegang tot diefstalprotectie, pechhulp, verzekering en je fietswinkel.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: VelopassHome,
});

function VelopassHome() {
  const [scanOpen, setScanOpen] = useState(false);
  const [scanManual, setScanManual] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const activeShopsCount = useMemo(() => (shopsData as Array<{ status: string }>).filter((s) => s.status === "active").length, []);
  const QR_STORAGE_KEY = "velopass:qr-overlay:v2";
  const [qrX, setQrX] = useState(50);
  const [qrY, setQrY] = useState(49);
  const [qrSize, setQrSize] = useState(26);
  const [tunerOpen, setTunerOpen] = useState(false);
  // Hydrate from localStorage on mount (avoids SSR mismatch)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(QR_STORAGE_KEY);
      if (!raw) return;
      const v = JSON.parse(raw);
      if (typeof v.x === "number") setQrX(v.x);
      if (typeof v.y === "number") setQrY(v.y);
      if (typeof v.size === "number") setQrSize(v.size);
    } catch {}
  }, []);
  // Persist on change
  useEffect(() => {
    try {
      localStorage.setItem(QR_STORAGE_KEY, JSON.stringify({ x: qrX, y: qrY, size: qrSize }));
    } catch {}
  }, [qrX, qrY, qrSize]);
  // Scroll to hash on mount / navigation
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      }
    }
  }, []);
  return (
    <>
      <div className={`nav-backdrop${navOpen ? " open" : ""}`} onClick={() => setNavOpen(false)} aria-hidden="true" />
      <nav className="vp-nav">
        <a href="/" className="nav-logo">
          <div className="logo-mark"><VelopassMark /></div>
          <span className="logo-text">velopass</span>
        </a>
        <ul className={`nav-links${navOpen ? " open" : ""}`} onClick={() => setNavOpen(false)}>
          <li><a href="#wat-je-krijgt">Wat je krijgt</a></li>
          <li><a href="#already-have-one">Al een sticker?</a></li>
          <li><a href="#order-sticker">Sticker bestellen</a></li>
          <li><a href="#community">Community</a></li>
          <li><Link to="/bike-check" search={{ lng: "nl-nl" }}>Fiets controleren</Link></li>
          <li><Link to="/contact">Contact</Link></li>
          <li><Link to="/professionals" style={{ color: "var(--green-mid)", display: "inline-flex", alignItems: "center", gap: 6 }}><ArrowUpRight size={15} strokeWidth={2.2} />Voor professionals</Link></li>
        </ul>
        <div className="nav-actions">
          <a href="https://login.velopass.com/login?state=hKFo2SB5ODJtdjhZMGxXRGlPN1NVWFdQM3pqV3JUS1pFQTlkSaFupWxvZ2luo3RpZNkgM3R1ZXU4M2FxM3RqUk1FYVR3UUZCSTRhZV92dTlhRzmjY2lk2SBWak0xVFBUQUFFcG11aWhGNndYeEdGdVFybE5hVTY5MQ&client=VjM1TPTAAEpmuihF6wXxGFuQrlNaU691&protocol=oauth2&scope=openid%20profile%20email&audience=https%3A%2F%2Fcyclistapi.prod.velopass.com&redirect_uri=https%3A%2F%2Fapp.velopass.com%2Fdashboard&response_type=code&response_mode=query&nonce=a3hmZVl5aENNeU95d1U0SUlBaEM3NV9MbkZXNFdXRkg2c3RpOXJlMW5BUQ%3D%3D&code_challenge=5vSSWCjxdP-6B0z5HV38kaBGFWP4KSmv4gORKjvtzi0&code_challenge_method=S256&auth0Client=eyJuYW1lIjoiYXV0aDAtcmVhY3QiLCJ2ZXJzaW9uIjoiMi45LjAifQ%3D%3D#page=cyclist/login&method=standard&lng=nl-nl" className="btn-login">
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
                <>
                  <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </>
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero" id="hero">
        <span className="hero-eyebrow"><span className="eyebrow-dot" />Diefstalbescherming + digitaal fietspaspoort</span>
        <h1 className="hero-title">Altijd op de fiets.<br /><em>Alles<br />geregeld.</em></h1>
        <p className="hero-sub">
          Eén Frame-ID op je fiets — en je hebt altijd toegang tot diefstalprotectie, pechhulp, verzekering en jouw digitaal serviceboekje. Wat er ook gebeurt.
        </p>

        <div className="hero-cta-wrap">
          <Link to="/order" className="hero-cta-primary">Bestel je Frame-ID →</Link>
          <div className="hero-cta-sub">Vanaf €12,95 — gratis verzending in heel de EU</div>
        </div>


        <div className="path-split">
          <a href="#already-have-one" className="path-card primary">
            <div className="path-tag">Uitnodiging ontvangen van je fietswinkel?</div>
            <div className="path-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0D1F3C" strokeWidth="1.8" strokeLinecap="round">
                <rect x="2" y="2" width="8" height="8" rx="1" />
                <rect x="14" y="2" width="8" height="8" rx="1" />
                <rect x="2" y="14" width="8" height="8" rx="1" />
                <rect x="14" y="14" width="4" height="4" rx="0.5" fill="#0D1F3C" />
              </svg>
            </div>
            <div className="path-title">Jouw Velopass staat klaar</div>
            <p className="path-desc">Je fietswinkel heeft je fiets al geregistreerd en je een uitnodiging gestuurd. Kies enkel nog een wachtwoord — in 1 minuut klaar.</p>
            <span className="path-cta">Open je Velopass →</span>
          </a>
          <Link to="/order" className="path-card secondary">
            <div className="path-tag">Nog geen Frame-ID?</div>
            <div className="path-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </div>
            <div className="path-title">Bestel een Velopass Frame-ID</div>
            <p className="path-desc">Vanaf €12,95. Gratis verzending. Direct beschermd via je digitaal fietspaspoort.</p>
            <span className="path-cta">Sticker bestellen →</span>
          </Link>
          <a href="#tweedehands" className="path-card tertiary">
            <div className="path-tag">Tweedehands fiets met Frame-ID?</div>
            <div className="path-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round">
                <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
            </div>
            <div className="path-title">Het paspoort gaat mee. Op jouw naam.</div>
            <p className="path-desc">Tweedehands fiets gekocht met een bestaande Velopass Frame-ID? Registreer hem op jouw naam — het paspoort gaat gewoon mee.</p>
            <span className="path-cta">Overdracht starten →</span>
          </a>
        </div>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <Link
            to="/stolen"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 400,
              fontSize: 13,
              color: "rgba(255,255,255,0.45)",
              textDecoration: "none",
            }}
          >
            Fiets gestolen of vermist? → Lees wat je nu moet doen
          </Link>
        </div>

        <div className="hero-trust">
          <div className="avatars">
            <div className="av">LV</div><div className="av">MP</div><div className="av">KD</div><div className="av">+</div>
          </div>
          <div className="trust-text">+180.000 fietsers&nbsp; ·&nbsp; <strong>{activeShopsCount.toLocaleString("nl-BE")}+ fietswinkels</strong></div>
        </div>
      </section>

      {/* FRAME-ID UITLEG */}
      <section className="sticker-section" id="frame-id">
        <div className="sticker-grid">
          <div className="sticker-visual">
            <div
              className="sticker-frame"
              style={{
                ['--qr-x' as any]: `${qrX}%`,
                ['--qr-y' as any]: `${qrY}%`,
                ['--qr-size' as any]: `${qrSize}%`,
              }}
            >
              <img src={stickerImg} alt="Velopass Frame-ID op een fietsframe" width={1024} height={1024} />
              <div className="scan-overlay" aria-hidden="true">
                <span className="scan-corner tl" />
                <span className="scan-corner tr" />
                <span className="scan-corner bl" />
                <span className="scan-corner br" />
                <span className="scan-line" />
              </div>
              <div className="scan-badge">Scan → toegang tot alles</div>
              <div className="secured-tag" aria-label="Secured"><span className="secured-tag-dot" />SECURED</div>
            </div>
            {import.meta.env.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).has("tune") && (
              <div className="qr-tuner">
                <button type="button" className="qr-tuner-toggle" onClick={() => setTunerOpen((o) => !o)}>
                  {tunerOpen ? "Hide" : "Tune"} QR overlay
                </button>
                {tunerOpen && (
                  <div className="qr-tuner-panel">
                    <label>X <span>{qrX}%</span><input type="range" min={0} max={100} step={0.5} value={qrX} onChange={(e) => setQrX(parseFloat(e.target.value))} /></label>
                    <label>Y <span>{qrY}%</span><input type="range" min={0} max={100} step={0.5} value={qrY} onChange={(e) => setQrY(parseFloat(e.target.value))} /></label>
                    <label>Size <span>{qrSize}%</span><input type="range" min={10} max={90} step={0.5} value={qrSize} onChange={(e) => setQrSize(parseFloat(e.target.value))} /></label>
                    <code>--qr-x:{qrX}% --qr-y:{qrY}% --qr-size:{qrSize}%</code>
                    <button type="button" className="qr-tuner-toggle" style={{ alignSelf: "flex-start" }} onClick={() => { setQrX(50); setQrY(49); setQrSize(26); try { localStorage.removeItem(QR_STORAGE_KEY); } catch {} }}>Reset</button>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="sticker-content">
            <p className="eyebrow">De Velopass Frame-ID</p>
            <h2 className="sticker-title">
              <span className="st-line-1">De digitale sleutel van je fiets.</span>
              <span className="st-line-2">Eén scan. Alles geregeld.</span>
            </h2>
            <p className="sec-sub">Eén Frame-ID op je frame, een wereld aan mogelijkheden in je broekzak.</p>
            <div className="sticker-feats">
              <div className="sticker-feat">
                <div className="sfeat-bar" />
                <div><strong>Altijd op de juiste plek.</strong><span>Of je dealer de Frame-ID nu plaatst bij aankoop, of je plakt hem zelf na een online bestelling: hij is ontworpen om een fietsleven lang onverwoestbaar op je frame te blijven zitten.</span></div>
              </div>
              <div className="sticker-feat">
                <div className="sfeat-bar" />
                <div><strong>Directe toegang tot alles.</strong><span>Scan de QR-code voor directe toegang tot je digitale paspoort. Je verzekering en pechhulp heb je altijd bij de hand, en een onderhoudsbeurt bij je fietswinkel plan je voortaan in een paar klikken.</span></div>
              </div>
              <div className="sticker-feat">
                <div className="sfeat-bar" />
                <div><strong>Verbonden met het frame.</strong><span>De Frame-ID hoort bij de fiets, niet bij de persoon. Bij verkoop draag je de historie en beveiliging eenvoudig over. De Frame-ID blijft op het frame, de data verhuist mee.</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VOORDELEN */}
      <section className="voordelen" id="wat-je-krijgt">
        <p className="eyebrow">Alles op één plek</p>
        <h2 className="sec-title">Eén Frame-ID. Een heel fietsleven geregeld.</h2>
        <div className="vgrid">
          <div className="vc">
            <div className="vc-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0D1F3C" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="2" width="8" height="8" rx="1" /><rect x="14" y="2" width="8" height="8" rx="1" /><rect x="2" y="14" width="8" height="8" rx="1" /><rect x="14" y="14" width="4" height="4" rx="0.5" fill="#2ECC8A" /></svg></div>
            <div>
              <div className="vc-head"><h3>Diefstalprotectie</h3></div>
              <p>{activeShopsCount.toLocaleString("nl-BE")}+ fietswinkels scannen automatisch via hun kassasysteem. Ook fietsers en politie die de QR scannen zien meteen dat jouw fiets gezocht wordt.</p>
              <div className="secured-pill"><span className="sdot" />Jouw fiets. SECURED.</div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: 12, color: "var(--text-muted)", marginTop: 10, lineHeight: 1.5 }}>
                Ook gelinkt aan MyBike, het Belgisch nationaal fietsregister.
              </p>
              <Link
                to="/stolen"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 500,
                  fontSize: 12,
                  color: "#F59E0B",
                  textDecoration: "none",
                  display: "inline-block",
                  marginTop: 10,
                }}
              >
                Fiets gestolen of vermist? Lees wat je moet doen →
              </Link>
            </div>
          </div>
          <div className="vc">
            <div className="vc-icon"><Store size={22} color="#0D1F3C" strokeWidth={1.8} /></div>
            <div>
              <div className="vc-head"><h3>Jouw digitale serviceboekje</h3></div>
              <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.65 }}>
                Elke onderhoudsbeurt, elke herstelling — gedocumenteerd en altijd bij de hand. Verkoop je je fiets? Een volledige servicehistorie verhoogt de restwaarde.
              </p>
              <p style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic", marginTop: 10, lineHeight: 1.6 }}>
                Beheerd door jouw Velopass-fietswinkel — de expert die jouw fiets kent. Toon je Wallet bij elk bezoek, ook bij een andere winkel als je op reis bent.
              </p>
            </div>
          </div>
          <div className="vc">
            <div className="vc-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0D1F3C" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></svg></div>
            <div>
              <div className="vc-head"><h3>Pechhulp</h3><span className="optional-badge">Optioneel</span></div>
              <p>Panne onderweg? Hulp is één scan ver. Directe toegang tot pechhulp — zonder zoeken, zonder wachten. Heb je al een pechhulpabonnement? Voeg dat toe aan je Velopass zodat alles op één plek staat.</p>
            </div>
          </div>
          <div className="vc">
            <div className="vc-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0D1F3C" strokeWidth="1.8" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg></div>
            <div>
            <div className="vc-head"><h3>Verzekering</h3><span className="optional-badge">Optioneel</span></div>
              <p>Sluit een fietsverzekering af rechtstreeks vanuit je Velopass — in enkele klikken. Heb je al een verzekering? Voeg die toe aan je Velopass zodat alles op één plek staat.</p>
            </div>
          </div>
          <div className="vc" style={{ gridColumn: "1/-1" }}>
            <div className="vc-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0D1F3C" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg></div>
            <div style={{ flex: 1 }}>
              <div className="vc-head"><h3>Zorgeloos eigenaarschap</h3></div>
              <p>Alles over je fiets op één plek — specificaties, garantie, volledige onderhoudshistorie en actieve services. Verkoop je je fiets? Draag het paspoort in één klik over aan de nieuwe eigenaar. Je investering behoudt zijn waarde, levenslang.</p>
            </div>
          </div>
        </div>
      </section>

      {/* PAD 1 */}
      <section className="flow-sticker" id="already-have-one">
        <p className="eyebrow">Uitnodiging ontvangen?</p>
        <h2 className="sec-title">Jouw Velopass staat klaar</h2>
        <p className="sec-sub">Je fietswinkel heeft de Frame-ID geplakt en je fiets al op jouw naam gezet. Jij hoeft enkel nog een wachtwoord te kiezen.</p>
        <div className="steps-flow">
          {[
            { n: 1, t: "Controleer je e-mail", d: "Je hebt een uitnodiging ontvangen van je fietswinkel via Velopass. Klik op de link in die mail om je Velopass te openen.", icon: <Mail size={22} color="#2ECC8A" strokeWidth={1.8} /> },
            { n: 2, t: "Klef je Frame-ID op het frame", d: "Ontvette het oppervlak eerst voor een optimale hechting. Kies een zichtbare plek — bij voorkeur net onder de zadelpen. Zo is de QR makkelijk scanbaar én zien dieven meteen dat jouw fiets beschermd is.", icon: <Sticker size={22} color="#2ECC8A" strokeWidth={1.8} /> },
            { n: 3, t: "Kies een wachtwoord", d: "Je gegevens staan al ingevuld. Kies enkel nog een wachtwoord — en je Velopass gaat open.", icon: <KeyRound size={22} color="#2ECC8A" strokeWidth={1.8} /> },
            { n: 4, t: "Je Velopass is klaar", d: "Diefstalprotectie, pechhulp, verzekering en jouw digitaal serviceboekje — alles bereikbaar via één scan van de QR-code op je Frame-ID.", icon: <CheckCircle2 size={22} color="#2ECC8A" strokeWidth={1.8} /> },
          ].map((s, i, arr) => (
            <div className="sf" key={s.n}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div className="sf-num" style={{ marginBottom: 0 }}>{s.n}</div>
                {s.icon}
              </div>
              <h4>{s.t}</h4>
              <p>{s.d}</p>
              {i < arr.length - 1 && (
                <div className="sf-arrow">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 5h4M5 3l2 2-2 2" stroke="#5A7090" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 36, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a href="https://login.velopass.com/login?state=hKFo2SB5ODJtdjhZMGxXRGlPN1NVWFdQM3pqV3JUS1pFQTlkSaFupWxvZ2luo3RpZNkgM3R1ZXU4M2FxM3RqUk1FYVR3UUZCSTRhZV92dTlhRzmjY2lk2SBWak0xVFBUQUFFcG11aWhGNndYeEdGdVFybE5hVTY5MQ&client=VjM1TPTAAEpmuihF6wXxGFuQrlNaU691&protocol=oauth2&scope=openid%20profile%20email&audience=https%3A%2F%2Fcyclistapi.prod.velopass.com&redirect_uri=https%3A%2F%2Fapp.velopass.com%2Fdashboard&response_type=code&response_mode=query&nonce=a3hmZVl5aENNeU95d1U0SUlBaEM3NV9MbkZXNFdXRkg2c3RpOXJlMW5BUQ%3D%3D&code_challenge=5vSSWCjxdP-6B0z5HV38kaBGFWP4KSmv4gORKjvtzi0&code_challenge_method=S256&auth0Client=eyJuYW1lIjoiYXV0aDAtcmVhY3QiLCJ2ZXJzaW9uIjoiMi45LjAifQ%3D%3D#page=cyclist/login&method=standard&lng=nl-nl" className="btn-p">Open je Velopass</a>
          <a href="https://login.velopass.com/login?state=hKFo2SB5ODJtdjhZMGxXRGlPN1NVWFdQM3pqV3JUS1pFQTlkSaFupWxvZ2luo3RpZNkgM3R1ZXU4M2FxM3RqUk1FYVR3UUZCSTRhZV92dTlhRzmjY2lk2SBWak0xVFBUQUFFcG11aWhGNndYeEdGdVFybE5hVTY5MQ&client=VjM1TPTAAEpmuihF6wXxGFuQrlNaU691&protocol=oauth2&scope=openid%20profile%20email&audience=https%3A%2F%2Fcyclistapi.prod.velopass.com&redirect_uri=https%3A%2F%2Fapp.velopass.com%2Fdashboard&response_type=code&response_mode=query&nonce=a3hmZVl5aENNeU95d1U0SUlBaEM3NV9MbkZXNFdXRkg2c3RpOXJlMW5BUQ%3D%3D&code_challenge=5vSSWCjxdP-6B0z5HV38kaBGFWP4KSmv4gORKjvtzi0&code_challenge_method=S256&auth0Client=eyJuYW1lIjoiYXV0aDAtcmVhY3QiLCJ2ZXJzaW9uIjoiMi45LjAifQ%3D%3D#page=cyclist/login&method=standard&lng=nl-nl" className="btn-s">Geen mail ontvangen? →</a>
        </div>
      </section>

      {/* PAD 2 */}
      <section className="flow-new" id="order-sticker">
        <p className="eyebrow">Nog geen Frame-ID</p>
        <h2 className="sec-title">Bestel een Velopass Frame-ID</h2>
        <p className="sec-sub">Eén Frame-ID activeert je digitaal paspoort voor de volledige levensduur van je fiets. Eenmalige aankoop — geen abonnement, geen verborgen kosten.</p>
        <div className="steps-new two-paths">
          <div className="sn path-shop">
            <div style={pathIconBox}><Store size={24} color="#fff" strokeWidth={1.8} /></div>
            <h4>Via een fietswinkel</h4>
            <p>Ga langs bij een Velopass-fietswinkel bij jou in de buurt. De winkel heeft Frame-ID's in voorraad, plakt hem ter plekke op je fiets én registreert hem meteen op jouw naam. Jij rijdt buiten.</p>
            <a href="#community" className="btn-p">Vind een fietswinkel bij jou in de buurt</a>
          </div>
          <div className="sn path-shop">
            <div style={pathIconBox}><Package size={24} color="#fff" strokeWidth={1.8} /></div>
            <h4>Via de Velopass webshop</h4>
            <p>Bestel een Frame-ID rechtstreeks bij Velopass — geleverd aan huis. Plak hem zelf op je fiets en registreer via velopass.com. Ideaal als er geen Velopass-winkel in de buurt is of voor internationale bestellingen.</p>
            <Link to="/order" className="btn-g">Bestel via de Velopass webshop →</Link>
          </div>
        </div>
        <div className="path-final">
          <div className="path-final-arrow">
            <CheckCircle2 size={22} color="#2ECC8A" strokeWidth={1.8} />
          </div>
          <div>
            <h4>Altijd op de fiets. Alles geregeld.</h4>
            <p>Jouw Velopass is actief. Diefstalprotectie, pechhulp en verzekering — één scan van je Frame-ID ver.</p>
          </div>
        </div>
      </section>

      <ShopFinder />

      {/* PAD 3 */}
      <section className="flow-sticker" id="tweedehands" style={{ background: "var(--bg)" }}>
        <p className="eyebrow">Tweedehands fiets met Frame-ID</p>
        <h2 className="sec-title">Het paspoort gaat mee. <em style={{ fontStyle: "normal", color: "#2ECC8A" }}>Op jouw naam.</em></h2>
        <p className="sec-sub">Heb je een tweedehands fiets gekocht met een bestaande Velopass Frame-ID? Je kunt het digitale paspoort eenvoudig op jouw naam zetten. De neutrale fietsgeschiedenis (onderhoudsbeurten, herstellingen en garantiegegevens) gaat mee. Persoonlijke services zoals pechhulp en verzekering activeer je zelf. Facturen, prijzen en persoonlijke foto's blijven privé bij de vorige eigenaar.</p>
        <div className="steps-flow">
          {[
            { n: 1, t: "Scan de QR-code op de Frame-ID", d: "Scan de QR-code op de Frame-ID van je tweedehands fiets.", icon: <QrCode size={22} color="#2ECC8A" strokeWidth={1.8} /> },
            { n: 2, t: "Vraag de overdracht aan", d: "De vorige eigenaar ontvangt automatisch een verzoek. Na zijn bevestiging staat de fiets officieel op jouw naam.", icon: <ArrowRightLeft size={22} color="#2ECC8A" strokeWidth={1.8} /> },
            { n: 3, t: "Jouw Velopass. Jouw fiets.", d: "Het digitale paspoort is nu van jou. Je krijgt een neutrale tijdlijn met de gebeurtenissen van de fiets. Pechhulp, verzekering en actieve services activeer je zelf in enkele klikken.", icon: <CheckCircle2 size={22} color="#2ECC8A" strokeWidth={1.8} /> },
          ].map((s, i, arr) => (
            <div className="sf" key={s.n}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div className="sf-num" style={{ marginBottom: 0 }}>{s.n}</div>
                {s.icon}
              </div>
              <h4>{s.t}</h4>
              <p>{s.d}</p>
              {i < arr.length - 1 && (
                <div className="sf-arrow">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 5h4M5 3l2 2-2 2" stroke="#5A7090" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 36, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button type="button" onClick={() => { setScanManual(false); setScanOpen(true); }} className="btn-p" style={{ border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <QrCode size={16} strokeWidth={2} /> Scan de QR-code
          </button>
          <button type="button" onClick={() => { setScanManual(true); setScanOpen(true); }} className="btn-s" style={{ border: "none", background: "transparent", cursor: "pointer", font: "inherit" }}>
            Code handmatig invoeren →
          </button>
        </div>
      </section>



      <FaqSection />

      {/* NOG VRAGEN CTA */}
      <section style={{ background: "#183A6E", padding: "32px 40px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <div>
            <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 20, color: "#fff", margin: 0 }}>Nog vragen?</p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.7)", margin: "4px 0 0" }}>Ons team helpt je graag verder.</p>
          </div>
          <Link
            to="/contact"
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: 14,
              letterSpacing: "1.2px",
              textTransform: "uppercase",
              background: "#2ECC8A",
              color: "#0D1F3C",
              padding: "12px 24px",
              borderRadius: 10,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              whiteSpace: "nowrap",
            }}
          >
            Neem contact op →
          </Link>
        </div>
      </section>

      <Footer />

      <QrScanDialog open={scanOpen} onOpenChange={setScanOpen} initialManual={scanManual} />
    </>
  );
}
