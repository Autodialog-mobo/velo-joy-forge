import { createFileRoute, Link } from "@tanstack/react-router";
import { VelopassMark } from "@/components/VelopassMark";

export const Route = createFileRoute("/pro")({
  head: () => ({
    meta: [
      { title: "Velopass Pro — Elke fiets. Een klant. Voor altijd." },
      {
        name: "description",
        content:
          "Met Velopass blijft elke klant die een fiets koopt automatisch verbonden met jouw winkel. POS-integratie of gratis Pro app voor fietswinkels in BE, NL en FR.",
      },
      { property: "og:title", content: "Velopass Pro — Elke fiets. Een klant. Voor altijd." },
      {
        property: "og:description",
        content:
          "Voor fietswinkels: behoud levenslang contact met je klanten via het internationale fietsregister.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: VelopassPro,
});

const QrIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="0" y="0" width="6" height="6" rx="1" fill="#0D1F3C" />
    <rect x="8" y="0" width="6" height="6" rx="1" fill="#0D1F3C" />
    <rect x="0" y="8" width="6" height="6" rx="1" fill="#0D1F3C" />
  </svg>
);

const Check = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M13 4L6 11 3 8" stroke="#2ECC8A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function VelopassPro() {
  return (
    <>
      <nav className="vp-nav dark">
        <Link to="/pro" className="nav-logo">
          <div className="logo-mark"><VelopassMark /></div>
          <span className="logo-text">velopass<span className="logo-pro">pro</span></span>
        </Link>
        <ul className="nav-links">
          <li><a href="#pijlers">Voordelen</a></li>
          <li><a href="#hoe-werkt-het">Hoe werkt het?</a></li>
          <li><a href="#registreer">Registreer</a></li>
          <li><a href="#proof">Community</a></li>
          <li><Link to="/" style={{ color: "rgba(46,204,138,0.7)" }}>↗ velopass.com</Link></li>
        </ul>
        <a href="#registreer" className="btn-nav-cta">Registreer je fietswinkel</a>
      </nav>

      <section className="pro-hero">
        <div className="pro-hero-left">
          <span className="hero-eyebrow"><span className="eyebrow-dot" />Word deel van een groeiende community</span>
          <h1 className="pro-hero-title">Jouw klanten blijven<br /><em>altijd jouw klanten.</em></h1>
          <p className="pro-hero-sub">Met Velopass blijft elke klant die een fiets koopt automatisch verbonden met jouw winkel — voor altijd.</p>
          <div className="hero-ctas">
            <a href="#registreer" className="btn-g">Registreer je fietswinkel</a>
            <a href="#hoe-werkt-het" className="btn-s dark">Hoe werkt het? →</a>
          </div>
          <div className="hero-stats">
            <div><div className="stat-num">1.500<span>+</span></div><div className="stat-label">fietswinkels actief</div></div>
            <div><div className="stat-num">+150<span>K</span></div><div className="stat-label">fietsen geregistreerd</div></div>
            
          </div>
        </div>
        <div className="pro-hero-right">
          <div className="dash">
            <div className="dash-hdr">
              <span className="dash-title">Van Dyck Fietsen — april 2026</span>
              <span className="dash-date">Velopass Pro</span>
            </div>
            <div className="dash-stats">
              <div className="ds"><div className="ds-label">Actieve klanten</div><div className="ds-val">284</div><div className="ds-delta">↑ +12 deze maand</div></div>
              <div className="ds"><div className="ds-label">Credits verdiend</div><div className="ds-val g">€ 340</div><div className="ds-delta">↑ via activaties</div></div>
              <div className="ds"><div className="ds-label">Herinneringen</div><div className="ds-val">47</div><div className="ds-delta">↑ 18 omgezet</div></div>
              <div className="ds"><div className="ds-label">Registratiegraad</div><div className="ds-val g">91%</div><div className="ds-delta">↑ +3% vs vorige maand</div></div>
            </div>
            <div className="dash-div" />
            <div className="dash-list-title">Recente scans</div>
            {[
              { name: "Trek Domane AL 4", sub: "L. Vermeersch · net gescand", a: true },
              { name: "Specialized Turbo Como", sub: "M. Peeters · wacht op registratie", a: false },
              { name: "Giant Escape 3", sub: "K. De Smedt · onderhoud gepland", a: true },
            ].map((b) => (
              <div className="bike-row" key={b.name}>
                <div className="bike-info">
                  <div className="bike-qr"><QrIcon /></div>
                  <div><div className="bike-name">{b.name}</div><div className="bike-sub">{b.sub}</div></div>
                </div>
                <span className={`badge ${b.a ? "a" : "p"}`}>{b.a ? "Actief" : "In afwachting"}</span>
              </div>
            ))}
            <button className="scan-btn">Scan nieuwe fiets</button>
          </div>
        </div>
      </section>

      <section className="pijlers" id="pijlers">
        <p className="eyebrow">Wat je wint</p>
        <h2 className="sec-title" style={{ marginBottom: 56, maxWidth: 520 }}>Drie redenen waarom 1.500 fietswinkels vertrouwen op Velopass</h2>
        <div className="pijler-grid">
          <div className="pc">
            <div className="pc-num">01</div>
            <div className="pc-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0D1F3C" strokeWidth="1.8" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg></div>
            <h3>Klanten die terugkomen</h3>
            <p>Automatische onderhoudsherinneringen brengen je klanten terug naar jouw winkel — zonder dat jij er iets voor doet.</p>
          </div>
          <div className="pc">
            <div className="pc-num">02</div>
            <div className="pc-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0D1F3C" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></svg></div>
            <h3>Extra diensten, nul extra werk</h3>
            <p>Bied verzekeringen en pechhulp aan via Velopass — automatisch, op het juiste moment. Elke activatie levert je Credits op.</p>
            <div className="ctag">Ons doel: Velopass kost je uiteindelijk niets</div>
          </div>
          <div className="pc">
            <div className="pc-num">03</div>
            <div className="pc-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0D1F3C" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="3" height="3" rx="0.5" fill="#0D1F3C" /></svg></div>
            <h3>Eén scan, volledig beeld</h3>
            <p>Scan de QR en zie meteen welke fiets het is, de onderhoudshistorie en actieve services. Een onbekende fiets? Automatisch aangemaakt in je kassasysteem.</p>
          </div>
        </div>
      </section>

      <section className="how" id="hoe-werkt-het">
        <p className="eyebrow">Hoe werkt het?</p>
        <h2 className="sec-title">Van verkoop tot actieve klantrelatie — in één scan.</h2>
        <div className="how-cols">
          <div>
            <div className="mlabel">Met kassasysteem (POS) <span className="mbadge">Aanbevolen</span></div>
            {[
              { n: 1, t: "Kleef de sticker en scan de QR", d: "Vanuit je kassasysteem. De fiets is meteen geregistreerd op naam van je winkel." },
              { n: 2, t: "Klant ontvangt automatisch een uitnodiging", d: "Een Velopass-mail via velopass.com. De klant kiest enkel nog een wachtwoord." },
              { n: 3, t: "Klantrelatie is actief", d: "Velopass beheert de communicatie. Jij focust op fietsen." },
            ].map((s) => (
              <div className="mstep" key={s.n}>
                <div className="mnum">{s.n}</div>
                <div><h4>{s.t}</h4><p>{s.d}</p></div>
              </div>
            ))}
          </div>
          <div>
            <div className="mlabel">Geen kassasysteem <span className="mbadge">Gratis app</span></div>
            {[
              { n: 1, t: "Download de gratis Velopass Pro app", d: "Beschikbaar voor iOS en Android. In twee minuten klaar." },
              { n: 2, t: "Kleef de sticker en scan via de app", d: "Zelfde resultaat als met kassasysteem. Geen extra software nodig." },
              { n: 3, t: "Klant ontvangt automatisch zijn uitnodiging", d: "Vanaf hier doet Velopass de rest." },
            ].map((s) => (
              <div className="mstep" key={s.n}>
                <div className="mnum">{s.n}</div>
                <div><h4>{s.t}</h4><p>{s.d}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="proof">
        <div className="proof-inner">
          <div>
            <p className="eyebrow">In goede handen</p>
            <h2 className="sec-title" style={{ marginBottom: 8, fontSize: "clamp(26px,3vw,38px)" }}>
              Vertrouwd door fietswinkels in drie landen
            </h2>
            <p style={{ fontSize: 15, color: "var(--text-muted)" }}>
              Fietswinkels in België · Nederland · Frankrijk<br />
              <span style={{ fontSize: 13, color: "var(--green-mid)", fontWeight: 500 }}>
                Fietsers in heel Europa kunnen al een Velopass bestellen
              </span>
            </p>
          </div>
          <div className="proof-numbers">
            <div><div className="pnum-val">1.500<span>+</span></div><div className="pnum-label">fietswinkels</div></div>
            <div><div className="pnum-val">+150<span>K</span></div><div className="pnum-label">fietsen geregistreerd</div></div>
          </div>
        </div>
      </section>

      <section className="register" id="registreer">
        <div className="reg-inner">
          <div>
            <p className="eyebrow">Aan de slag</p>
            <h2 className="sec-title">Registreer je fietswinkel</h2>
            <p className="reg-sub">Geen langlopend contract. Geen verplichtingen. Jij bepaalt het tempo.</p>
            {[
              { t: "POS-integratie of gratis app", d: "Werkt met je bestaand kassasysteem. Of gebruik de gratis Pro app." },
              { t: "Credits die oplopen", d: "Elke activatie brengt je dichter bij gratis gebruik." },
              { t: "Onboarding inbegrepen", d: "We helpen je op weg. In jouw taal: NL · FR · EN." },
            ].map((f) => (
              <div className="rfeat" key={f.t}>
                <div className="rfeat-icon"><Check /></div>
                <div><h4>{f.t}</h4><p>{f.d}</p></div>
              </div>
            ))}
          </div>
          <form onSubmit={(e) => e.preventDefault()}>
            <div className="fgrid">
              <div className="form-row"><label className="flabel" htmlFor="pf">Voornaam</label><input id="pf" className="finput" type="text" placeholder="Jan" /></div>
              <div className="form-row"><label className="flabel" htmlFor="pl">Naam</label><input id="pl" className="finput" type="text" placeholder="De Smedt" /></div>
            </div>
            <div className="form-row"><label className="flabel" htmlFor="ps">Naam fietswinkel</label><input id="ps" className="finput" type="text" placeholder="Van Dyck Fietsen" /></div>
            <div className="form-row"><label className="flabel" htmlFor="pe">E-mailadres</label><input id="pe" className="finput" type="email" placeholder="jan@fietswinkel.be" /></div>
            <div className="form-row"><label className="flabel" htmlFor="pk">Kassasysteem</label><input id="pk" className="finput" type="text" placeholder="Selly, Lightspeed, geen, ..." /></div>
            <button type="submit" className="btn-submit">Registreer mijn fietswinkel</button>
            <p className="fnote">We nemen binnen 2 werkdagen contact op.</p>
          </form>
        </div>
      </section>

      <footer className="vp-footer darker">
        <div>
          <div className="flogo">velopass<span style={{ color: "var(--green)" }}>pro</span></div>
          <div className="ftagline">Every bike. A customer. For life.</div>
        </div>
        <ul className="flinks">
          <li><a href="#">Privacy</a></li>
          <li><a href="#">Voorwaarden</a></li>
          <li><a href="#">Contact</a></li>
          <li><a href="#">Inloggen</a></li>
        </ul>
        <div className="fswitch"><Link to="/" style={{ color: "var(--green)", textDecoration: "none" }}>↗ velopass.com — voor fietsers</Link></div>
        <div className="fcopy">© 2026 Velopass</div>
      </footer>
    </>
  );
}
