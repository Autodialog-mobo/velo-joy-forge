import { useEffect, useState } from "react";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import {
  HelpCircle,
  Package,
  ScanLine,
  MessageCircle,
  ArrowUpRight,
  ArrowLeft,
  CalendarCheck,
  Monitor,
} from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { VelopassMark } from "@/components/VelopassMark";
import { Footer } from "@/components/Footer";

const searchSchema = z.object({
  type: fallback(z.enum(["rider", "shop"]), "rider").default("rider"),
});

export const Route = createFileRoute("/contact")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Contact — Velopass" },
      {
        name: "description",
        content:
          "Hulp nodig bij activatie, je Frame-ID of een gevonden fiets? Stuur het Velopass-team een bericht via WhatsApp.",
      },
      { property: "og:title", content: "Contact — Velopass" },
      {
        property: "og:description",
        content:
          "Kies een onderwerp en chat met het Velopass-team via WhatsApp.",
      },
    ],
  }),
  component: ContactPage,
});

const WA_NUMBER = "32471601573";

const waSchema = z.object({
  name: z.string().trim().min(1, { message: "Vul je naam in." }).max(100),
  email: z.string().trim().min(1, { message: "Vul je e-mailadres in." }).email({ message: "Vul een geldig e-mailadres in." }).max(255),
  phone: z.string().trim().max(30).optional(),
  note: z.string().trim().max(2000).optional(),
});
type WaErrors = Partial<Record<"name" | "email", string>>;

const shopFormSchema = z.object({
  name: z.string().trim().min(1, { message: "Vul je naam in." }).max(100),
  company: z.string().trim().min(1, { message: "Vul je winkel- of bedrijfsnaam in." }).max(150),
  email: z.string().trim().min(1, { message: "Vul je e-mailadres in." }).email({ message: "Vul een geldig e-mailadres in." }).max(255),
  phone: z.string().trim().max(30).optional(),
  subject: z.string().min(1, { message: "Kies een onderwerp." }).max(120),
  message: z.string().trim().min(1, { message: "Schrijf een bericht." }).max(2000),
});
type ShopErrors = Partial<Record<"name" | "company" | "email" | "subject" | "message", string>>;

const cardStyle: React.CSSProperties = {
  background: "var(--white)",
  border: "1px solid var(--border)",
  borderRadius: "var(--r-lg)",
  padding: "14px 16px",
  textAlign: "left",
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  gap: 6,
  transition: "transform 0.2s, box-shadow 0.2s, border-color 0.2s",
  fontFamily: "'DM Sans', sans-serif",
};

const iconBox: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 10,
  background: "rgba(46,204,138,0.12)",
  border: "1px solid rgba(46,204,138,0.25)",
  color: "var(--green-mid)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const waLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: 1.1,
  textTransform: "uppercase",
  color: "rgba(245,243,238,0.55)",
  marginBottom: 4,
};

const waInputStyle: React.CSSProperties = {
  width: "100%",
  background: "transparent",
  border: "1.5px solid rgba(245,243,238,0.18)",
  borderRadius: 8,
  padding: "8px 12px",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 14,
  color: "#F5F3EE",
  outline: "none",
  boxSizing: "border-box",
};


const SUGGESTIONS = [
  {
    icon: HelpCircle,
    title: "Hulp bij activatie",
    desc: "Uitnodiging ontvangen maar lukt het niet om in te loggen?",
    prefill: "Hallo Velopass, ik heb hulp nodig bij de activatie van mijn account. ",
  },
  {
    icon: Package,
    title: "Vraag over mijn Frame-ID",
    desc: "Frame-ID niet ontvangen, beschadigd of een andere vraag over je bestelling?",
    prefill: "Hallo Velopass, ik heb een vraag over mijn Frame-ID: ",
  },
  {
    icon: ScanLine,
    title: "Gevonden fiets melden",
    desc: "Heb je een fiets gevonden met een Velopass Frame-ID?",
    prefill: "Hallo Velopass, ik heb een fiets gevonden met een Velopass Frame-ID. ",
  },
];

