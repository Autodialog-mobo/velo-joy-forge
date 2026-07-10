import { createFileRoute } from "@tanstack/react-router";
import { trackShopSignupCtaClick } from "@/lib/analytics";
import stickerImg from "@/assets/velopass-sticker.webp";

const ORG_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Velopass",
  url: "https://velopass.com/fr",
  logo: "https://velopass.com/logo.png",
  description:
    "Velopass est un opérateur d'identification de cycles agréé (FNUCI) qui protège les vélos contre le vol et transforme chaque vélo marqué en une relation client durable pour le vélociste.",
  areaServed: { "@type": "Place", name: "Europe" },
  contactPoint: {
    "@type": "ContactPoint",
    email: "support@velopass.com",
    telephone: "+32471601573",
    contactType: "sales",
    availableLanguage: ["French", "Dutch", "English"],
  },
  memberOf: {
    "@type": "Organization",
    name: "APIC — Association de Promotion de l'Identification des Cycles",
    url: "https://apic-asso.com",
  },
};

const FAQS = [
  {
    q: "Velopass est-il un opérateur d'identification de cycles agréé ?",
    a: "Oui. Velopass est un opérateur d'identification agréé référencé par l'APIC. Les vélos marqués sont enregistrés dans le FNUCI (Fichier National Unique des Cycles Identifiés), conformément à la réglementation française.",
  },
  {
    q: "Comment devenir point de marquage vélo Velopass ?",
    a: "L'inscription des vélocistes est gratuite et se fait en ligne sur velopass.com/fr/shop. Vous recevez les étiquettes Frame-ID et marquez les vélos directement en magasin ; l'enregistrement dans le FNUCI est immédiat.",
  },
  {
    q: "Le marquage des vélos est-il obligatoire en France ?",
    a: "Oui. Depuis la loi d'orientation des mobilités (loi LOM), tout vélo neuf vendu par un professionnel doit être identifié. Le marquage doit être réalisé par un opérateur agréé et enregistré dans le FNUCI.",
  },
  {
    q: "Quel procédé d'identification Velopass utilise-t-il ?",
    a: "Velopass utilise une étiquette adhésive inviolable (Frame-ID) dotée d'un code QR et d'un identifiant unique. Toute tentative de retrait détruit l'étiquette et laisse des traces visibles.",
  },
  {
    q: "Qu'est-ce que Velopass apporte de plus qu'un simple marquage ?",
    a: "Au-delà de la conformité, chaque vélo marqué devient une relation client durable : rappels d'entretien automatiques, carnet numérique à vie, et intégrations avec les fabricants, sociétés de leasing et assureurs. Le vélociste reste en contact avec ses clients après la vente.",
  },
];

const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export const Route = createFileRoute("/$lang/marquage-velo")({
  head: () => ({
    meta: [
      { title: "Devenir opérateur de marquage vélo agréé | Velopass pour vélocistes" },
      {
        name: "description",
        content:
          "Velopass est un opérateur d'identification de cycles agréé (APIC / FNUCI). Devenez point de marquage vélo agréé : conformité loi LOM, enregistrement FNUCI, et chaque vélo marqué devient une relation client durable. Inscription gratuite pour les vélocistes.",
      },
      {
        name: "keywords",
        content:
          "marquage vélo, opérateur identification cycles agréé, FNUCI, loi LOM, devenir point de marquage, vélociste, APIC, identification vélo obligatoire",
      },
      { name: "robots", content: "index,follow,max-image-preview:large" },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "fr_FR" },
      { property: "og:site_name", content: "Velopass" },
      {
        property: "og:title",
        content: "Devenir opérateur de marquage vélo agréé | Velopass pour vélocistes",
      },
      {
        property: "og:description",
        content:
          "Opérateur d'identification de cycles agréé (FNUCI). Conformité loi LOM et chaque vélo marqué devient une relation client durable.",
      },
      { property: "og:url", content: "https://www.velopass.com/fr/marquage-velo" },
    ],
    links: [
      { rel: "canonical", href: "https://www.velopass.com/fr/marquage-velo" },
      { rel: "alternate", hrefLang: "fr", href: "https://www.velopass.com/fr/marquage-velo" },
      { rel: "alternate", hrefLang: "x-default", href: "https://www.velopass.com/fr/marquage-velo" },
    ],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(ORG_JSONLD) },
      { type: "application/ld+json", children: JSON.stringify(FAQ_JSONLD) },
    ],
  }),
  component: VelocistesLanding,
});

