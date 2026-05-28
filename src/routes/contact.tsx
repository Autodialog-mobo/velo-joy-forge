import { useMemo, useState } from "react";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
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
          "Stel je vraag aan het Velopass-team. Aparte formulieren voor fietsers en voor fietswinkels of professionals.",
      },
      { property: "og:title", content: "Contact — Velopass" },
      {
        property: "og:description",
        content:
          "Kies wie je bent — we sturen je vraag meteen naar de juiste persoon.",
      },
    ],
  }),
  component: ContactPage,
});

const SUPPORT_EMAIL = "support@velopass.com";
const PHONE_DISPLAY = "+32 (0)471 60 15 73";

const riderSchema = z.object({
  name: z.string().trim().min(1, { message: "Vul je naam in." }).max(100),
  email: z.string().trim().min(1, { message: "Vul je e-mailadres in." }).email({ message: "Vul een geldig e-mailadres in." }).max(255),
  subject: z.string().min(1, { message: "Kies een onderwerp." }).max(120),
  message: z.string().trim().max(2000).optional(),
});

const shopSchema = z.object({
  name: z.string().trim().min(1, { message: "Vul je naam in." }).max(100),
  company: z.string().trim().min(1, { message: "Vul je winkel- of bedrijfsnaam in." }).max(150),
  email: z.string().trim().min(1, { message: "Vul je e-mailadres in." }).email({ message: "Vul een geldig e-mailadres in." }).max(255),
  phone: z.string().trim().max(30).optional(),
  subject: z.string().min(1, { message: "Kies een onderwerp." }).max(120),
  message: z.string().trim().max(2000).optional(),
});

const RIDER_SUBJECTS = [
  "Mijn account",
  "Frame-ID bestellen of activeren",
  "Gestolen of verloren fiets",
  "Pechhulp of verzekering",
  "Technische vraag",
  "Andere",
];

const SHOP_SUBJECTS = [
  "Demo aanvragen",
  "Vragen over integratie of kassasysteem",
  "Al partner — technische vraag",
  "Pricing of kennismakingspakket",
  "Leasingmaatschappij of verzekeraar",
  "Andere",
];

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "'DM Sans', sans-serif",
  fontWeight: 500,
  fontSize: 13,
  color: "#0D1F3C",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#fff",
  border: "1px solid rgba(13,31,60,0.15)",
  borderRadius: 8,
  padding: "10px 14px",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 15,
  color: "#0D1F3C",
  outline: "none",
  boxSizing: "border-box",
};

const errorTextStyle: React.CSSProperties = {
  marginTop: 6,
  fontSize: 12,
  color: "#c0392b",
  fontFamily: "'DM Sans', sans-serif",
};

const submitBtnStyle: React.CSSProperties = {
  marginTop: 8,
  width: "100%",
  background: "#2ECC8A",
  color: "#0D1F3C",
  border: "none",
  padding: "14px 24px",
  borderRadius: 10,
  fontFamily: "'Syne', sans-serif",
  fontWeight: 700,
  fontSize: 15,
  letterSpacing: "1px",
  textTransform: "uppercase",
  cursor: "pointer",
};