const SHOP_SHORTCUTS = [
  {
    icon: CalendarCheck,
    title: "Demo aanvragen",
    desc: "Bekijk Velopass live en stel al je vragen aan ons team.",
    href: "mailto:info@velopass.com?subject=Demo aanvragen",
  },
  {
    icon: Monitor,
    title: "Kassasysteem of integratie",
    desc: "Vragen over koppeling met je kassasysteem of de Pro App?",
    href: "mailto:info@velopass.com?subject=Kassasysteem integratie",
  },
  {
    icon: HelpCircle,
    title: "Al partner — technische vraag",
    desc: "Ben je al aangesloten en heb je een vraag over je account of portal?",
    href: "mailto:support@velopass.com?subject=Technische vraag partner",
  },
];

const SHOP_SUBJECTS = [
  "Demo aanvragen",
  "Kassasysteem of integratie",
  "Pricing of kennismakingspakket",
  "Al partner — technische vraag",
  "Leasingmaatschappij of verzekeraar",
  "Andere",
];

function ContactPage() {
  const { type } = useSearch({ from: "/contact" });
  const [activeTab, setActiveTab] = useState<"rider" | "shop">(type);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setActiveTab(type);
  }, [type]);

  // RIDER form state
  const [wa, setWa] = useState({ name: "", email: "", phone: "", note: "" });
  const [errors, setErrors] = useState<WaErrors>({});

  // SHOP form state
  const [shop, setShop] = useState({ name: "", company: "", email: "", phone: "", subject: "", message: "" });
  const [shopErrors, setShopErrors] = useState<ShopErrors>({});
  const [shopSent, setShopSent] = useState(false);

  const sendWa = () => {
    const result = waSchema.safeParse(wa);
    if (!result.success) {
      const fieldErrors: WaErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof WaErrors;
        if ((key === "name" || key === "email") && !fieldErrors[key]) {
          fieldErrors[key] = issue.message;
        }
      }
      setErrors(fieldErrors);
      toast.error(result.error.issues[0]?.message ?? "Controleer het formulier.");
      const focusId = fieldErrors.name ? "wa-name" : fieldErrors.email ? "wa-email" : null;
      if (focusId) document.getElementById(focusId)?.focus();
      return;
    }
    setErrors({});
    const d = result.data;
    const text =
      `Hallo Velopass,\n\n` +
      `Naam: ${d.name}\n` +
      `E-mail: ${d.email}\n` +
      (d.phone ? `Telefoon: ${d.phone}\n` : "") +
      (d.note ? `\n${d.note}\n` : "");
    const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const pickSuggestion = (prefill: string) => {
    setWa((w) => ({ ...w, note: prefill }));
    const el = document.getElementById("wa-form");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => document.getElementById("wa-name")?.focus(), 400);
  };

  const sendShop = () => {
    const result = shopFormSchema.safeParse(shop);
    if (!result.success) {
      const fe: ShopErrors = {};
      for (const issue of result.error.issues) {
        const k = issue.path[0] as keyof ShopErrors;
        if (!fe[k]) fe[k] = issue.message;
      }
      setShopErrors(fe);
      toast.error(result.error.issues[0]?.message ?? "Controleer het formulier.");
      return;
    }
    setShopErrors({});
    setShopSent(true);
    setShop({ name: "", company: "", email: "", phone: "", subject: "", message: "" });
  };


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
          <li><Link to="/professionals" style={{ color: "var(--green-mid)", display: "inline-flex", alignItems: "center", gap: 6 }}><ArrowUpRight size={15} strokeWidth={2.2} />Voor professionals</Link></li>
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
      <main style={{ background: "var(--bg)", paddingTop: 8, minHeight: "100vh" }}>
        {/* HEADER */}
        <section style={{ padding: "8px 6vw 8px", maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <h1
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(24px, 3vw, 36px)",
              lineHeight: 1.05,
              letterSpacing: "-1px",
              color: "var(--navy)",
              marginBottom: 6,
            }}
          >
            Hoe kunnen we helpen?
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", maxWidth: 560, margin: "0 auto", lineHeight: 1.5 }}>
            Kies hieronder wie je bent — we sturen je vraag meteen naar de juiste persoon.
          </p>
        </section>

        {/* TABS */}
        <section style={{ padding: "4px 6vw 0", maxWidth: 720, margin: "0 auto" }}>
          <div className="contact-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "rider"}
              onClick={() => setActiveTab("rider")}
              className={`contact-tab${activeTab === "rider" ? " active" : ""}`}
            >
              Ik ben een fietser
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "shop"}
              onClick={() => setActiveTab("shop")}
              className={`contact-tab${activeTab === "shop" ? " active" : ""}`}
            >
              Ik ben een fietswinkel
            </button>
          </div>
        </section>




        {activeTab === "rider" ? (
          <RiderTab
            wa={wa}
            setWa={setWa}
            errors={errors}
            setErrors={setErrors}
            sendWa={sendWa}
            pickSuggestion={pickSuggestion}
          />
        ) : (
          <ShopTab
            shop={shop}
            setShop={setShop}
            shopErrors={shopErrors}
            setShopErrors={setShopErrors}
            sendShop={sendShop}
            shopSent={shopSent}
          />
        )}
        {/* WETTELIJKE GEGEVENS */}
        <section style={{ padding: "0 6vw 20px", maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.55, margin: 0 }}>
            Velopass BV · Stokerijstraat 29/bus a1, 2110 Wijnegem, België · BTW: BE0777.359.681 · {activeTab === "shop" ? "info@velopass.com" : "support@velopass.com"}
          </p>
        </section>



      </main>

      <style>{`
        .back-btn-wrap { padding: 56px 6vw 0; max-width: 1100px; margin: 0 auto; }
        .back-btn { display: inline-flex; align-items: center; gap: 6px; font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 500; color: var(--text-muted); background: none; border: none; cursor: pointer; padding: 0; text-decoration: underline; text-underline-offset: 3px; }
        .contact-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; background: rgba(13,31,60,0.05); padding: 4px; border-radius: 10px; margin-bottom: 8px; }
        .contact-tab { padding: 8px 14px; border: none; background: transparent; font-family: 'DM Sans', sans-serif; font-weight: 500; font-size: 13px; color: rgba(13,31,60,0.55); border-radius: 8px; cursor: pointer; transition: all 0.18s ease; }
        .contact-tab.active { background: #2ECC8A; color: #0D1F3C; font-weight: 600; box-shadow: 0 4px 12px rgba(46,204,138,0.25); }
        .contact-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .contact-card { border: 1px solid var(--border); text-decoration: none; color: inherit; }
        .contact-card:hover { transform: translateY(-3px); box-shadow: 0 20px 40px rgba(13,31,60,0.08); border-color: rgba(46,204,138,0.4); }
        .wa-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .wa-grid input::placeholder, .wa-grid textarea::placeholder, .wa-grid select { color: rgba(245,243,238,0.55); }
        .wa-grid input:focus, .wa-grid textarea:focus, .wa-grid select:focus { border-color: #2ECC8A; }
        @media (max-width: 768px) {
          .back-btn-wrap { padding-top: 56px; }
          .back-btn { font-size: 12px; }
          .contact-cards { grid-template-columns: 1fr; }
          .wa-grid { grid-template-columns: 1fr; }
          .contact-tabs { grid-template-columns: 1fr; }
        }
      `}</style>


    </>
  );
}

