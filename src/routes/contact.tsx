import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { HelpCircle, Package, ScanLine, MessageCircle } from "lucide-react";
import { VelopassMark } from "@/components/VelopassMark";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Velopass" },
      {
        name: "description",
        content:
          "Hulp nodig bij activatie, je sticker of een gevonden fiets? Stuur het Velopass-team een bericht via WhatsApp.",
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
    title: "Vraag over mijn sticker",
    desc: "Sticker niet ontvangen, beschadigd of een andere vraag over je bestelling?",
    prefill: "Hallo Velopass, ik heb een vraag over mijn sticker: ",
  },
  {
    icon: ScanLine,
    title: "Gevonden fiets melden",
    desc: "Heb je een fiets gevonden met een Velopass-sticker?",
    prefill: "Hallo Velopass, ik heb een fiets gevonden met een Velopass-sticker. ",
  },
];

function ContactPage() {
  const [wa, setWa] = useState({ name: "", email: "", phone: "", note: "" });

  const canSendWa = wa.name.trim() && wa.email.trim();

  const sendWa = () => {
    if (!canSendWa) return;
    const text =
      `Hallo Velopass,\n\n` +
      `Naam: ${wa.name}\n` +
      `E-mail: ${wa.email}\n` +
      (wa.phone.trim() ? `Telefoon: ${wa.phone}\n` : "") +
      (wa.note.trim() ? `\n${wa.note}\n` : "");
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
      <nav className="vp-nav">
        <Link to="/" className="nav-logo">
          <div className="logo-mark"><VelopassMark /></div>
          <span className="logo-text">velopass</span>
        </Link>
        <ul className="nav-links">
          <li><Link to="/pro" style={{ color: "var(--green-mid)" }}>↗ Voor fietswinkels</Link></li>
        </ul>
        <Link to="/" className="btn-login">← Terug</Link>
      </nav>

      <main style={{ background: "var(--bg)", paddingTop: 64, minHeight: "100vh" }}>
        {/* HEADER */}
        <section style={{ padding: "80px 6vw 32px", maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <div className="eyebrow" style={{ color: "var(--green-mid)" }}>Contact</div>
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
                  onChange={(e) => setWa({ ...wa, name: e.target.value })}
                  placeholder="Jan Janssens"
                  style={waInputStyle}
                />
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
                  onChange={(e) => setWa({ ...wa, email: e.target.value })}
                  placeholder="jan@voorbeeld.be"
                  style={waInputStyle}
                />
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
              disabled={!canSendWa}
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
                cursor: canSendWa ? "pointer" : "not-allowed",
                opacity: canSendWa ? 1 : 0.5,
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
      </main>

      <style>{`
        .contact-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .contact-card { border: 1px solid var(--border); }
        .contact-card:hover { transform: translateY(-3px); box-shadow: 0 20px 40px rgba(13,31,60,0.08); border-color: rgba(46,204,138,0.4); }
        .wa-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .wa-grid input::placeholder, .wa-grid textarea::placeholder { color: rgba(245,243,238,0.35); }
        .wa-grid input:focus, .wa-grid textarea:focus { border-color: #2ECC8A; }
        @media (max-width: 768px) {
          .contact-cards { grid-template-columns: 1fr; }
          .wa-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
}
