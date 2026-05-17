import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { HelpCircle, Package, ScanLine, MessageCircle, ArrowUpRight, ArrowLeft } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { VelopassMark } from "@/components/VelopassMark";
import { Footer } from "@/components/Footer";

const waSchema = z.object({
  name: z.string().trim().min(1, { message: "Vul je naam in." }).max(100, { message: "Naam mag maximaal 100 tekens zijn." }),
  email: z.string().trim().min(1, { message: "Vul je e-mailadres in." }).email({ message: "Vul een geldig e-mailadres in." }).max(255),
  phone: z.string().trim().max(30).optional(),
  note: z.string().trim().max(2000).optional(),
});

type WaErrors = Partial<Record<"name" | "email", string>>;

export const Route = createFileRoute("/contact")({
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

const cardStyle: React.CSSProperties = {
  background: "var(--white)",
  border: "1px solid var(--border)",
  borderRadius: "var(--r-lg)",
  padding: "24px 22px",
  textAlign: "left",
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  gap: 10,
  transition: "transform 0.2s, box-shadow 0.2s, border-color 0.2s",
  fontFamily: "'DM Sans', sans-serif",
};

const iconBox: React.CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 12,
  background: "rgba(46,204,138,0.12)",
  border: "1px solid rgba(46,204,138,0.25)",
  color: "var(--green-mid)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const waLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: 1.2,
  textTransform: "uppercase",
  color: "rgba(245,243,238,0.55)",
  marginBottom: 8,
};

const waInputStyle: React.CSSProperties = {
  width: "100%",
  background: "transparent",
  border: "1.5px solid rgba(245,243,238,0.18)",
  borderRadius: 10,
  padding: "12px 14px",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 15,
  color: "#F5F3EE",
  outline: "none",
  boxSizing: "border-box",
};

const WA_NUMBER = "32471601573";

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

function ContactPage() {
  const [wa, setWa] = useState({ name: "", email: "", phone: "", note: "" });
  const [errors, setErrors] = useState<WaErrors>({});
  const [navOpen, setNavOpen] = useState(false);

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
      const first = result.error.issues[0]?.message ?? "Controleer het formulier.";
      toast.error(first);
      const focusId = fieldErrors.name ? "wa-name" : fieldErrors.email ? "wa-email" : null;
      if (focusId) document.getElementById(focusId)?.focus();
      return;
    }
    setErrors({});
    const data = result.data;
    const text =
      `Hallo Velopass,\n\n` +
      `Naam: ${data.name}\n` +
      `E-mail: ${data.email}\n` +
      (data.phone ? `Telefoon: ${data.phone}\n` : "") +
      (data.note ? `\n${data.note}\n` : "");
    const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const pickSuggestion = (prefill: string) => {
    setWa((w) => ({ ...w, note: prefill }));
    const el = document.getElementById("wa-form");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => document.getElementById("wa-name")?.focus(), 400);
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

      <main style={{ background: "var(--bg)", paddingTop: 16, minHeight: "100vh" }}>
        {/* HEADER */}
        <section style={{ padding: "24px 6vw 32px", maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <h1
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(36px, 5vw, 56px)",
              lineHeight: 1.05,
              letterSpacing: "-1.5px",
              color: "var(--navy)",
              marginBottom: 16,
            }}
          >
            Hoe kunnen we helpen?
          </h1>
          <p style={{ fontSize: 17, color: "var(--text-muted)", maxWidth: 560, margin: "0 auto", lineHeight: 1.6 }}>
            Stuur ons een bericht via WhatsApp — gemiddeld antwoord binnen 2 uur tijdens kantooruren.
          </p>
        </section>

        {/* SUGGESTIES */}
        <section style={{ padding: "8px 6vw 24px", maxWidth: 1100, margin: "0 auto" }}>
          <p style={{ textAlign: "center", fontSize: 12, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 16 }}>
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
                  <div style={iconBox}><Icon size={22} strokeWidth={1.8} /></div>
                  <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 17, color: "var(--navy)", letterSpacing: "-0.2px" }}>
                    {s.title}
                  </h3>
                  <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6, flex: 1, margin: 0 }}>
                    {s.desc}
                  </p>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--green-mid)" }}>Kies dit onderwerp →</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* WHATSAPP FORM */}
        <section id="wa-form" style={{ padding: "24px 6vw 96px", maxWidth: 720, margin: "0 auto" }}>
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
                  style={{ ...waInputStyle, borderColor: errors.name ? "#ff6b6b" : waInputStyle.border?.toString().includes("rgba") ? undefined : undefined }}
                />
                {errors.name && (
                  <p style={{ marginTop: 6, fontSize: 13, color: "#ff8a8a" }}>{errors.name}</p>
                )}
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
                {errors.email && (
                  <p style={{ marginTop: 6, fontSize: 13, color: "#ff8a8a" }}>{errors.email}</p>
                )}
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

        {/* WETTELIJKE GEGEVENS */}
        <section style={{ padding: "0 6vw 24px", maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7, margin: 0 }}>
            Velopass BV<br />
            Stokerijstraat 29/bus a1, 2110 Wijnegem, België<br />
            BTW: BE0777.359.681 · KBO: 0777359681<br />
            support@velopass.com
          </p>
        </section>
      </main>

      <Footer />

      <style>{`
        .back-btn-wrap { padding: 72px 6vw 0; max-width: 1100px; margin: 0 auto; }
        .back-btn { display: inline-flex; align-items: center; gap: 6px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; color: var(--text-muted); background: none; border: none; cursor: pointer; padding: 0; text-decoration: underline; text-underline-offset: 3px; }
        .contact-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .contact-card { border: 1px solid var(--border); }
        .contact-card:hover { transform: translateY(-3px); box-shadow: 0 20px 40px rgba(13,31,60,0.08); border-color: rgba(46,204,138,0.4); }
        .wa-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .wa-grid input::placeholder, .wa-grid textarea::placeholder { color: rgba(245,243,238,0.35); }
        .wa-grid input:focus, .wa-grid textarea:focus { border-color: #2ECC8A; }
        @media (max-width: 768px) {
          .back-btn-wrap { padding-top: 64px; }
          .back-btn { font-size: 12px; }
          .contact-cards { grid-template-columns: 1fr; }
          .wa-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
}
