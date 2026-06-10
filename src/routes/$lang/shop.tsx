import { useState, useMemo, lazy, Suspense, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Shield, ShieldCheck, FileText, Package, Truck, ScanLine, Mail, CheckCircle2, Sparkles, Building2, Wallet, CalendarDays, ExternalLink, ClipboardList, X, Check as CheckIcon, AlertCircle, Smartphone, Link2, Sticker, QrCode, Send, RefreshCw, Monitor } from "lucide-react";
import { VelopassMark } from "@/components/VelopassMark";
import { Footer } from "@/components/Footer";
import shopsData from "@/data/shops.json";
import { RegisterForm } from "@/components/ProRegisterForm";
import leasingAppMockup from "@/assets/leasing-app-mockup-v2.png";
import fabOxford from "@/assets/fab-oxford.jpg";
import fabBike43 from "@/assets/fab-bike43.jpg";
import fabFrameId from "@/assets/fab-frameid.jpg";
import fabGranville from "@/assets/fab-granville.jpg";
import kbcLogo from "@/assets/kbc-logo.png";



const ProCommunityMap = lazy(() => import("@/components/ProCommunityMap"));

export const Route = createFileRoute("/$lang/shop")({
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
          <li><a href="#voordelen">Voordelen</a></li>
          <li><a href="#hoe-werkt-het">Hoe werkt het?</a></li>
          <li><a href="#fabrikanten">Fabrikanten</a></li>
          <li><a href="#leasing">Leasing</a></li>
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

      <section
        className="pro-hero"
        style={{
          backgroundImage: `linear-gradient(105deg, rgba(13,31,60,0.88) 0%, rgba(13,31,60,0.80) 45%, rgba(13,31,60,0.55) 100%), url('https://images.unsplash.com/photo-1675798225739-d8919b7a23f7?w=1920&q=80')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="pro-hero-left">
          <span className="hero-eyebrow"><span className="eyebrow-dot" />Word deel van een groeiende community</span>
          <h1 className="pro-hero-title">Jouw klanten blijven<br /><em>altijd jouw klanten.</em></h1>
          <p className="pro-hero-sub">Zolang de fiets rijdt, blijft jouw winkel hun eerste aanspreekpunt.</p>
          <div className="hero-ctas">
            <a href="#registreer" className="btn-g">Registreer je fietswinkel</a>
            <a href="#hoe-werkt-het" className="btn-s dark">Hoe werkt het? →</a>
          </div>
          <div className="hero-stats">
            <div><div className="stat-num">{activeShopsCount.toLocaleString("nl-BE")}<span>+</span></div><div className="stat-label">fietswinkels actief</div></div>
            <div><div className="stat-num">+200<span>K</span></div><div className="stat-label">fietsen geregistreerd</div></div>
            <div><div className="stat-num">22<span>%</span></div><div className="stat-label">hogere klantentretentie</div></div>
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

      <section className="pijlers" id="voordelen">
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
            <div className="pc-icon"><ScanLine size={22} color="#0D1F3C" strokeWidth={1.8} /></div>
            <h3>Eén scan, volledig beeld</h3>
            <p>Scan de QR bij elke fiets — ook van fietsen die je nog nooit hebt verkocht. Je ziet meteen de onderhoudshistorie, actieve services en contractinfo zoals een resterend leasebudget. Een onbekende fiets? Automatisch aangemaakt in je kassasysteem.</p>
            <div className="pc-reported-orange">
              <AlertCircle size={13} color="#F59E0B" strokeWidth={2} />
              <span>Scan je een <strong style={{ color: "#F59E0B" }}>REPORTED</strong> fiets? Via Velopass kan je de eigenaar en/of politie op de hoogte brengen.</span>
            </div>
          </div>
          <div className="pc">
            <div className="pc-num">04</div>
            <div className="pc-icon"><Smartphone size={22} color="#0D1F3C" strokeWidth={1.8} /></div>
            <h3>Gratis tool voor je team</h3>
            <p>De Velopass Pro App is gratis voor elke technieker in je winkel. Scan, registreer en beheer fietsen van op de werkvloer — zonder extra software, zonder abonnement. Werkt naast je kassasysteem of volledig zelfstandig.</p>
          </div>
        </div>
      </section>

      <section className="how" id="hoe-werkt-het">
        <p className="eyebrow">HOE WERKT HET?</p>
        <h2 className="sec-title">
          Van verkoop tot actieve klantrelatie —{" "}
          <span style={{ color: "#2ECC8A" }}>in één scan.</span>
        </h2>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div className="mstep">
            <div className="mnum">1</div>
            <div style={{ flex: 1 }}>
              <h4>Scan of registreer de fiets</h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 10 }}>
                <div style={{ background: "rgba(46,204,138,0.08)", borderRadius: 10, padding: 16, borderLeft: "3px solid #2ECC8A", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#2ECC8A" }}>
                    <Monitor size={16} color="#2ECC8A" strokeWidth={2} /> Kassasysteem
                  </div>
                  <h5 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#fff", fontFamily: "'DM Sans', sans-serif" }}>Via kassasysteem</h5>
                  <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.55 }}>Fiets- en klantdata — inclusief e-mailadres — zijn al aanwezig. Scan de Frame-ID en factureer de fiets. Alles gebeurt automatisch.</p>
                  <span style={{ marginTop: "auto", alignSelf: "flex-start", fontSize: 11, fontWeight: 600, color: "#2ECC8A", background: "rgba(46,204,138,0.15)", padding: "4px 8px", borderRadius: 6 }}>✓ Enkel scannen en factureren</span>
                </div>
                <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: 16, borderLeft: "3px solid rgba(255,255,255,0.3)", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#fff" }}>
                    <Smartphone size={16} color="#fff" strokeWidth={2} /> Pro App
                  </div>
                  <h5 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#fff", fontFamily: "'DM Sans', sans-serif" }}>Via de Pro App</h5>
                  <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.55 }}>Geef de klantdata manueel in, inclusief het e-mailadres. Fietsdata wordt automatisch ingeladen als de fabrikant die heeft vooringevuld — zo niet, geef je die ook manueel in.</p>
                  <span style={{ marginTop: "auto", alignSelf: "flex-start", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.08)", padding: "4px 8px", borderRadius: 6 }}>Gratis te downloaden</span>
                </div>
              </div>
            </div>
          </div>
          {[
            { n: 2, icon: <Send size={16} strokeWidth={2} />, t: "De klant krijgt een uitnodiging van jouw winkel", d: "Velopass verstuurt automatisch een e-mail namens jouw winkel — met jouw winkelnaam. De klant ziet: 'Jouw Velopass staat klaar.' Hij kiest enkel nog een wachtwoord — in 1 minuut klaar.", note: "" },
            { n: 3, icon: <RefreshCw size={16} strokeWidth={2} />, t: "Automatisch contact", d: "Velopass stuurt onderhoudsherinneringen in jouw naam. Jij bepaalt zelf welke herinneringen worden verstuurd, wanneer — of helemaal geen. De klant blijft verbonden met jouw winkel zonder dat jij er nog iets voor hoeft te doen.", note: "" },
          ].map((s) => (
            <div className="mstep" key={s.n}>
              <div className="mnum">{s.n}</div>
              <div>
                <h4 style={{ display: "flex", alignItems: "center", gap: 8 }}>{s.icon} {s.t}</h4>
                <p>{s.d}</p>
                {s.note && <p style={{ marginTop: 6, fontSize: 12, fontStyle: "italic", color: "rgba(255,255,255,0.45)" }}>{s.note}</p>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <Fabrikanten />

      <Leasing />

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

      <ProCommunity activeShopsCount={activeShopsCount} />

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
  const makers: Array<{ name: string; attrs: Attr[]; sub: string; extra?: string; logo?: string }> = [
    { name: "Oxford", attrs: ["decal", "data", "doos"], sub: "Frame-ID als decal ingebouwd — permanent en onverwijderbaar. Data vooringevuld, code op de doos.", extra: "Oxford biedt via Velopass ook Oxford Assistance (by VAB) en garantieregistratie aan — automatisch gekoppeld aan elke verkochte fiets.", logo: "https://cdn.prod.website-files.com/66538f2ad65b2084a18d9d09/666c4e21b72c3a8feea5c9e8_oxford%20logo.png" },
    { name: "Granville", attrs: ["decal", "lak", "data"], sub: "Frame-ID ingebouwd onder de lak, met vooringevulde fietsdata.", extra: "Granville activeert de garantie automatisch via Velopass — gekoppeld aan elke nieuwe fiets.", logo: "https://cdn.prod.website-files.com/66538f2ad65b2084a18d9d09/67910d67578d775904d1a1de_Granville%20logo.png" },
    { name: "Veloe", attrs: ["lak", "data"], sub: "Frame-ID op de lak met vooringevulde fietsdata.", logo: "https://cdn.prod.website-files.com/66538f2ad65b2084a18d9d09/680b77032634561d90f2037b_veloe-logo-black-transparant.png" },
    { name: "Bike43", attrs: ["lak"], sub: "Frame-ID op het frame aangebracht — geen fietsdata vooringevuld.", logo: "https://cdn.prod.website-files.com/66538f2ad65b2084a18d9d09/666c507342c67709752afa70_Bike%2043%20logo.png" },
    { name: "UrbanBiker", attrs: ["lak"], sub: "Frame-ID op het frame aangebracht — geen fietsdata vooringevuld.", logo: "https://www.urbanbiker.com/wp-content/uploads/2023/03/cropped-Icono-principal-sin-fondo-270x270.png" },
    { name: "Lev", attrs: ["lak"], sub: "Frame-ID op het frame aangebracht — geen fietsdata vooringevuld.", logo: "https://www.golev.eu/apple-touch-icon.png" },
    { name: "Specter", attrs: ["lak"], sub: "Frame-ID op het frame aangebracht — geen fietsdata vooringevuld.", logo: "https://cdn.prod.website-files.com/66538f2ad65b2084a18d9d09/66c31ea4b8feecaefcc34807_specter%20logo.png" },
    { name: "Thompson", attrs: ["lak"], sub: "Frame-ID op het frame aangebracht — geen fietsdata vooringevuld.", logo: "https://cdn.prod.website-files.com/66538f2ad65b2084a18d9d09/66c09339ca49535d8bfbd2b0_thompson%20logo.png" },
    { name: "Flebi", attrs: ["lak"], sub: "Frame-ID op het frame aangebracht — geen fietsdata vooringevuld.", logo: "https://flebi.com/wp-content/uploads/2024/10/cropped-Flebi_icono_positivo-270x270.png" },
  ];
  return (
    <section className="fabrikanten" id="fabrikanten">
      <div className="fb-inner">
        <p className="eyebrow" style={{ color: "#1AAD70" }}>Geïntegreerd bij productie</p>
        <h2 className="sec-title">Topfabrikanten kiezen Velopass</h2>
        <p className="fb-sub">Steeds meer fabrikanten leveren hun fietsen al af met een Velopass Frame-ID op het frame. Scan bij ontvangst — fietsdata staat al klaar in je kassasysteem. Geen sticker plakken, geen data invoeren.</p>

        <div className="fb-gallery">
          <figure className="fb-shot">
            <img src={fabOxford} alt="Oxford e-bike frame met Velopass Frame-ID, geïntegreerd bij productie" loading="lazy" />
            <figcaption>Oxford — Frame-ID geïntegreerd bij productie</figcaption>
          </figure>
          <figure className="fb-shot">
            <img src={fabGranville} alt="Granville e-bike met Velopass Frame-ID sticker op de zadelpen" loading="lazy" />
            <figcaption>Granville — Frame-ID geïntegreerd bij productie</figcaption>
          </figure>
          <figure className="fb-shot">
            <img src={fabBike43} alt="Bike43 cargo e-bike met Velopass Frame-ID op het frame" loading="lazy" />
            <figcaption>Bike43 — Velopass al op het frame bij levering</figcaption>
          </figure>
          <figure className="fb-shot">
            <img src={fabFrameId} alt="Velopass Frame-ID sticker macro met SECURED label en QR-code" loading="lazy" />
            <figcaption>Eén scan. Fietsdata staat klaar.</figcaption>
          </figure>
        </div>

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
              {m.logo && (
                <img
                  src={m.logo}
                  alt={`${m.name} logo`}
                  className={`fb-card-logo ${m.name === 'Specter' ? 'fb-card-logo--specter' : m.name === 'Granville' ? 'fb-card-logo--granville' : ''}`}
                  loading="lazy"
                />
              )}
              <div className="fb-name">{m.name}</div>
              <div className="fb-badges">
                {m.attrs.filter((a) => a !== "lak").map((a) => (
                  <span key={a} className={BADGE_META[a].cls}>{BADGE_META[a].label}</span>
                ))}
              </div>
              <div className="fb-cardsub">{m.sub}</div>
              {m.extra && (
                <div className="fb-card-extra">
                  {m.name === "Granville" ? <ShieldCheck size={13} color="#2ECC8A" /> : <Sparkles size={13} color="#2ECC8A" />}
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
    { icon: <CalendarDays size={18} color={green} />, title: "Contractnummer en einddatum leasing", body: "Wanneer het contract afloopt" },
    { icon: <ExternalLink size={18} color={green} />, title: "Directe link naar deze fiets in het portaal van de leasemaatschappij", body: "Rechtstreeks naar de leasingmaatschappij" },
    { icon: <ClipboardList size={18} color={green} />, title: "Volledige onderhoudshistorie", body: "Alle vorige onderhoudsbeurten" },
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
          Elke leasingmaatschappij had zijn eigen sticker met een uniek nummer. Slim in zijn eenvoud — maar voor de dealer betekende dat voorraad per maatschappij en geen digitale info. Velopass harmoniseerde dat.
        </p>

        {/* Logo strip */}
        <div
          style={{
            borderTop: "1px solid rgba(13,31,60,0.08)",
            borderBottom: "1px solid rgba(13,31,60,0.08)",
            padding: "24px 0",
            marginBottom: 48,
          }}
        >
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: green,
              textAlign: "center",
              marginBottom: 10,
            }}
          >
            AANGESLOTEN LEASINGMAATSCHAPPIJEN
          </p>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              color: muted,
              lineHeight: 1.6,
              maxWidth: 520,
              margin: "0 auto 20px",
              textAlign: "center",
            }}
          >
            Zij hebben Velopass geïntegreerd — minder administratie voor jou, meer service voor je klanten.
          </p>
          <div className="leasing-logos">
            <div className="logo-tile"><img src="https://cdn.prod.website-files.com/66538f2ad65b2084a18d9d09/668e8739b353377af0a24598_cyclis-300x112.png" alt="Cyclis" /></div>
            <div className="logo-tile"><img src={kbcLogo} alt="KBC" /></div>
            <div className="logo-tile"><img src="https://cdn.prod.website-files.com/66538f2ad65b2084a18d9d09/666c50aaf0e1ba5e869a3fc1_Logo_Joule.svg" alt="Joule" style={{ maxHeight: 24 }} /></div>
            <div className="logo-tile"><img src="https://cdn.prod.website-files.com/66538f2ad65b2084a18d9d09/66c317c971ffa1b69d08dab5_cycle%20valley%20logo%201.jpg" alt="Cycle Valley" /></div>
            <div className="logo-tile"><img src="https://hertlease.be/build/assets/logo-B0RsqD4r.png" alt="Hert Lease" style={{ maxHeight: 24 }} /></div>
          </div>
        </div>

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
              borderRadius: 20,
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
              borderRadius: 20,
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



        {/* Hoe het werkt — 3 stappen */}
        <div style={{ marginBottom: 56 }}>
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
            Zo simpel is het
          </p>
          <h3
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: 28,
              color: navy,
              marginBottom: 20,
              lineHeight: 1.2,
            }}
          >
            Koppel een leasefiets in 2 stappen
          </h3>
          {/* Context banner */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "#F5F3EE",
              borderLeft: "3px solid #D1D5DB",
              borderRadius: 8,
              padding: "12px 16px",
              marginBottom: 24,
            }}
          >
            <CheckCircle2 size={14} color="#6B7280" style={{ flexShrink: 0 }} />
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                color: "#6B7280",
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              De fietsdata zit al in je kassasysteem — via een eerdere scan of manuele ingave.
            </p>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 20,
            }}
          >
            {[
              {
                n: "01",
                icon: <Sticker size={22} color={green} />,
                title: "Plak de Velopass Frame-ID",
                body: "Heeft de fiets nog geen Velopass Frame-ID? Plak er één op het frame. Dat duurt 10 seconden.",
                note: "Veel fabrikanten leveren de fiets er al mee — dan sla je deze stap over.",
                tag: "JOUW ACTIE",
                variant: "action" as const,
              },
              {
                n: "02",
                icon: <Link2 size={22} color={green} />,
                title: "Voer de code in het leaseportaal in",
                body: "Geef de Velopass-code van de fiets in het portaal van de leasingmaatschappij. Klaar — de fiets, eigenaar en het portaal zijn gekoppeld.",
                tag: "JOUW ACTIE",
                variant: "action" as const,
              },
            ].map((s) => {
              const isAction = s.variant === "action";
              return (
                <div
                  key={s.n}
                  style={{
                    background: isAction ? "rgba(46,204,138,0.06)" : "#F5F3EE",
                    borderRadius: 12,
                    borderLeft: isAction ? `3px solid ${green}` : "3px solid #D1D5DB",
                    padding: 24,
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                    position: "relative",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: 14,
                      right: 16,
                      fontFamily: "'DM Sans', sans-serif",
                      fontWeight: 600,
                      fontSize: 9,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: isAction ? green : "#9CA3AF",
                    }}
                  >
                    {s.tag}
                  </span>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: "50%",
                      background: isAction ? "rgba(46,204,138,0.15)" : "rgba(156,163,175,0.18)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "'Syne', sans-serif",
                      fontWeight: 700,
                      fontSize: 22,
                      color: isAction ? navy : "#6B7280",
                    }}
                  >
                    {s.n}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {s.icon}
                    <h4
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontWeight: 600,
                        fontSize: 16,
                        color: isAction ? navy : "#6B7280",
                        margin: 0,
                      }}
                    >
                      {s.title}
                    </h4>
                  </div>
                  <p
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 14,
                      color: isAction ? muted : "#6B7280",
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    {s.body}
                  </p>
                  {s.note && (
                    <p
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontStyle: "italic",
                        fontSize: 11,
                        color: muted,
                        margin: 0,
                      }}
                    >
                      {s.note}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Resultaat banner */}
          <div
            style={{
              marginTop: 24,
              background: navy,
              borderRadius: 12,
              padding: "18px 22px",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <ScanLine size={22} color={green} style={{ flexShrink: 0 }} />
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                color: "#FFFFFF",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              Scan je de fiets daarna met de Pro App of kassasysteem? Dan zie je meteen alles: <span style={{ color: green, fontWeight: 600 }}>maatschappij, budget, contractnummer, einddatum, en meer...</span>
            </p>
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