const CSS = `
.vlp{--navy:#0D1F3C;--navy-mid:#183A6E;--green:#2ECC8A;--green-dark:#1AAD70;--green-pale:#E8FAF3;--off-white:#F5F3EE;--white:#FFFFFF;--text-mid:#2A3F5F;--muted:#5A7090;--border:rgba(13,31,60,0.1);font-family:'DM Sans',sans-serif;background:var(--off-white);color:var(--navy);line-height:1.65;-webkit-font-smoothing:antialiased}
.vlp *{margin:0;padding:0;box-sizing:border-box}
.vlp a{color:inherit;text-decoration:none}
.vlp h1,.vlp h2,.vlp h3{font-family:'Syne',sans-serif;letter-spacing:-0.02em;line-height:1.12}
.vlp .wrap{max-width:1080px;margin:0 auto;padding:0 6vw}
.vlp nav.vnav{position:sticky;top:0;z-index:50;background:rgba(245,243,238,0.9);backdrop-filter:blur(10px);border-bottom:1px solid var(--border)}
.vlp .nav-in{display:flex;align-items:center;justify-content:space-between;padding:14px 6vw}
.vlp .brand{display:flex;align-items:center;gap:10px}
.vlp .mark{width:34px;height:34px;background:var(--green);border-radius:9px;display:flex;align-items:center;justify-content:center}
.vlp .mark svg{width:18px;height:18px}
.vlp .brand>span:last-child{font-family:'Syne',sans-serif;font-weight:700;font-size:19px}
.vlp .nav-cta{background:var(--navy);color:#fff;font-weight:500;font-size:14px;padding:9px 18px;border-radius:10px}
.vlp .hero{background:var(--navy);color:#fff;position:relative;overflow:hidden}
.vlp .hero::before{content:'';position:absolute;top:-260px;right:-160px;width:640px;height:640px;border-radius:50%;background:rgba(46,204,138,0.06)}
.vlp .hero-in{position:relative;z-index:1;padding:72px 0 76px}
.vlp .eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:var(--green);background:rgba(46,204,138,0.1);border:1px solid rgba(46,204,138,0.25);padding:6px 14px;border-radius:100px;margin-bottom:26px}
.vlp .dot{width:6px;height:6px;border-radius:50%;background:var(--green)}
.vlp .hero h1{font-weight:800;font-size:clamp(34px,5vw,58px);max-width:840px;margin-bottom:22px}
.vlp .hero h1 em{font-style:normal;color:var(--green)}
.vlp .hero .lead{font-size:clamp(16px,2vw,19px);color:rgba(255,255,255,0.7);max-width:620px;margin-bottom:34px}
.vlp .btns{display:flex;flex-wrap:wrap;gap:14px}
.vlp .btn-p{background:var(--green);color:var(--navy);font-weight:700;font-size:15px;padding:15px 28px;border-radius:12px}
.vlp .btn-s{border:1.5px solid rgba(255,255,255,0.25);color:#fff;font-weight:500;font-size:15px;padding:15px 26px;border-radius:12px}
.vlp .trust{display:flex;flex-wrap:wrap;gap:26px;margin-top:44px;padding-top:28px;border-top:1px solid rgba(255,255,255,0.12)}
.vlp .trust div{font-size:13px;color:rgba(255,255,255,0.6)}
.vlp .trust strong{display:block;font-family:'Syne',sans-serif;font-size:22px;color:#fff;font-weight:700}
.vlp .legal{background:var(--green-pale);border-bottom:1px solid rgba(46,204,138,0.2)}
.vlp .legal-in{padding:20px 0;display:flex;align-items:center;gap:16px;flex-wrap:wrap;font-size:14px;color:var(--text-mid)}
.vlp .legal strong{color:var(--navy)}
.vlp .legal .chip{font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--green-dark);background:#fff;border:1px solid rgba(46,204,138,0.3);padding:5px 12px;border-radius:100px;flex-shrink:0}
.vlp section{padding:72px 0}
.vlp .sec-label{font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:var(--green-dark);margin-bottom:14px}
.vlp h2.sec{font-size:clamp(26px,3.4vw,40px);margin-bottom:16px;max-width:720px}
.vlp .sec-desc{font-size:16px;color:var(--muted);max-width:640px;margin-bottom:12px}
.vlp .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:40px}
.vlp .card{background:var(--white);border:1px solid var(--border);border-radius:18px;padding:28px}
.vlp .card .ic{width:44px;height:44px;background:var(--green-pale);border-radius:11px;display:flex;align-items:center;justify-content:center;margin-bottom:16px;font-size:20px}
.vlp .card h3{font-size:18px;font-weight:700;margin-bottom:8px}
.vlp .card p{font-size:14px;color:var(--muted);line-height:1.6}
.vlp .steps{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:40px}
.vlp .step{background:var(--white);border:1px solid var(--border);border-radius:16px;padding:24px;position:relative}
.vlp .step .n{font-family:'Syne',sans-serif;font-weight:800;font-size:14px;color:var(--green-dark);margin-bottom:12px}
.vlp .step h3{font-size:16px;font-weight:700;margin-bottom:6px}
.vlp .step p{font-size:13.5px;color:var(--muted)}
.vlp .diff{background:var(--navy);color:#fff;border-radius:28px;padding:52px;position:relative;overflow:hidden}
.vlp .diff::before{content:'';position:absolute;bottom:-140px;left:-80px;width:420px;height:420px;border-radius:50%;background:rgba(46,204,138,0.06)}
.vlp .diff-in{position:relative;z-index:1}
.vlp .diff .sec-label{color:var(--green)}
.vlp .diff h2{font-family:'Syne',sans-serif;font-size:clamp(24px,3vw,34px);font-weight:700;margin-bottom:14px;max-width:640px}
.vlp .diff .lead{font-size:16px;color:rgba(255,255,255,0.6);max-width:620px;margin-bottom:36px}
.vlp .diff-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
.vlp .diff-item{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:22px}
.vlp .diff-item h3{font-size:15px;font-weight:700;color:#fff;margin-bottom:6px}
.vlp .diff-item h3 span{color:var(--green);margin-right:8px}
.vlp .diff-item p{font-size:13.5px;color:rgba(255,255,255,0.55);line-height:1.6}
.vlp details{background:var(--white);border:1px solid var(--border);border-radius:14px;padding:4px 24px;margin-bottom:12px}
.vlp details summary{font-family:'Syne',sans-serif;font-weight:700;font-size:16.5px;padding:18px 0;cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:16px}
.vlp details summary::-webkit-details-marker{display:none}
.vlp details summary::after{content:'+';font-size:22px;color:var(--green-dark);font-weight:400;flex-shrink:0}
.vlp details[open] summary::after{content:'\u2013'}
.vlp details p{font-size:14.5px;color:var(--text-mid);line-height:1.7;padding:0 0 20px}
.vlp .cta{background:var(--green);border-radius:28px;padding:56px;text-align:center;position:relative;overflow:hidden}
.vlp .cta h2{font-size:clamp(26px,3.4vw,40px);color:var(--navy);margin-bottom:14px}
.vlp .cta p{font-size:16px;color:rgba(13,31,60,0.7);max-width:520px;margin:0 auto 30px}
.vlp .cta .btn-d{background:var(--navy);color:#fff;font-weight:700;font-size:16px;padding:16px 34px;border-radius:12px;display:inline-block}
.vlp .cta .fine{font-size:13px;color:rgba(13,31,60,0.6);margin-top:18px}
.vlp footer.vfoot{background:var(--navy);color:rgba(255,255,255,0.6);padding:48px 0 40px;font-size:14px}
.vlp .foot-grid{display:grid;grid-template-columns:2fr 1fr 1fr;gap:32px;margin-bottom:32px}
.vlp footer.vfoot h4{font-family:'Syne',sans-serif;color:#fff;font-size:14px;font-weight:700;margin-bottom:14px}
.vlp footer.vfoot a{color:rgba(255,255,255,0.6);display:block;margin-bottom:8px}
.vlp footer.vfoot a:hover{color:var(--green)}
.vlp .foot-brand{display:flex;align-items:center;gap:10px;margin-bottom:14px}
.vlp .foot-brand>span:last-child{font-family:'Syne',sans-serif;font-weight:700;font-size:20px;color:#fff}
.vlp .foot-bottom{border-top:1px solid rgba(255,255,255,0.12);padding-top:22px;font-size:12px;color:rgba(255,255,255,0.4);display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px}
.vlp .sticker-wrap{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center}
.vlp .sticker-frame{position:relative;border-radius:20px;overflow:visible;box-shadow:0 32px 64px rgba(13,31,60,0.15);aspect-ratio:1/1;container-type:inline-size;--qr-x:50%;--qr-y:49%;--qr-size:26%;max-width:460px;margin:0 auto;width:100%}
.vlp .sticker-frame img{display:block;border-radius:16px;width:100%;height:100%;object-fit:cover}
.vlp .scan-overlay{position:absolute;left:var(--qr-x);top:var(--qr-y);width:var(--qr-size);height:var(--qr-size);transform:translate(-50%,-50%);pointer-events:none}
.vlp .scan-corner{position:absolute;width:clamp(14px,4.5cqi,26px);height:clamp(14px,4.5cqi,26px);border:clamp(2px,0.5cqi,3px) solid var(--green);filter:drop-shadow(0 0 6px rgba(46,204,138,0.6))}
.vlp .scan-corner.tl{top:-1.2cqi;left:-1.2cqi;border-right:none;border-bottom:none;border-top-left-radius:4px}
.vlp .scan-corner.tr{top:-1.2cqi;right:-1.2cqi;border-left:none;border-bottom:none;border-top-right-radius:4px}
.vlp .scan-corner.bl{bottom:-1.2cqi;left:-1.2cqi;border-right:none;border-top:none;border-bottom-left-radius:4px}
.vlp .scan-corner.br{bottom:-1.2cqi;right:-1.2cqi;border-left:none;border-top:none;border-bottom-right-radius:4px}
.vlp .scan-line{position:absolute;left:0;right:0;height:clamp(1.5px,0.4cqi,2.5px);background:linear-gradient(90deg,transparent,var(--green) 20%,var(--green) 80%,transparent);box-shadow:0 0 12px var(--green),0 0 24px rgba(46,204,138,0.5);animation:vlp-scan-sweep 2.2s ease-in-out infinite}
@keyframes vlp-scan-sweep{0%{top:0;opacity:0}10%{opacity:1}50%{top:calc(100% - 2px);opacity:1}60%{opacity:0}100%{top:0;opacity:0}}
.vlp .scan-badge{position:absolute;left:50%;bottom:clamp(-28px,-3cqi,-16px);transform:translateX(-50%);background:var(--navy);color:#fff;font-size:clamp(10px,1.4cqi,12px);font-weight:500;padding:6px 14px;border-radius:100px;white-space:nowrap;letter-spacing:0.3px;box-shadow:0 6px 16px rgba(0,0,0,0.25)}
.vlp .sticker-feats{margin-top:28px;display:flex;flex-direction:column;gap:18px}
.vlp .sticker-feat{display:flex;gap:14px;align-items:flex-start}
.vlp .sticker-feat .ic{width:34px;height:34px;background:var(--green-pale);color:var(--green-dark);border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-weight:700}
.vlp .sticker-feat strong{display:block;font-family:'Syne',sans-serif;font-size:15px;font-weight:700;margin-bottom:2px;color:var(--navy)}
.vlp .sticker-feat span{font-size:14px;color:var(--muted);line-height:1.6}
@media(max-width:880px){.vlp .grid,.vlp .steps,.vlp .diff-grid,.vlp .foot-grid,.vlp .sticker-wrap{grid-template-columns:1fr}.vlp .diff,.vlp .cta{padding:36px}.vlp .sticker-wrap{gap:48px}}
`;

