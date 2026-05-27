import { useState, useMemo, lazy, Suspense, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Shield, ShieldCheck, FileText, Package, Truck, ScanLine, Mail, CheckCircle2, Sparkles, Building2, Wallet, CalendarDays, ExternalLink, ClipboardList, X, Check as CheckIcon, AlertCircle, Smartphone } from "lucide-react";
import { VelopassMark } from "@/components/VelopassMark";
import { Footer } from "@/components/Footer";
import shopsData from "@/data/shops.json";
import { RegisterForm } from "@/components/ProRegisterForm";
import leasingAppMockup from "@/assets/leasing-app-mockup.png";

const ProCommunityMap = lazy(() => import("@/components/ProCommunityMap"));

export const Route = createFileRoute("/shop")({
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
  const [navOpen, setNavOpen] = useState(false);
  const activeShopsCount = useMemo(() => (shopsData as Array<{ status: string }>).filter((s) => s.status === "active").length, []);
  const [currentMonthYear, setCurrentMonthYear] = useState("");
  useEffect(() => {
    setCurrentMonthYear(new Date().toLocaleDateString("nl-BE", { month: "long", year: "numeric" }));
  }, []);
  return (
    <>
      <div className={`nav-backdrop${navOpen ? " open" : ""}`} onClick={() => setNavOpen(false)} aria-hidden="true" />
      <nav className="vp-nav dark">
        <Link to="/shop" className="nav-logo">
          <div className="logo-mark"><VelopassMark /></div>
          <span className="logo-text">velopass<span className="logo-pro">pro</span></span>
        </Link>
        <ul className={`nav-links${navOpen ? " open" : ""}`} onClick={() => setNavOpen(false)}>
          <li><a href="#pijlers">Voordelen</a></li>
          <li><a href="#hoe-werkt-het">Hoe werkt het?</a></li>
          <li><a href="#fabrikanten">Fabrikanten</a></li>
          <li><a href="#registreer">Registreer</a></li>
          <li><a href="#community">Community</a></li>
          <li><Link to="/" style={{ color: "rgba(46,204,138,0.7)", display: "inline-flex", alignItems: "center", gap: 6 }}><ArrowUpRight size={15} strokeWidth={2.2} />Voor fietsers</Link></li>
        </ul>
        <div className="nav-actions">
          <a href="#registreer" className="btn-nav-cta">Registreer je fietswinkel</a>
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
            <div><div className="stat-num">{activeShopsCount.toLocaleString("nl-BE")}<span>+</span></div><div className="stat-label">fietswinkels actief</div></div>
            <div><div className="stat-num">+200<span>K</span></div><div className="stat-label">fietsen geregistreerd</div></div>
            
          </div>
        </div>
        <div className="pro-hero-right">
          <div className="dash">
            <div className="dash-hdr">
              <span className="dash-title">Van Dyck Fietsen — {currentMonthYear}</span>
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
        <h2 className="sec-title" style={{ marginBottom: 56, maxWidth: 520 }}>Vier redenen waarom {activeShopsCount.toLocaleString("nl-BE")} fietswinkels vertrouwen op Velopass</h2>
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
          <div className="pc">
            <div className="pc-num">04</div>
            <div className="pc-icon"><ShieldCheck size={22} color="#0D1F3C" strokeWidth={1.8} /></div>
            <h3>Klant ontzorgd. Winkel vertrouwd.</h3>
            <p>Scan elke Velopass QR — ook van fietsen die je nog nooit hebt verkocht. De fietsdata gaat direct in je kassasysteem. Via de Velopass Pro App zie je meteen de volledige context: onderhoudshistorie, actieve services en contractinfo zoals een resterend leasebudget. Jouw klant weet: zijn fiets is in goede handen.</p>
            <div className="pc-reported">
              <AlertCircle size={16} color="#2ECC8A" strokeWidth={2} />
              <span>Scan je een <strong>REPORTED</strong> fiets? Dan word jij als onderdeel van de Velopass Community automatisch in contact gebracht met de eigenaar en/of politie.</span>
            </div>
          </div>
        </div>
      </section>

      <Fabrikanten />

      <Leasing />

      <section className="how" id="hoe-werkt-het">
        <p className="eyebrow">Hoe werkt het?</p>
        <h2 className="sec-title">Van verkoop tot actieve klantrelatie — in één scan.</h2>
        <div className="how-cols">
          <div>
            <div className="mlabel">Met kassasysteem (POS) <span className="mbadge">Aanbevolen</span></div>
            {[
              { n: 1, t: "Kleef de Frame-ID en scan de QR", d: "Vanuit je kassasysteem. De fiets is meteen geregistreerd op naam van je winkel." },
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
              { n: 2, t: "Kleef de Frame-ID en scan via de app", d: "Zelfde resultaat als met kassasysteem. Geen extra software nodig." },
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

      <ProCommunity activeShopsCount={activeShopsCount} />

      <section className="register" id="registreer">
        <div className="reg-inner">
          <div>
            <p className="eyebrow">Gratis starten</p>
            <h2 className="sec-title">Registreer je fietswinkel</h2>
            <p className="reg-sub">Registreer gratis en ontvang 5 kennismakingsstickers. Geen contract, geen verplichtingen. Jij bepaalt het tempo.</p>

            <div className="reg-package">
              <div className="reg-package-title">Jouw kennismakingspakket</div>
              <div className="reg-package-items">
                <div className="reg-package-item"><span className="reg-pcheck">✓</span><span className="reg-package-text">5 Velopass Frame-ID's — gratis</span></div>
                <div className="reg-package-item"><span className="reg-pcheck">✓</span><span className="reg-package-text">Toegang tot het Velopass partnerportaal</span></div>
                <div className="reg-package-item">
                  <span className="reg-pcheck">✓</span>
                  <span className="reg-package-text">Koppeling met je kassasysteem — fietsdata gaat automatisch in en uit</span>
                </div>
                <div className="reg-package-sub">CycleSoftware, Vendit, Wilmar en meer</div>
                <div className="reg-package-item">
                  <span className="reg-pcheck">✓</span>
                  <span className="reg-package-text">Gratis toegang tot de Velopass Pro App — voor wie onderweg scant of nog geen kassasysteem heeft</span>
                </div>
                <div className="reg-package-item"><span className="reg-pcheck">✓</span><span className="reg-package-text">Onboarding in jouw taal: NL · FR · EN</span></div>
              </div>
              <p className="reg-package-note">Na registratie nemen we binnen 2 werkdagen contact op en sturen we je pakket toe.</p>
            </div>

            {[
              { t: "POS-integratie of gratis app", d: "Werkt met je bestaand kassasysteem. Of gebruik de gratis Pro app." },
              { t: "Credits die oplopen", d: "Elke activatie brengt je dichter bij gratis gebruik." },
              { t: "Onboarding inbegrepen", d: "We helpen je op weg. In jouw taal." },
            ].map((f) => (
              <div className="rfeat" key={f.t}>
                <div className="rfeat-icon"><Check /></div>
                <div><h4>{f.t}</h4><p>{f.d}</p></div>
              </div>
            ))}
          </div>
          <RegisterForm />
        </div>
      </section>

      <Footer variant="pro" />
    </>
  );
}

function ProCommunity({ activeShopsCount }: { activeShopsCount: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const formatted = activeShopsCount.toLocaleString("nl-BE");
  return (
    <section className="pro-community" id="community">
      <div className="pcm-inner">
        <div className="pcm-header">
          <p className="eyebrow" style={{ color: "#2ECC8A" }}>De Velopass Community</p>
          <h2 className="pcm-title">
            Word deel van een <em>groeiend netwerk</em>
          </h2>
          <p className="pcm-sub">
            {formatted}+ fietswinkels zijn al aangesloten.
            Het netwerk groeit elke dag — en elke nieuwe winkel maakt het systeem sterker voor iedereen.
          </p>
          <p className="pcm-note">Fietsers in heel Europa kunnen al een Velopass bestellen.</p>
        </div>

        <div className="pcm-stats">
          <div className="pcm-stat">
            <div className="pcm-stat-num">{formatted}<span>+</span></div>
            <div className="pcm-stat-label">fietswinkels aangesloten</div>
          </div>
          <div className="pcm-stat">
            <div className="pcm-stat-num">+200<span>K</span></div>
            <div className="pcm-stat-label">fietsen geregistreerd</div>
          </div>
          <div className="pcm-stat">
            <div className="pcm-stat-num g">Europa</div>
            <div className="pcm-stat-label">in aanbouw · expanding daily</div>
          </div>
        </div>

        <div className="pcm-mapcard">
          <div className="pcm-mapcard-head">
            <div>
              <div className="pcm-mapcard-title">Aangesloten Velopass-fietswinkels</div>
              <div className="pcm-mapcard-sub">Jij hoort hier ook bij.</div>
            </div>
            <a href="#registreer" className="pcm-cta">Sluit je aan →</a>
          </div>
          <div className="pcm-map">
            {mounted ? (
              <Suspense fallback={<div className="sf-map-loading">Kaart laden...</div>}>
                <ProCommunityMap />
              </Suspense>
            ) : (
              <div className="sf-map-loading">Kaart laden...</div>
            )}
          </div>
        </div>

        <div className="pcm-tagline">
          Every bike. <span>A customer. For life.</span>
        </div>
      </div>
    </section>
  );
}

type Attr = "decal" | "lak" | "data" | "doos";
const BADGE_META: Record<Attr, { label: string; cls: string }> = {
  decal: { label: "Decal", cls: "fb-badge fb-decal" },
  lak: { label: "Op de lak", cls: "fb-badge fb-lak" },
  data: { label: "Fietsdata", cls: "fb-badge fb-data" },
  doos: { label: "Code op doos", cls: "fb-badge fb-doos" },
};

function Fabrikanten() {
  const features = [
    { icon: <Shield size={20} color="#2ECC8A" />, t: "Decal", d: "De Frame-ID is als decal ingebouwd bij de productie — onder de vernis, net zoals de merknaam en striping. Permanent en onverwijderbaar.", premium: true, badge: "Beste beveiliging" },
    { icon: <FileText size={20} color="#2ECC8A" />, t: "Fietsdata vooringevuld", d: "Merk, model en specificaties staan al in Velopass. De winkel en fietser hoeven niets meer manueel in te voeren." },
    { icon: <Package size={20} color="#2ECC8A" />, t: "Code op de verpakking", d: "De Velopass-code staat ook op de doos — eenvoudig te registreren bij levering, nog voor de fiets uitgestald wordt." },
  ];
  const makers: Array<{ name: string; attrs: Attr[]; sub: string; extra?: string }> = [
    { name: "Oxford", attrs: ["decal", "data", "doos"], sub: "Frame-ID als decal ingebouwd — permanent en onverwijderbaar. Data vooringevuld, code op de doos.", extra: "Oxford biedt via Velopass ook Oxford Assistance (by VAB) en garantieregistratie aan — automatisch gekoppeld aan elke verkochte fiets." },
    { name: "Granville", attrs: ["decal", "lak", "data"], sub: "Frame-ID ingebouwd onder de lak, met vooringevulde fietsdata." },
    { name: "Veloe", attrs: ["lak", "data"], sub: "Frame-ID op de lak met vooringevulde fietsdata." },
    { name: "Bike43", attrs: ["lak", "data"], sub: "Frame-ID op de lak met vooringevulde fietsdata." },
    { name: "Spectre", attrs: ["lak"], sub: "Frame-ID aangebracht bij productie." },
    { name: "Thompson", attrs: ["lak"], sub: "Frame-ID aangebracht bij productie." },
  ];
  return (
    <section className="fabrikanten" id="fabrikanten">
      <div className="fb-inner">
        <p className="eyebrow" style={{ color: "#1AAD70" }}>Geïntegreerd bij productie</p>
        <h2 className="sec-title">Topfabrikanten kiezen Velopass</h2>
        <p className="fb-sub">Steeds meer fabrikanten leveren hun fietsen al af met een Velopass Frame-ID op het frame. Scan bij ontvangst — fietsdata staat al klaar in je kassasysteem. Geen sticker plakken, geen data invoeren.</p>

        <div className="fb-features">
          {features.map((f) => (
            <div className={`fb-feat${f.premium ? " fb-feat-premium" : ""}`} key={f.t}>
              {f.badge && <span className="fb-feat-badge">{f.badge}</span>}
              <div className="fb-feat-icon">{f.icon}</div>
              <h4>{f.t}</h4>
              <p>{f.d}</p>
            </div>
          ))}
        </div>

        <div className="fb-grid">
          {makers.map((m) => (
            <div className="fb-card" key={m.name}>
              <div className="fb-name">{m.name}</div>
              <div className="fb-badges">
                {m.attrs.filter((a) => a !== "lak").map((a) => (
                  <span key={a} className={BADGE_META[a].cls}>{BADGE_META[a].label}</span>
                ))}
              </div>
              <div className="fb-cardsub">{m.sub}</div>
              {m.extra && (
                <div className="fb-card-extra">
                  <Sparkles size={13} color="#2ECC8A" />
                  <span>{m.extra}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="fb-flow">
          <div className="fb-zone fb-zone-dim fb-zone-border">
            <div className="fb-zone-tag">FABRIKANT</div>
            <div className="fb-flow-step">
              <div className="fb-flow-icon"><Truck size={24} /></div>
              <div className="fb-flow-label">LEVERING</div>
              <h4 className="fb-flow-title">Fiets arriveert</h4>
              <p className="fb-flow-body">De fiets wordt geleverd met een Velopass Frame-ID. Fietsdata staat al klaar in Velopass.</p>
            </div>
            <span className="fb-zone-connector">1 scan →</span>
          </div>

          <div className="fb-zone fb-zone-primary">
            <div className="fb-zone-tag fb-zone-tag-green">JOUW WINKEL — ENKEL DIT</div>
            <div className="fb-flow-step">
              <div className="fb-flow-icon fb-flow-icon-lg"><ScanLine size={28} /></div>
              <div className="fb-flow-label">ONTVANGST</div>
              <h4 className="fb-flow-title fb-flow-title-lg">Scan bij aankomst</h4>
              <p className="fb-flow-body fb-flow-body-bright">Scan de code op de doos of op de fiets na uitpakken. Fietsdata staat automatisch klaar in je kassasysteem. Dat is alles.</p>
            </div>
            <div className="fb-zone-divider"><span className="fb-zone-badge">Automatisch →</span></div>
          </div>

          <div className="fb-zone fb-zone-dim">
            <div className="fb-zone-tag">AUTOMATISCH</div>
            <div className="fb-substeps">
              <div className="fb-substep">
                <div className="fb-flow-icon fb-flow-icon-sm"><Mail size={20} /></div>
                <div className="fb-flow-label fb-flow-label-sm">BIJ VERKOOP</div>
                <h5 className="fb-substep-title">Email naar klant</h5>
                <p className="fb-substep-body">Velopass stuurt automatisch een e-mail uit jouw naam bij de facturatie.</p>
              </div>
              <div className="fb-substep">
                <div className="fb-flow-icon fb-flow-icon-sm"><CheckCircle2 size={20} /></div>
                <div className="fb-flow-label fb-flow-label-sm">KLANT</div>
                <h5 className="fb-substep-title">Velopass openen</h5>
                <p className="fb-substep-body">De klant kiest een wachtwoord. Zijn Velopass staat al klaar.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="fb-flow-closing">
          <span className="fb-flow-closing-dim">Geen sticker plakken. Geen data invoeren.</span>{" "}
          <span className="fb-flow-closing-green">Scan bij ontvangst — en de rest gaat vanzelf.</span>
        </div>

        <div className="fb-cta-card">
          <h3 className="fb-cta-title">Maak het leven van je dealer eenvoudiger</h3>
          <p className="fb-cta-body">Fabrikanten die Velopass integreren geven hun dealers een vliegende start. De fiets is klaar voor gebruik voor hij de winkelrekken bereikt. Wil je weten wat Velopass voor jouw merk en je dealernetwerk kan betekenen?</p>
          <a href="mailto:info@velopass.com" className="fb-cta-btn">Praat met ons →</a>
        </div>
      </div>
    </section>
  );
}

function Leasing() {
  const navy = "#0D1F3C";
  const green = "#2ECC8A";
  const muted = "#5A7090";
  const cream = "#F5F3EE";

  const problems = [
    "Voorraad bijhouden per leasingmaatschappij",
    "Risico op verkeerde sticker op verkeerde fiets",
    "Tijdverlies bij elke leasingfiets",
  ];
  const solutions = [
    "Eén sticker voor leasing, particulier en bedrijfsfietsen",
    "Betaald door de leasingmaatschappij — met marge voor de dealer",
    "Compatibel met de meeste leasingmaatschappijen",
    "Geen voorraadbeheer per maatschappij",
  ];
  const scanItems: Array<{ icon: React.ReactNode; title: string; body: string }> = [
    { icon: <Building2 size={18} color={green} />, title: "Welke leasingmaatschappij", body: "Naam en logo van de maatschappij" },
    { icon: <Wallet size={18} color={green} />, title: "Resterend onderhoudsbudget", body: "Beschikbaar bedrag voor onderhoud" },
    { icon: <CalendarDays size={18} color={green} />, title: "Einddatum leasing", body: "Wanneer het contract afloopt" },
    { icon: <ExternalLink size={18} color={green} />, title: "Directe link naar het portaal", body: "Rechtstreeks naar de leasingmaatschappij" },
    { icon: <ClipboardList size={18} color={green} />, title: "Volledige fietshistorie", body: "Alle vorige onderhoudsbeurten" },
  ];

  return (
    <section id="leasing" style={{ background: "#FFFFFF", padding: "96px 6vw" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 600,
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: green,
            marginBottom: 14,
          }}
        >
          Leasingmaatschappijen
        </p>
        <h2
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(28px, 3.6vw, 40px)",
            color: navy,
            lineHeight: 1.15,
            marginBottom: 16,
            maxWidth: 720,
          }}
        >
          Eén sticker. Alle leasingmaatschappijen.
        </h2>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 15,
            color: muted,
            lineHeight: 1.65,
            maxWidth: 600,
            marginBottom: 48,
          }}
        >
          Vroeger had elke leasingmaatschappij zijn eigen sticker — met alle logistieke rompslomp van dien. Velopass heeft dat geharmoniseerd.
        </p>

        {/* Problem + Solution cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 20,
            marginBottom: 56,
          }}
        >
          {/* Problem */}
          <div
            style={{
              background: cream,
              borderLeft: "3px solid #E07A4F",
              borderRadius: 12,
              padding: 24,
            }}
          >
            <h3
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: 14,
                color: navy,
                marginBottom: 16,
              }}
            >
              Vroeger: één sticker per leasingmaatschappij
            </h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
              {problems.map((p) => (
                <li
                  key={p}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 14,
                    color: muted,
                    lineHeight: 1.55,
                  }}
                >
                  <X size={16} color="#E07A4F" strokeWidth={2.4} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Solution */}
          <div
            style={{
              background: "rgba(46,204,138,0.06)",
              borderLeft: `3px solid ${green}`,
              borderRadius: 12,
              padding: 24,
            }}
          >
            <h3
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: 14,
                color: navy,
                marginBottom: 16,
              }}
            >
              Nu: één Frame-ID voor alle klantsoorten
            </h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
              {solutions.map((s) => (
                <li
                  key={s}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 14,
                    color: muted,
                    lineHeight: 1.55,
                  }}
                >
                  <CheckIcon size={16} color={green} strokeWidth={2.4} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Scan reveals - two column */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "clamp(32px, 5vw, 64px)",
            alignItems: "center",
            marginBottom: 56,
          }}
        >
          {/* Left: text + features */}
          <div>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: green,
                marginBottom: 12,
              }}
            >
              Via app of kassasysteem
            </p>
            <h3
              style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 700,
                fontSize: 28,
                color: navy,
                marginBottom: 12,
                lineHeight: 1.2,
              }}
            >
              Eén scan. Alles wat je nodig hebt.
            </h3>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                color: muted,
                marginBottom: 24,
                lineHeight: 1.65,
              }}
            >
              Scan de Frame-ID bij ontvangst en zie onmiddellijk alle info over de leasefiets — zonder te bellen, zonder te zoeken.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
              {scanItems.map((it) => (
                <li
                  key={it.title}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 14,
                    color: navy,
                    lineHeight: 1.5,
                  }}
                >
                  <CheckIcon size={18} color={green} strokeWidth={2.4} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{it.title}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: app mockup */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <img
              src={leasingAppMockup}
              alt="Velopass Pro app op smartphone met leasinggegevens naast een blauwe e-bike"
              style={{
                width: "100%",
                maxHeight: 520,
                objectFit: "contain",
                borderRadius: 12,
                filter: "drop-shadow(0 20px 40px rgba(13,31,60,0.15))",
              }}
            />
          </div>
        </div>



        {/* CTA */}
        <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontStyle: "italic",
              fontSize: 13,
              color: muted,
              lineHeight: 1.6,
              marginBottom: 18,
            }}
          >
            Nog geen partner? Registreer gratis en ontvang 5 Frame-ID stickers om uit te proberen.
          </p>
          <a
            href="#registreer"
            style={{
              display: "inline-block",
              background: green,
              color: navy,
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
              fontSize: 14,
              padding: "14px 24px",
              borderRadius: 10,
              textDecoration: "none",
            }}
          >
            Registreer je fietswinkel →
          </a>
        </div>
      </div>
    </section>
  );
}