/* ============== RIDER TAB ============== */
function RiderTab({
  wa, setWa, errors, setErrors, sendWa, pickSuggestion,
}: {
  wa: { name: string; email: string; phone: string; note: string };
  setWa: React.Dispatch<React.SetStateAction<{ name: string; email: string; phone: string; note: string }>>;
  errors: WaErrors;
  setErrors: React.Dispatch<React.SetStateAction<WaErrors>>;
  sendWa: () => void;
  pickSuggestion: (prefill: string) => void;
}) {
  return (
    <>
      {/* SUGGESTIES */}
      <section style={{ padding: "4px 6vw 12px", maxWidth: 1100, margin: "0 auto" }}>
        <p style={{ textAlign: "center", fontSize: 11, letterSpacing: 1.3, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
          Waarover gaat je vraag?
        </p>
        <div className="contact-cards">
          {SUGGESTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.title}
                type="button"
                onClick={() => pickSuggestion(s.prefill)}
                style={cardStyle}
                className="contact-card"
              >
                <div style={iconBox}><Icon size={18} strokeWidth={1.8} /></div>
                <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: "var(--navy)", letterSpacing: "-0.2px", margin: 0 }}>
                  {s.title}
                </h3>
                <p style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.45, flex: 1, margin: 0 }}>
                  {s.desc}
                </p>
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--green-mid)" }}>Kies dit onderwerp →</span>
              </button>
            );
          })}
        </div>
      </section>
      {/* WHATSAPP FORM */}
      <section id="wa-form" style={{ padding: "8px 6vw 16px", maxWidth: 720, margin: "0 auto" }}>
        <div
          style={{
            background: "#0D1F3C",
            color: "#F5F3EE",
            borderRadius: 14,
            padding: "20px 24px",
            boxShadow: "0 20px 50px rgba(13,31,60,0.15)",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: "-0.5px", marginBottom: 4, marginTop: 0 }}>
            Stuur ons een bericht
          </h2>
          <p style={{ fontSize: 13, color: "rgba(245,243,238,0.7)", lineHeight: 1.45, marginBottom: 14, marginTop: 0 }}>
            Vul je gegevens in en open WhatsApp — we antwoorden meestal binnen 2 uur tijdens kantooruren.
          </p>



          <div className="wa-grid">
            <div>
              <label htmlFor="wa-name" style={waLabelStyle}>Naam <span style={{ color: "#2ECC8A" }}>*</span></label>
              <input
                id="wa-name"
                type="text"
                required
                maxLength={100}
                value={wa.name}
                onChange={(e) => {
                  setWa({ ...wa, name: e.target.value });
                  if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
                }}
                placeholder="Jan Janssens"
                aria-invalid={!!errors.name}
                style={waInputStyle}
              />
              {errors.name && <p style={{ marginTop: 6, fontSize: 13, color: "#ff8a8a" }}>{errors.name}</p>}
            </div>
            <div>
              <label htmlFor="wa-phone" style={waLabelStyle}>Telefoon</label>
              <input
                id="wa-phone"
                type="tel"
                maxLength={30}
                value={wa.phone}
                onChange={(e) => setWa({ ...wa, phone: e.target.value })}
                placeholder="+32 4..."
                style={waInputStyle}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="wa-email" style={waLabelStyle}>E-mail <span style={{ color: "#2ECC8A" }}>*</span></label>
              <input
                id="wa-email"
                type="email"
                required
                maxLength={255}
                value={wa.email}
                onChange={(e) => {
                  setWa({ ...wa, email: e.target.value });
                  if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
                }}
                placeholder="jan@voorbeeld.be"
                aria-invalid={!!errors.email}
                style={waInputStyle}
              />
              {errors.email && <p style={{ marginTop: 6, fontSize: 13, color: "#ff8a8a" }}>{errors.email}</p>}
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="wa-note" style={waLabelStyle}>Opmerking</label>
              <textarea
                id="wa-note"
                rows={5}
                maxLength={2000}
                value={wa.note}
                onChange={(e) => setWa({ ...wa, note: e.target.value })}
                placeholder="Vertel ons kort waar je vraag over gaat..."
                style={{ ...waInputStyle, resize: "vertical", lineHeight: 1.5 }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={sendWa}
            style={{
              marginTop: 24,
              width: "100%",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              background: "#2ECC8A",
              color: "#0D1F3C",
              border: "none",
              padding: "16px 24px",
              borderRadius: 12,
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            <MessageCircle size={20} strokeWidth={2.2} />
            Verstuur via WhatsApp →
          </button>

          <p style={{ marginTop: 20, textAlign: "center", fontSize: 14, color: "rgba(245,243,238,0.6)" }}>
            Liever een e-mail sturen?{" "}
            <a href="mailto:support@velopass.com" style={{ color: "#2ECC8A", textDecoration: "none", fontWeight: 500 }}>
              support@velopass.com
            </a>
          </p>
        </div>
      </section>
    </>
  );
}

/* ============== SHOP TAB ============== */
function ShopTab({
  shop, setShop, shopErrors, setShopErrors, sendShop, shopSent,
}: {
  shop: { name: string; company: string; email: string; phone: string; subject: string; message: string };
  setShop: React.Dispatch<React.SetStateAction<{ name: string; company: string; email: string; phone: string; subject: string; message: string }>>;
  shopErrors: ShopErrors;
  setShopErrors: React.Dispatch<React.SetStateAction<ShopErrors>>;
  sendShop: () => void;
  shopSent: boolean;
}) {
  return (
    <>

      {/* SHORTCUTS — identieke card-stijl als Tab 1 */}
      <section style={{ padding: "8px 6vw 24px", maxWidth: 1100, margin: "0 auto" }}>
        <p style={{ textAlign: "center", fontSize: 12, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 16 }}>
          Waarover gaat je vraag?
        </p>
        <div className="contact-cards">
          {SHOP_SHORTCUTS.map((s) => {
            const Icon = s.icon;
            return (
              <a key={s.title} href={s.href} style={cardStyle} className="contact-card">
                <div style={iconBox}><Icon size={22} strokeWidth={1.8} /></div>
                <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 17, color: "var(--navy)", letterSpacing: "-0.2px" }}>
                  {s.title}
                </h3>
                <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6, flex: 1, margin: 0 }}>
                  {s.desc}
                </p>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--green-mid)" }}>Stuur een e-mail →</span>
              </a>
            );
          })}
        </div>
      </section>

      {/* FORM — identieke dark navy card als Tab 1 */}
      <section style={{ padding: "24px 6vw 64px", maxWidth: 720, margin: "0 auto" }}>
        <div
          style={{
            background: "#0D1F3C",
            color: "#F5F3EE",
            borderRadius: 18,
            padding: "36px 36px 32px",
            boxShadow: "0 30px 80px rgba(13,31,60,0.15)",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 28, letterSpacing: "-0.5px", marginBottom: 12 }}>
            Stuur ons een bericht
          </h2>
          <p style={{ fontSize: 15, color: "rgba(245,243,238,0.7)", lineHeight: 1.55, marginBottom: 24 }}>
            Vul het formulier in — we antwoorden binnen 1 werkdag.
          </p>

          {shopSent && (
            <div
              role="status"
              style={{
                background: "rgba(46,204,138,0.18)",
                border: "1px solid rgba(46,204,138,0.5)",
                color: "#F5F3EE",
                padding: "14px 16px",
                borderRadius: 10,
                marginBottom: 20,
                fontSize: 14,
              }}
            >
              Je bericht is verstuurd. We antwoorden binnen 1 werkdag.
            </div>
          )}

          <div className="wa-grid">
            <div>
              <label htmlFor="s-name" style={waLabelStyle}>Naam <span style={{ color: "#2ECC8A" }}>*</span></label>
              <input
                id="s-name" type="text" required maxLength={100} value={shop.name}
                onChange={(e) => { setShop({ ...shop, name: e.target.value }); if (shopErrors.name) setShopErrors((p) => ({ ...p, name: undefined })); }}
                placeholder="Jan Janssens" style={waInputStyle}
              />
              {shopErrors.name && <p style={{ marginTop: 6, fontSize: 13, color: "#ff8a8a" }}>{shopErrors.name}</p>}
            </div>
            <div>
              <label htmlFor="s-company" style={{ ...waLabelStyle, whiteSpace: "nowrap", letterSpacing: 0.8 }}>Fietswinkel of bedrijfsnaam <span style={{ color: "#2ECC8A" }}>*</span></label>
              <input
                id="s-company" type="text" required maxLength={150} value={shop.company}
                onChange={(e) => { setShop({ ...shop, company: e.target.value }); if (shopErrors.company) setShopErrors((p) => ({ ...p, company: undefined })); }}
                placeholder="Fietsen Janssens" style={waInputStyle}
              />
              {shopErrors.company && <p style={{ marginTop: 6, fontSize: 13, color: "#ff8a8a" }}>{shopErrors.company}</p>}
            </div>
            <div>
              <label htmlFor="s-email" style={waLabelStyle}>E-mail <span style={{ color: "#2ECC8A" }}>*</span></label>
              <input
                id="s-email" type="email" required maxLength={255} value={shop.email}
                onChange={(e) => { setShop({ ...shop, email: e.target.value }); if (shopErrors.email) setShopErrors((p) => ({ ...p, email: undefined })); }}
                placeholder="jan@winkel.be" style={waInputStyle}
              />
              {shopErrors.email && <p style={{ marginTop: 6, fontSize: 13, color: "#ff8a8a" }}>{shopErrors.email}</p>}
            </div>
            <div>
              <label htmlFor="s-phone" style={waLabelStyle}>Telefoon</label>
              <input
                id="s-phone" type="tel" maxLength={30} value={shop.phone}
                onChange={(e) => setShop({ ...shop, phone: e.target.value })}
                placeholder="+32 4..." style={waInputStyle}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="s-subject" style={waLabelStyle}>Onderwerp <span style={{ color: "#2ECC8A" }}>*</span></label>
              <select
                id="s-subject" value={shop.subject}
                onChange={(e) => { setShop({ ...shop, subject: e.target.value }); if (shopErrors.subject) setShopErrors((p) => ({ ...p, subject: undefined })); }}
                style={waInputStyle}
              >
                <option value="" style={{ background: "#0D1F3C" }}>Kies een onderwerp…</option>
                {SHOP_SUBJECTS.map((s) => (
                  <option key={s} value={s} style={{ background: "#0D1F3C" }}>{s}</option>
                ))}
              </select>
              {shopErrors.subject && <p style={{ marginTop: 6, fontSize: 13, color: "#ff8a8a" }}>{shopErrors.subject}</p>}
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="s-message" style={waLabelStyle}>Bericht <span style={{ color: "#2ECC8A" }}>*</span></label>
              <textarea
                id="s-message" rows={5} maxLength={2000} required value={shop.message}
                onChange={(e) => { setShop({ ...shop, message: e.target.value }); if (shopErrors.message) setShopErrors((p) => ({ ...p, message: undefined })); }}
                placeholder="Vertel ons kort waar je vraag over gaat..."
                style={{ ...waInputStyle, resize: "vertical", lineHeight: 1.5 }}
              />
              {shopErrors.message && <p style={{ marginTop: 6, fontSize: 13, color: "#ff8a8a" }}>{shopErrors.message}</p>}
            </div>
          </div>

          <button
            type="button"
            onClick={sendShop}
            style={{
              marginTop: 24,
              width: "100%",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              background: "#2ECC8A",
              color: "#0D1F3C",
              border: "none",
              padding: "16px 24px",
              borderRadius: 12,
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            <MessageCircle size={20} strokeWidth={2.2} />
            Verstuur via WhatsApp →
          </button>

        </div>
      </section>
    </>
  );
}