function LogoMark() {
  return (
    <span className="mark">
      <svg viewBox="0 0 120 120">
        <path
          d="M30 62 L52 84 L92 36"
          stroke="#0D1F3C"
          strokeWidth="16"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </span>
  );
}

function VelocistesLanding() {
  return (
    <div className="vlp">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <nav className="vnav">
        <div className="nav-in">
          <a className="brand" href="https://velopass.com/fr">
            <LogoMark />
            <span>velopass</span>
          </a>
          <a
            className="nav-cta"
            href="https://velopass.com/fr/shop#registreer"
            onClick={() => trackShopSignupCtaClick("marquage_velo_nav", "fr")}
          >
            Devenir point de marquage
          </a>
        </div>
      </nav>

      <header className="hero">
        <div className="wrap hero-in">
          <span className="eyebrow">
            <span className="dot"></span>Opérateur d'identification agréé · APIC / FNUCI
          </span>
          <h1>
            Marquez les vélos. <em>Gardez les clients.</em>
          </h1>
          <p className="lead">
            Velopass est un opérateur d'identification de cycles agréé. Chaque vélo que vous marquez
            est conforme à la loi LOM et enregistré au FNUCI — et devient une relation client
            durable pour votre magasin.
          </p>
          <div className="btns">
            <a
              className="btn-p"
              href="https://velopass.com/fr/shop#registreer"
              onClick={() => trackShopSignupCtaClick("marquage_velo_hero", "fr")}
            >
              Inscription vélociste — gratuite
            </a>
            <a className="btn-s" href="https://velopass.com/fr/contact">
              Parler à un conseiller
            </a>
          </div>
          <div className="trust">
            <div>
              <strong>Europe</strong>Opérateur international
            </div>
            <div>
              <strong>FNUCI</strong>Enregistrement conforme
            </div>
            <div>
              <strong>0 €</strong>Inscription vélociste
            </div>
            <div>
              <strong>À vie</strong>Carnet d'entretien numérique
            </div>
          </div>
        </div>
      </header>

      <div className="legal">
        <div className="wrap legal-in">
          <span className="chip">Loi LOM</span>
          <span>
            <strong>Le marquage est obligatoire en France.</strong> Tout vélo neuf vendu par un
            professionnel doit être identifié par un opérateur agréé et enregistré au Fichier
            National Unique des Cycles Identifiés (FNUCI).
          </span>
        </div>
      </div>

      <section id="pourquoi">
        <div className="wrap">
          <p className="sec-label">Pourquoi Velopass</p>
          <h2 className="sec">Bien plus qu'une obligation légale</h2>
          <p className="sec-desc">
            Le marquage est une contrainte réglementaire. Velopass en fait un levier commercial
            pour votre magasin.
          </p>
          <div className="grid">
            <div className="card">
              <div className="ic">✓</div>
              <h3>Conformité sans effort</h3>
              <p>
                Marquage en magasin, enregistrement FNUCI immédiat, zéro administration. Vous êtes
                en règle avec la loi LOM dès la première étiquette.
              </p>
            </div>
            <div className="card">
              <div className="ic">↻</div>
              <h3>Une relation client durable</h3>
              <p>
                Chaque vélo identifié reste lié à votre magasin. Rappels d'entretien automatiques
                et contact maintenu après la vente — vos clients restent vos clients.
              </p>
            </div>
            <div className="card">
              <div className="ic">⚡</div>
              <h3>Un écosystème intégré</h3>
              <p>
                Intégrations avec fabricants, sociétés de leasing, assureurs et assistance. Une
                seule étiquette, tous les services connectés.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="comment" style={{ background: "var(--white)" }}>
        <div className="wrap">
          <p className="sec-label">Comment ça marche</p>
          <h2 className="sec">Opérationnel en quatre étapes</h2>
          <div className="steps">
            <div className="step">
              <div className="n">01</div>
              <h3>Inscrivez-vous</h3>
              <p>Créez votre compte vélociste en ligne, gratuitement, en quelques minutes.</p>
            </div>
            <div className="step">
              <div className="n">02</div>
              <h3>Recevez les étiquettes</h3>
              <p>Vous recevez les étiquettes Frame-ID inviolables à code QR et identifiant unique.</p>
            </div>
            <div className="step">
              <div className="n">03</div>
              <h3>Marquez en magasin</h3>
              <p>Appliquez l'étiquette sur le vélo. L'enregistrement au FNUCI est instantané.</p>
            </div>
            <div className="step">
              <div className="n">04</div>
              <h3>Fidélisez</h3>
              <p>Le vélo et son propriétaire restent connectés à votre magasin, à vie.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="frame-id" style={{ background: "var(--white)" }}>
        <div className="wrap">
          <div className="sticker-wrap">
            <div className="sticker-frame">
              <img src={stickerImg} alt="Frame-ID Velopass sur un cadre de vélo" width={1024} height={1024} loading="lazy" decoding="async" />
              <div className="scan-overlay" aria-hidden="true">
                <span className="scan-corner tl" />
                <span className="scan-corner tr" />
                <span className="scan-corner bl" />
                <span className="scan-corner br" />
                <span className="scan-line" />
              </div>
              <div className="scan-badge">Scan → accès à tout</div>
            </div>
            <div>
              <p className="sec-label">Le Frame-ID Velopass</p>
              <h2 className="sec">Une étiquette. Un scan. Tout est connecté.</h2>
              <p className="sec-desc">
                Étiquette adhésive inviolable, code QR et identifiant unique. Appliquée en magasin,
                enregistrée au FNUCI, liée à vie au vélo et à votre magasin.
              </p>
              <div className="sticker-feats">
                <div className="sticker-feat">
                  <div className="ic">✓</div>
                  <div>
                    <strong>Inviolable et conforme</strong>
                    <span>Toute tentative de retrait détruit l'étiquette. Marquage conforme à la loi LOM et enregistré au FNUCI.</span>
                  </div>
                </div>
                <div className="sticker-feat">
                  <div className="ic">⚡</div>
                  <div>
                    <strong>Accès instantané</strong>
                    <span>Un scan du QR ouvre le passeport numérique du vélo : preuve de propriété, historique d'entretien, services connectés.</span>
                  </div>
                </div>
                <div className="sticker-feat">
                  <div className="ic">↻</div>
                  <div>
                    <strong>Liée au cadre, pas à la personne</strong>
                    <span>En cas de revente, l'historique se transfère en un clic. L'étiquette reste, les données suivent — votre magasin aussi.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="diff">
            <div className="diff-in">
              <p className="sec-label">Ce qui distingue Velopass</p>
              <h2>Les autres opérateurs marquent. Velopass connecte.</h2>
              <p className="lead">
                Velopass n'est pas seulement un registre de vélos. C'est une plateforme de relation
                client qui utilise l'identification comme fondation.
              </p>
              <div className="diff-grid">
                <div className="diff-item">
                  <h3>
                    <span>→</span>Carnet numérique à vie
                  </h3>
                  <p>
                    Preuve de propriété, historique d'entretien et transfert simple en cas de
                    revente — pour chaque cycliste.
                  </p>
                </div>
                <div className="diff-item">
                  <h3>
                    <span>→</span>Rappels automatiques
                  </h3>
                  <p>
                    Le magasin recontacte ses clients au bon moment, sans effort administratif.
                  </p>
                </div>
                <div className="diff-item">
                  <h3>
                    <span>→</span>Partenaires intégrés
                  </h3>
                  <p>
                    Fabricants, leasing, assureurs et assistance dans un seul système connecté.
                  </p>
                </div>
                <div className="diff-item">
                  <h3>
                    <span>→</span>Opérateur international
                  </h3>
                  <p>
                    Une identité et un modèle de données unique, déployés à travers l'Europe.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" style={{ background: "var(--white)" }}>
        <div className="wrap">
          <p className="sec-label">Questions fréquentes</p>
          <h2 className="sec">Tout ce qu'un vélociste doit savoir</h2>
          <div style={{ marginTop: 36 }}>
            {FAQS.map((f, i) => (
              <details key={i} open={i === 0}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="cta">
            <h2>Prêt à devenir point de marquage agréé ?</h2>
            <p>
              Inscription gratuite, mise en route immédiate. Rejoignez les vélocistes qui
              transforment chaque vente en relation durable.
            </p>
            <a
              className="btn-d"
              href="https://velopass.com/fr/shop#registreer"
              onClick={() => trackShopSignupCtaClick("marquage_velo_final", "fr")}
            >
              Créer mon compte vélociste
            </a>
            <p className="fine">
              Une question ? support@velopass.com · WhatsApp +32 471 60 15 73
            </p>
          </div>
        </div>
      </section>

      <footer className="vfoot">
        <div className="wrap">
          <div className="foot-grid">
            <div>
              <div className="foot-brand">
                <LogoMark />
                <span>velopass</span>
              </div>
              <p style={{ maxWidth: 320, fontSize: 13.5 }}>
                Opérateur d'identification de cycles agréé. Chaque vélo. Un client. Pour toujours.
              </p>
            </div>
            <div>
              <h4>Vélocistes</h4>
              <a href="https://velopass.com/fr/shop#registreer">Inscription</a>
              <a href="https://velopass.com/fr/contact">Nous contacter</a>
              <a href="https://velopass.com/fr/bike-check">Vérifier un vélo</a>
            </div>
            <div>
              <h4>Velopass</h4>
              <a href="https://velopass.com/fr">Découvrir Velopass</a>
              <a href="https://app.velopass.com">Plateforme de connexion</a>
              <a href="https://apic-asso.com/operateursdidentificationagrees/">Fiche APIC</a>
            </div>
          </div>
          <div className="foot-bottom">
            <span>© 2026 Velopass BV · Stokerijstraat 29/a1, 2110 Wijnegem, Belgique</span>
            <span>support@velopass.com · +32 471 60 15 73</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
