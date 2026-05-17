import { useState, useMemo, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Store, Package, QrCode, ArrowRightLeft, Mail, KeyRound, CheckCircle2, ArrowUpRight, BookOpen } from "lucide-react";
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
  background: "rgba(13,31,60,0.06)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 16,
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
          <li><a href="#voordelen">Wat je krijgt</a></li>
          <li><a href="#al-sticker">Al een sticker?</a></li>
          <li><a href="#nieuwe-sticker">Sticker bestellen</a></li>
          <li><a href="#community">Community</a></li>
          <li><Link to="/bikesearch" search={{ lng: "nl-nl" }}>Fiets controleren</Link></li>
          <li><Link to="/pro" style={{ color: "var(--green-mid)", display: "inline-flex", alignItems: "center", gap: 6 }}><ArrowUpRight size={15} strokeWidth={2.2} />Voor fietswinkels</Link></li>
        </ul>
        <div className="nav-actions">
          <a href="#login" className="btn-login">
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
      <section className="hero">
        <span className="hero-eyebrow"><span className="eyebrow-dot" />Het digitale fietspaspoort</span>
        <h1 className="hero-title">Altijd op de fiets.<br /><em>Alles<br />geregeld.</em></h1>
        <p className="hero-sub">
          Eén Frame-ID op je fiets — en je hebt altijd toegang tot diefstalprotectie, pechhulp, verzekering en je fietswinkel. Wat er ook gebeurt.
        </p>

        <div className="path-split">
          <a href="#al-sticker" className="path-card primary">
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
          <a href="#nieuwe-sticker" className="path-card secondary">
            <div className="path-tag">Nog geen Frame-ID?</div>
            <div className="path-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </div>
            <div className="path-title">Bestel een Velopass Frame-ID</div>
            <p className="path-desc">Vraag een Frame-ID aan bij je lokale fietswinkel of bestel er rechtstreeks een via onze webshop.</p>
            <span className="path-cta">Sticker bestellen →</span>
          </a>
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
            to="/gestolen"
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

      {/* STICKER */}
      <section className="sticker-section" id="sticker">
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

      {/* PAD 1 */}
      <section className="flow-sticker" id="al-sticker">
        <p className="eyebrow">Uitnodiging ontvangen?</p>
        <h2 className="sec-title">Jouw Velopass staat klaar</h2>
        <p className="sec-sub">Je fietswinkel heeft de Frame-ID geplakt en je fiets al op jouw naam gezet. Jij hoeft enkel nog een wachtwoord te kiezen.</p>
        <div className="steps-flow">
          {[
            { n: 1, t: "Controleer je e-mail", d: "Je hebt een uitnodiging ontvangen van je fietswinkel via Velopass. Klik op de link in die mail om je Velopass te openen.", icon: <Mail size={22} color="#2ECC8A" strokeWidth={1.8} /> },
            { n: 2, t: "Kies een wachtwoord", d: "Je gegevens staan al ingevuld. Kies enkel nog een wachtwoord — en je Velopass gaat open.", icon: <KeyRound size={22} color="#2ECC8A" strokeWidth={1.8} /> },
            { n: 3, t: "Je Velopass is klaar", d: "Diefstalprotectie, pechhulp en verzekering — alles bereikbaar via één scan van de QR-code op je Frame-ID.", icon: <CheckCircle2 size={22} color="#2ECC8A" strokeWidth={1.8} /> },
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
          <a href="#login" className="btn-p">Open je Velopass</a>
          <a href="#login" className="btn-s">Geen mail ontvangen? →</a>
        </div>
      </section>

      {/* PAD 2 */}
      <section className="flow-new" id="nieuwe-sticker">
        <p className="eyebrow">Nog geen Frame-ID</p>
        <h2 className="sec-title">Bestel een Velopass Frame-ID</h2>
        <p className="sec-sub">Eén Frame-ID activeert je digitaal paspoort voor de volledige levensduur van je fiets. Eenmalige aankoop — geen abonnement, geen verborgen kosten.</p>
        <div className="steps-new two-paths">
          <div className="sn path-shop">
            <div style={pathIconBox}><Store size={24} color="#0D1F3C" strokeWidth={1.8} /></div>
            <h4>Via een fietswinkel</h4>
            <p>Ga langs bij een Velopass-fietswinkel bij jou in de buurt. De winkel heeft Frame-ID's in voorraad, plakt hem ter plekke op je fiets én registreert hem meteen op jouw naam. Jij rijdt buiten.</p>
            <a href="#community" className="btn-p">Vind een fietswinkel bij jou in de buurt</a>
          </div>
          <div className="sn path-shop">
            <div style={pathIconBox}><Package size={24} color="#0D1F3C" strokeWidth={1.8} /></div>
            <h4>Via de Velopass webshop</h4>
            <p>Bestel een Frame-ID rechtstreeks bij Velopass — geleverd aan huis. Plak hem zelf op je fiets en registreer via velopass.com. Ideaal als er geen Velopass-winkel in de buurt is of voor internationale bestellingen.</p>
            <a href="#" className="btn-g">Bestel via de Velopass webshop →</a>
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

      {/* VOORDELEN (dark) */}
      <section className="voordelen" id="voordelen">
        <p className="eyebrow">Alles op één plek</p>
        <h2 className="sec-title">Eén Frame-ID. Een heel fietsleven geregeld.</h2>
        <div className="vgrid">
          <div className="vc">
            <div className="vc-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="2" width="8" height="8" rx="1" /><rect x="14" y="2" width="8" height="8" rx="1" /><rect x="2" y="14" width="8" height="8" rx="1" /><rect x="14" y="14" width="4" height="4" rx="0.5" fill="#2ECC8A" /></svg></div>
            <div>
              <div className="vc-head"><h3>Diefstalprotectie</h3></div>
              <p>{activeShopsCount.toLocaleString("nl-BE")}+ fietswinkels scannen automatisch via hun kassasysteem. Ook fietsers en politie die de QR scannen zien meteen dat jouw fiets gezocht wordt.</p>
              <div className="secured-pill"><span className="sdot" />Jouw fiets. SECURED.</div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 10, lineHeight: 1.5 }}>
                Ook gelinkt aan MyBike, het Belgisch nationaal fietsregister.
              </p>
              <Link
                to="/gestolen"
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
            <div className="vc-icon"><BookOpen size={22} color="rgba(255,255,255,0.85)" strokeWidth={1.8} /></div>
            <div>
              <div className="vc-head"><h3>Jouw digitale serviceboekje</h3></div>
              <p>Elke onderhoudsbeurt, elke herstelling — gedocumenteerd en altijd bij de hand. Verkoop je je fiets? Een volledige servicehistorie verhoogt de restwaarde.</p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 10, fontStyle: "italic", lineHeight: 1.5 }}>
                Beheerd door jouw Velopass-fietswinkel — de expert die jouw fiets kent. Toon je Wallet bij elk bezoek, ook bij een andere winkel als je op reis bent.
              </p>
            </div>
          </div>
          <div className="vc">
            <div className="vc-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></svg></div>
            <div>
              <div className="vc-head"><h3>Pechhulp</h3><span className="optional-badge">Optioneel</span></div>
              <p>Panne onderweg? Hulp is één scan ver. Directe toegang tot pechhulp — zonder zoeken, zonder wachten.</p>
            </div>
          </div>
          <div className="vc">
            <div className="vc-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg></div>
            <div>
              <div className="vc-head"><h3>Verzekering</h3><span className="optional-badge">Optioneel</span></div>
              <p>Je fiets verzekerd zonder papierwerk. Activeer rechtstreeks vanuit je Velopass — in enkele klikken.</p>
            </div>
          </div>
          <div className="vc" style={{ gridColumn: "1/-1" }}>
            <div className="vc-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg></div>
            <div style={{ flex: 1 }}>
              <div className="vc-head"><h3>Zorgeloos eigenaarschap</h3></div>
              <p>Alles over je fiets op één plek — specificaties, garantie, volledige onderhoudshistorie en actieve services. Verkoop je je fiets? Draag het paspoort in één klik over aan de nieuwe eigenaar. Je investering behoudt zijn waarde, levenslang.</p>
            </div>
          </div>
        </div>
      </section>

      {/* WHY */}
      <section className="why-section">
        <h2 className="sec-title" style={{ maxWidth: 640, marginBottom: 16, fontFamily: "'Syne', sans-serif", fontWeight: 700 }}>
          Jouw digitale fietspaspoort. <em style={{ fontStyle: "normal", color: "#2ECC8A" }}>Levenslang.</em>
        </h2>
        <p style={{ fontSize: 16, color: "var(--text-muted)", maxWidth: 520, lineHeight: 1.7, marginBottom: 56 }}>
          Jouw digitale fietspaspoort gaat overal mee naartoe. Alles geregeld, zonder dat je eraan hoeft te denken.
        </p>
        <div className="why-grid">
          <div className="why-card">
            <div className="why-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0D1F3C" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg></div>
            <h3>Eén plek voor alles</h3>
            <p>Geen facturen meer zoeken. Geen gissen naar onderhoudsintervallen. Specificaties, garantie, onderhoudshistorie, verzekering en diefstalprotectie — veilig in je digitaal fietspaspoort. Eén scan en je hebt alles bij de hand.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="why-check"><span>✓</span> Specificaties &amp; garantie</div>
              <div className="why-check"><span>✓</span> Volledige fietsgeschiedenis</div>
              <div className="why-check"><span>✓</span> Overdragen bij verkoop</div>
            </div>
          </div>
          <div className="why-card">
            <div className="why-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0D1F3C" strokeWidth="1.8" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg></div>
            <h3>Zorgeloos eigenaarschap</h3>
            <p>Automatische onderhoudsherinneringen, praktische tips en directe toegang tot jouw fietswinkel — de mensen die jouw fiets écht kennen. Of het een e-bike van €5.000 is of je dagelijkse stadsfiets: je investering blijft langer in topconditie en behoudt zijn waarde.</p>
            <div className="why-tag">Ideaal voor e-bikes — hogere restwaarde bij verkoop</div>
          </div>
          <div className="why-card">
            <div className="why-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0D1F3C" strokeWidth="1.8" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg></div>
            <h3>Beschermd door een netwerk</h3>
            <p>Je rijdt nooit alleen. Bij diefstal helpt de hele Velopass-community mee — iedereen die de QR scant ziet dat jouw fiets gezocht wordt en kan anoniem of op naam een seintje geven.</p>
            <div className="why-quote">
              <cite>— De Velopass-community · <strong>{activeShopsCount}+ fietswinkels</strong>, fietsers en politie</cite>
            </div>
          </div>
        </div>
      </section>

      <ShopFinder />

      {/* LOGIN */}
      <section className="login-section" id="login">
        <div className="login-wrap">
          <p className="eyebrow" style={{ textAlign: "center" }}>Mijn Velopass</p>
          <h2 className="sec-title">Inloggen</h2>
          <p className="login-sub">Toegang tot je fietsgeschiedenis, pechhulp en al je diensten.</p>
          <form className="lform" onSubmit={(e) => e.preventDefault()}>
            <div className="form-row">
              <label className="flabel" htmlFor="vp-email">E-mailadres</label>
              <input id="vp-email" className="finput" type="email" placeholder="jouw@email.be" />
            </div>
            <div className="form-row">
              <label className="flabel" htmlFor="vp-pw">Wachtwoord</label>
              <input id="vp-pw" className="finput" type="password" placeholder="••••••••" />
              <a href="#" className="forgot">Wachtwoord vergeten?</a>
            </div>
            <button type="submit" className="btn-submit">Inloggen</button>
            <div className="ldivider">of</div>
            <button type="button" className="btn-qr" onClick={() => setScanOpen(true)}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
                <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
                <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
                <rect x="10" y="10" width="2" height="2" fill="currentColor" />
                <rect x="13" y="10" width="2" height="2" fill="currentColor" />
                <rect x="10" y="13" width="2" height="2" fill="currentColor" />
              </svg>
              Inloggen via QR-code
            </button>
          </form>
          <p className="lreg">Nog niet geregistreerd? <a href="#nieuwe-sticker">Activeer je Velopass</a></p>
        </div>
      </section>

      <FaqSection />

      <Footer />

      <QrScanDialog open={scanOpen} onOpenChange={setScanOpen} initialManual={scanManual} />
    </>
  );
}
