import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Store, Package, QrCode, ArrowRightLeft, Mail, KeyRound } from "lucide-react";
import stickerImg from "@/assets/sticker.jpg";
import { VelopassMark } from "@/components/VelopassMark";
import { ShopFinder } from "@/components/ShopFinder";
import { QrScanDialog } from "@/components/QrScanDialog";

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
          "Eén sticker op je fiets en je hebt altijd toegang tot diefstalprotectie, pechhulp, verzekering en je fietswinkel. Het digitale fietspaspoort.",
      },
      { property: "og:title", content: "Velopass — Altijd op de fiets. Alles geregeld." },
      {
        property: "og:description",
        content:
          "Eén sticker op je fiets en je hebt altijd toegang tot diefstalprotectie, pechhulp, verzekering en je fietswinkel.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: VelopassHome,
});

function VelopassHome() {
  const [scanOpen, setScanOpen] = useState(false);
  return (
    <>
      <nav className="vp-nav">
        <a href="/" className="nav-logo">
          <div className="logo-mark"><VelopassMark /></div>
          <span className="logo-text">velopass</span>
        </a>
        <ul className="nav-links">
          <li><a href="#voordelen">Wat je krijgt</a></li>
          <li><a href="#al-sticker">Al een sticker?</a></li>
          <li><a href="#nieuwe-sticker">Sticker bestellen</a></li>
          <li><a href="#community">Community</a></li>
          <li><Link to="/pro" style={{ color: "var(--green-mid)" }}>↗ Voor fietswinkels</Link></li>
        </ul>
        <a href="#login" className="btn-login">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
            <path d="M2 13c0-2.5 2.7-4 6-4s6 1.5 6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Inloggen
        </a>
      </nav>

      {/* HERO */}
      <section className="hero">
        <span className="hero-eyebrow"><span className="eyebrow-dot" />Het digitale fietspaspoort</span>
        <h1 className="hero-title">Altijd op de fiets.<br /><em>Alles<br />geregeld.</em></h1>
        <p className="hero-sub">
          Eén sticker op je fiets — en je hebt altijd toegang tot diefstalprotectie, pechhulp, verzekering en je fietswinkel. Wat er ook gebeurt.
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
            <p className="path-desc">Je fietswinkel heeft je fiets al geregistreerd en je een uitnodiging gestuurd. Kies enkel nog een wachtwoord — in twee minuten klaar.</p>
            <span className="path-cta">Aan de slag →</span>
          </a>
          <a href="#nieuwe-sticker" className="path-card secondary">
            <div className="path-tag">Nog geen sticker?</div>
            <div className="path-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </div>
            <div className="path-title">Bestel een Velopass sticker</div>
            <p className="path-desc">Vraag een sticker aan bij je lokale fietswinkel of bestel er rechtstreeks een via onze webshop.</p>
            <span className="path-cta">Sticker bestellen →</span>
          </a>
          <a href="#tweedehands" className="path-card tertiary">
            <div className="path-tag">Tweedehands fiets met sticker?</div>
            <div className="path-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round">
                <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
            </div>
            <div className="path-title">Zet hem op jouw naam</div>
            <p className="path-desc">Tweedehands fiets gekocht met een bestaande Velopass sticker? Registreer hem op jouw naam — het paspoort gaat gewoon mee.</p>
            <span className="path-cta">Overdracht starten →</span>
          </a>
        </div>

        <div className="hero-trust">
          <div className="avatars">
            <div className="av">LV</div><div className="av">MP</div><div className="av">KD</div><div className="av">+</div>
          </div>
          <div className="trust-text"><strong>+150.000 fietsers</strong> in heel Europa&nbsp; ·&nbsp; 1.500+ fietswinkels in BE, NL en FR</div>
        </div>
      </section>

      {/* STICKER */}
      <section className="sticker-section" id="sticker">
        <div className="sticker-grid">
          <div className="sticker-visual">
            <div className="sticker-frame">
              <img src={stickerImg} alt="Velopass sticker op een fietsframe" width={1024} height={1024} />
              <div className="sticker-hotspot">
                <div className="hotspot-ring" />
                <div className="hotspot-dot" />
                <div className="hotspot-label">Scan → toegang tot alles</div>
              </div>
            </div>
          </div>
          <div className="sticker-content">
            <p className="eyebrow">De Velopass sticker</p>
            <h2 className="sec-title" style={{ marginBottom: 16 }}>De fysieke knop naar je digitale fiets.</h2>
            <p className="sec-sub">Eén sticker, professioneel geplakt. Alles erna gebeurt digitaal.</p>
            <div className="sticker-feats">
              <div className="sticker-feat">
                <div className="sfeat-bar" />
                <div><strong>Eén keer plakken</strong><span>Je fietswinkel plakt de sticker op de juiste plek. Eén keer, voor altijd.</span></div>
              </div>
              <div className="sticker-feat">
                <div className="sfeat-bar" />
                <div><strong>Eén scan, alles bij de hand</strong><span>Diefstalprotectie, pechhulp, verzekering en fietshistorie — bereikbaar via één QR-scan.</span></div>
              </div>
              <div className="sticker-feat">
                <div className="sfeat-bar" />
                <div><strong>Levenslang — ook bij verkoop</strong><span>Het paspoort gaat mee naar de volgende eigenaar. De sticker blijft, de data ook.</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PAD 1 */}
      <section className="flow-sticker" id="al-sticker">
        <p className="eyebrow">Uitnodiging ontvangen?</p>
        <h2 className="sec-title">Jouw Velopass staat klaar</h2>
        <p className="sec-sub">Je fietswinkel heeft de sticker geplakt en je fiets al op jouw naam gezet. Jij hoeft enkel nog een wachtwoord te kiezen.</p>
        <div className="steps-flow">
          {[
            { n: 1, t: "Controleer je e-mail", d: "Je hebt een uitnodiging ontvangen van je fietswinkel via Velopass. Klik op de link in die mail.", icon: <Mail size={22} color="#2ECC8A" strokeWidth={1.8} /> },
            { n: 2, t: "Kies een wachtwoord", d: "Je gegevens staan al ingevuld. Kies enkel nog een wachtwoord — en je Velopass is actief.", icon: <KeyRound size={22} color="#2ECC8A" strokeWidth={1.8} /> },
            { n: 3, t: "Jouw Velopass is actief", d: "Diefstalprotectie, pechhulp en verzekering — alles bereikbaar via één scan van de QR-sticker op je fiets.", icon: <VelopassMark size={28} /> },
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
          <a href="#login" className="btn-p">Inloggen in mijn Velopass</a>
          <a href="#login" className="btn-s">Geen mail ontvangen? →</a>
        </div>
      </section>

      {/* PAD 2 */}
      <section className="flow-new" id="nieuwe-sticker">
        <p className="eyebrow">Nog geen sticker</p>
        <h2 className="sec-title">Bestel een Velopass sticker</h2>
        <p className="sec-sub">Kies de weg die bij je past. Eén sticker activeert je digitaal paspoort voor de volledige levensduur van je fiets.</p>
        <div className="steps-new two-paths">
          <div className="sn path-shop">
            <div style={pathIconBox}><Store size={24} color="#0D1F3C" strokeWidth={1.8} /></div>
            <h4>Via een fietswinkel</h4>
            <p>Ga langs bij een Velopass-fietswinkel bij jou in de buurt. De winkel heeft stickers in voorraad, plakt hem ter plekke op je fiets én registreert hem meteen op jouw naam. Jij rijdt buiten.</p>
            <a href="#community" className="btn-p">Vind een fietswinkel bij jou in de buurt</a>
          </div>
          <div className="sn path-shop">
            <div style={pathIconBox}><Package size={24} color="#0D1F3C" strokeWidth={1.8} /></div>
            <h4>Via de Velopass webshop</h4>
            <p>Bestel een sticker rechtstreeks bij Velopass — geleverd aan huis. Plak hem zelf op je fiets en registreer via velopass.com. Ideaal als er geen Velopass-winkel in de buurt is of voor internationale bestellingen.</p>
            <a href="#" className="btn-g">Bestel via de Velopass webshop →</a>
          </div>
        </div>
        <div className="path-final">
          <div className="path-final-arrow">
            <svg width="14" height="14" viewBox="0 0 10 10" fill="none"><path d="M3 5h4M5 3l2 2-2 2" stroke="#0D1F3C" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div>
            <h4>Altijd op de fiets. Alles geregeld.</h4>
            <p>Jouw Velopass is actief. Diefstalprotectie, pechhulp en verzekering — één scan van je sticker ver.</p>
          </div>
        </div>
      </section>

      {/* PAD 3 */}
      <section className="flow-sticker" id="tweedehands" style={{ background: "var(--bg)" }}>
        <p className="eyebrow">Tweedehands fiets met sticker</p>
        <h2 className="sec-title">Het paspoort gaat mee. Op jouw naam.</h2>
        <p className="sec-sub">Heb je een tweedehands fiets gekocht met een bestaande Velopass-sticker? Je kunt het digitale paspoort eenvoudig op jouw naam zetten. De neutrale fietsgeschiedenis (onderhoudsbeurten, herstellingen en garantiegegevens) gaat mee. Persoonlijke services zoals pechhulp en verzekering activeer je zelf. Facturen, prijzen en persoonlijke foto's blijven privé bij de vorige eigenaar.</p>
        <div className="steps-flow">
          {[
            { n: 1, t: "Scan de QR-sticker", d: "Scan de sticker op je tweedehands fiets.", icon: <QrCode size={22} color="#2ECC8A" strokeWidth={1.8} /> },
            { n: 2, t: "Vraag de overdracht aan", d: "De vorige eigenaar ontvangt automatisch een verzoek. Na zijn bevestiging staat de fiets officieel op jouw naam.", icon: <ArrowRightLeft size={22} color="#2ECC8A" strokeWidth={1.8} /> },
            { n: 3, t: "Jouw Velopass. Jouw fiets.", d: "Het digitale paspoort is nu van jou. Je krijgt een neutrale tijdlijn met de gebeurtenissen van de fiets. Pechhulp, verzekering en actieve services activeer je zelf in enkele klikken.", icon: <VelopassMark size={28} /> },
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
          <button type="button" onClick={() => setScanOpen(true)} className="btn-p" style={{ border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <QrCode size={16} strokeWidth={2} /> Scan de sticker
          </button>
          <a href="#" className="btn-s">Code handmatig invoeren →</a>
        </div>
      </section>

      {/* VOORDELEN (dark) */}
      <section className="voordelen" id="voordelen">
        <p className="eyebrow">Alles op één plek</p>
        <h2 className="sec-title">Eén sticker. Een heel fietsleven geregeld.</h2>
        <div className="vgrid">
          <div className="vc">
            <div className="vc-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="2" width="8" height="8" rx="1" /><rect x="14" y="2" width="8" height="8" rx="1" /><rect x="2" y="14" width="8" height="8" rx="1" /><rect x="14" y="14" width="4" height="4" rx="0.5" fill="#2ECC8A" /></svg></div>
            <div>
              <div className="vc-head"><h3>Diefstalprotectie</h3></div>
              <p>Je fiets staat geregistreerd in Velopass, het internationale fietsregister. Elk kassasysteem van 1.500+ aangesloten fietswinkels scant automatisch — een gestolen fiets heeft nergens meer te gaan.</p>
              <div className="secured-pill"><span className="sdot" />Jouw fiets. Secured.</div>
            </div>
          </div>
          <div className="vc">
            <div className="vc-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg></div>
            <div>
              <div className="vc-head"><h3>Jouw fietswinkel</h3></div>
              <p>Jouw fietswinkel kent jouw fiets. En zorgt er automatisch voor.</p>
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
            <p>Je rijdt nooit alleen. Bij diefstal helpt de hele Velopass-community mee — iedereen die de QR scant ziet dat jouw fiets gezocht wordt en kan anoniem een seintje geven.</p>
            <div className="why-quote">
              <p>&ldquo;Bij diefstal helpt de hele Velopass-community mee. Iedereen die de QR-code scant ziet dat jouw fiets gezocht wordt en kan anoniem een seintje geven.&rdquo;</p>
              <cite>— De Velopass-community · 1.500+ fietswinkels</cite>
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
            <button type="button" className="btn-qr">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
                <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
                <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
                <rect x="10" y="10" width="2" height="2" fill="currentColor" />
                <rect x="13" y="10" width="2" height="2" fill="currentColor" />
                <rect x="10" y="13" width="2" height="2" fill="currentColor" />
              </svg>
              Inloggen via QR-sticker
            </button>
          </form>
          <p className="lreg">Nog niet geregistreerd? <a href="#nieuwe-sticker">Activeer je Velopass</a></p>
        </div>
      </section>

      <footer className="vp-footer">
        <div>
          <div className="flogo">velopass</div>
          <div className="ftagline">Altijd op de fiets. Alles geregeld.</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 3 }}>
            Stickers beschikbaar in heel Europa · Fietswinkels actief in BE, NL en FR
          </div>
        </div>
        <ul className="flinks">
          <li><a href="#">Privacy</a></li>
          <li><a href="#">Voorwaarden</a></li>
          <li><a href="#">Contact</a></li>
        </ul>
        <div className="fpro"><Link to="/pro" style={{ color: "var(--green)", textDecoration: "none" }}>↗ velopass.pro — voor fietswinkels</Link></div>
        <div className="fcopy">© 2026 Velopass</div>
      </footer>

      <QrScanDialog open={scanOpen} onOpenChange={setScanOpen} />
    </>
  );
}