function ContactPage() {
  const { type } = useSearch({ from: "/contact" });
  const [activeTab, setActiveTab] = useState<"rider" | "shop">(type);
  const [navOpen, setNavOpen] = useState(false);

  const [rider, setRider] = useState({ name: "", email: "", subject: "", message: "" });
  const [riderErrors, setRiderErrors] = useState<Record<string, string>>({});

  const [shop, setShop] = useState({ name: "", company: "", email: "", phone: "", subject: "", message: "" });
  const [shopErrors, setShopErrors] = useState<Record<string, string>>({});

  useMemo(() => setActiveTab(type), [type]);

  const sendRider = () => {
    const result = riderSchema.safeParse(rider);
    if (!result.success) {
      const fe: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const k = issue.path[0] as string;
        if (!fe[k]) fe[k] = issue.message;
      }
      setRiderErrors(fe);
      toast.error(result.error.issues[0]?.message ?? "Controleer het formulier.");
      return;
    }
    setRiderErrors({});
    const d = result.data;
    const body = `Naam: ${d.name}%0D%0AE-mail: ${d.email}%0D%0AOnderwerp: ${d.subject}%0D%0A%0D%0A${encodeURIComponent(d.message ?? "")}`;
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("[Fietser] " + d.subject)}&body=${body}`;
  };

  const sendShop = () => {
    const result = shopSchema.safeParse(shop);
    if (!result.success) {
      const fe: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const k = issue.path[0] as string;
        if (!fe[k]) fe[k] = issue.message;
      }
      setShopErrors(fe);
      toast.error(result.error.issues[0]?.message ?? "Controleer het formulier.");
      return;
    }
    setShopErrors({});
    const d = result.data;
    const body = `Naam: ${d.name}%0D%0ABedrijf: ${d.company}%0D%0AE-mail: ${d.email}%0D%0ATelefoon: ${d.phone ?? ""}%0D%0AOnderwerp: ${d.subject}%0D%0A%0D%0A${encodeURIComponent(d.message ?? "")}`;
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("[Pro] " + d.subject)}&body=${body}`;
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
          <li><Link to="/professionals" style={{ color: "var(--green-mid)", display: "inline-flex", alignItems: "center", gap: 6 }}><ArrowUpRight size={15} strokeWidth={2.2} />Voor professionals</Link></li>
        </ul>
        <div className="nav-actions">
          <a href="#login" className="btn-login">Inloggen</a>
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

      <main style={{ background: "#F5F3EE", minHeight: "100vh", paddingBottom: 80 }}>
        {/* HEADER */}
        <section style={{ background: "#0D1F3C", padding: "56px 6vw 64px", textAlign: "center" }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "#2ECC8A", marginBottom: 14 }}>
              Contact
            </p>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "clamp(28px, 4vw, 40px)", lineHeight: 1.15, letterSpacing: "-0.8px", color: "#fff", marginBottom: 14 }}>
              Hoe kunnen we je helpen?
            </h1>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(245,243,238,0.7)", lineHeight: 1.6, margin: 0 }}>
              Kies hieronder wie je bent — we sturen je vraag meteen naar de juiste persoon.
            </p>
          </div>
        </section>

        {/* TABS + FORM */}
        <section style={{ maxWidth: 640, margin: "-32px auto 0", padding: "0 16px" }}>
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
              Ik ben een fietswinkel of professional
            </button>
          </div>

          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "32px",
              boxShadow: "0 12px 40px rgba(13,31,60,0.08)",
              marginTop: 16,
            }}
            className="contact-card-wrap"
          >
            {activeTab === "rider" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label htmlFor="r-name" style={labelStyle}>Naam *</label>
                  <input id="r-name" type="text" value={rider.name} maxLength={100}
                    onChange={(e) => setRider({ ...rider, name: e.target.value })}
                    style={inputStyle} className="vp-input" />
                  {riderErrors.name && <p style={errorTextStyle}>{riderErrors.name}</p>}
                </div>
                <div>
                  <label htmlFor="r-email" style={labelStyle}>E-mailadres *</label>
                  <input id="r-email" type="email" value={rider.email} maxLength={255}
                    onChange={(e) => setRider({ ...rider, email: e.target.value })}
                    style={inputStyle} className="vp-input" />
                  {riderErrors.email && <p style={errorTextStyle}>{riderErrors.email}</p>}
                </div>
                <div>
                  <label htmlFor="r-subject" style={labelStyle}>Onderwerp *</label>
                  <select id="r-subject" value={rider.subject}
                    onChange={(e) => setRider({ ...rider, subject: e.target.value })}
                    style={inputStyle} className="vp-input">
                    <option value="">Kies een onderwerp…</option>
                    {RIDER_SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {riderErrors.subject && <p style={errorTextStyle}>{riderErrors.subject}</p>}
                </div>
                <div>
                  <label htmlFor="r-message" style={labelStyle}>Bericht</label>
                  <textarea id="r-message" rows={5} maxLength={2000} value={rider.message}
                    onChange={(e) => setRider({ ...rider, message: e.target.value })}
                    style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} className="vp-input" />
                </div>
                <button type="button" onClick={sendRider} style={submitBtnStyle}>Verstuur →</button>
                <p style={{ fontSize: 12, color: "rgba(13,31,60,0.55)", textAlign: "center", margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
                  We antwoorden binnen 1 werkdag.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label htmlFor="s-name" style={labelStyle}>Naam *</label>
                  <input id="s-name" type="text" value={shop.name} maxLength={100}
                    onChange={(e) => setShop({ ...shop, name: e.target.value })}
                    style={inputStyle} className="vp-input" />
                  {shopErrors.name && <p style={errorTextStyle}>{shopErrors.name}</p>}
                </div>
                <div>
                  <label htmlFor="s-company" style={labelStyle}>Fietswinkel of bedrijfsnaam *</label>
                  <input id="s-company" type="text" value={shop.company} maxLength={150}
                    onChange={(e) => setShop({ ...shop, company: e.target.value })}
                    style={inputStyle} className="vp-input" />
                  {shopErrors.company && <p style={errorTextStyle}>{shopErrors.company}</p>}
                </div>
                <div>
                  <label htmlFor="s-email" style={labelStyle}>E-mailadres *</label>
                  <input id="s-email" type="email" value={shop.email} maxLength={255}
                    onChange={(e) => setShop({ ...shop, email: e.target.value })}
                    style={inputStyle} className="vp-input" />
                  {shopErrors.email && <p style={errorTextStyle}>{shopErrors.email}</p>}
                </div>
                <div>
                  <label htmlFor="s-phone" style={labelStyle}>Telefoonnummer</label>
                  <input id="s-phone" type="tel" value={shop.phone} maxLength={30}
                    onChange={(e) => setShop({ ...shop, phone: e.target.value })}
                    style={inputStyle} className="vp-input" />
                </div>
                <div>
                  <label htmlFor="s-subject" style={labelStyle}>Onderwerp *</label>
                  <select id="s-subject" value={shop.subject}
                    onChange={(e) => setShop({ ...shop, subject: e.target.value })}
                    style={inputStyle} className="vp-input">
                    <option value="">Kies een onderwerp…</option>
                    {SHOP_SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {shopErrors.subject && <p style={errorTextStyle}>{shopErrors.subject}</p>}
                </div>
                <div>
                  <label htmlFor="s-message" style={labelStyle}>Bericht</label>
                  <textarea id="s-message" rows={5} maxLength={2000} value={shop.message}
                    onChange={(e) => setShop({ ...shop, message: e.target.value })}
                    style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} className="vp-input" />
                </div>
                <button type="button" onClick={sendShop} style={submitBtnStyle}>Verstuur →</button>
                <p style={{ fontSize: 12, color: "rgba(13,31,60,0.55)", textAlign: "center", margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
                  We antwoorden binnen 1 werkdag. Liever bellen? {PHONE_DISPLAY}
                </p>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />

      <style>{`
        .back-btn-wrap { padding: 72px 6vw 0; max-width: 1100px; margin: 0 auto; }
        .back-btn { display: inline-flex; align-items: center; gap: 6px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; color: var(--text-muted); background: none; border: none; cursor: pointer; padding: 0; text-decoration: underline; text-underline-offset: 3px; margin-bottom: 16px; }
        .contact-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: rgba(13,31,60,0.05); padding: 6px; border-radius: 12px; }
        .contact-tab { padding: 12px 16px; border: none; background: transparent; font-family: 'DM Sans', sans-serif; font-weight: 500; font-size: 14px; color: rgba(13,31,60,0.55); border-radius: 8px; cursor: pointer; transition: all 0.18s ease; }
        .contact-tab.active { background: #2ECC8A; color: #0D1F3C; font-weight: 600; box-shadow: 0 4px 12px rgba(46,204,138,0.25); }
        .vp-input:focus { border-color: #2ECC8A !important; }
        @media (max-width: 640px) {
          .contact-card-wrap { padding: 24px 16px !important; }
          .contact-tabs { grid-template-columns: 1fr; }
          .contact-tab { font-size: 13px; }
        }
      `}</style>
    </>
  );
}
