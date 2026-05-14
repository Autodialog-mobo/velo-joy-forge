import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { HelpCircle, Package, ScanLine, CheckCircle2 } from "lucide-react";
import { VelopassMark } from "@/components/VelopassMark";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Velopass" },
      {
        name: "description",
        content:
          "Hulp nodig bij activatie, je sticker of een gevonden fiets? Neem contact op met het Velopass-team — we antwoorden binnen 2 werkdagen.",
      },
      { property: "og:title", content: "Contact — Velopass" },
      {
        property: "og:description",
        content:
          "Kies een onderwerp en het Velopass-team helpt je zo snel mogelijk verder.",
      },
    ],
  }),
  component: ContactPage,
});

const cardStyle: React.CSSProperties = {
  background: "var(--white)",
  border: "1px solid var(--border)",
  borderRadius: "var(--r-lg)",
  padding: "28px 24px",
  textDecoration: "none",
  color: "inherit",
  display: "flex",
  flexDirection: "column",
  gap: 12,
  transition: "transform 0.2s, box-shadow 0.2s, border-color 0.2s",
};

const iconBox: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 12,
  background: "rgba(46,204,138,0.12)",
  border: "1px solid rgba(46,204,138,0.25)",
  color: "var(--green-mid)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: 0.4,
  textTransform: "uppercase",
  color: "var(--text-muted)",
  marginBottom: 7,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--bg)",
  border: "1.5px solid rgba(13,31,60,0.12)",
  borderRadius: "var(--r-sm)",
  padding: "11px 14px",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 14,
  color: "var(--navy)",
  outline: "none",
};

function ContactPage() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "Activatie of login",
    message: "",
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return;
    setSent(true);
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
        <section style={{ padding: "80px 6vw 40px", maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
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
          <p style={{ fontSize: 17, color: "var(--text-muted)", maxWidth: 520, margin: "0 auto", lineHeight: 1.6 }}>
            Kies een onderwerp en we helpen je zo snel mogelijk verder.
          </p>
        </section>

        {/* SNELKOPPELINGEN */}
        <section style={{ padding: "16px 6vw 40px", maxWidth: 1100, margin: "0 auto" }}>
          <div className="contact-cards">
            <a href="mailto:support@velopass.com?subject=Hulp%20bij%20activatie" style={cardStyle} className="contact-card">
              <div style={iconBox}><HelpCircle size={22} strokeWidth={1.8} /></div>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 17, color: "var(--navy)", letterSpacing: "-0.2px" }}>
                Hulp bij activatie
              </h3>
              <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6, flex: 1 }}>
                Uitnodiging ontvangen maar lukt het niet om in te loggen?
              </p>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--green-mid)" }}>support@velopass.com →</span>
            </a>

            <a href="mailto:support@velopass.com?subject=Vraag%20over%20sticker" style={cardStyle} className="contact-card">
              <div style={iconBox}><Package size={22} strokeWidth={1.8} /></div>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 17, color: "var(--navy)", letterSpacing: "-0.2px" }}>
                Vraag over mijn sticker
              </h3>
              <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6, flex: 1 }}>
                Sticker niet ontvangen, beschadigd of een andere vraag over je bestelling?
              </p>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--green-mid)" }}>Stuur een mail →</span>
            </a>

            <a href="mailto:support@velopass.com?subject=Gevonden%20fiets" style={cardStyle} className="contact-card">
              <div style={iconBox}><ScanLine size={22} strokeWidth={1.8} /></div>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 17, color: "var(--navy)", letterSpacing: "-0.2px" }}>
                Gevonden fiets melden
              </h3>
              <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6, flex: 1 }}>
                Heb je een fiets gevonden met een Velopass-sticker?
              </p>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--green-mid)" }}>Meld de vondst →</span>
            </a>
          </div>
        </section>

        {/* FORMULIER */}
        <section style={{ padding: "32px 6vw 80px", maxWidth: 600, margin: "0 auto" }}>
          <div
            style={{
              background: "var(--white)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-xl)",
              padding: "36px 32px",
            }}
          >
            {sent ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: 16,
                  padding: "24px 8px",
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: "var(--green-pale)",
                    color: "var(--green-mid)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CheckCircle2 size={28} />
                </div>
                <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 22, color: "var(--navy)" }}>
                  Bericht verstuurd
                </h3>
                <p style={{ fontSize: 15, color: "var(--text-mid)", lineHeight: 1.6, maxWidth: 380 }}>
                  Je bericht is verstuurd. We antwoorden binnen 2 werkdagen.
                </p>
              </div>
            ) : (
              <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div>
                  <label htmlFor="c-name" style={labelStyle}>Naam</label>
                  <input
                    id="c-name"
                    type="text"
                    required
                    maxLength={100}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label htmlFor="c-email" style={labelStyle}>E-mailadres</label>
                  <input
                    id="c-email"
                    type="email"
                    required
                    maxLength={255}
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label htmlFor="c-subject" style={labelStyle}>Onderwerp</label>
                  <select
                    id="c-subject"
                    required
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    style={inputStyle}
                  >
                    <option>Activatie of login</option>
                    <option>Mijn sticker</option>
                    <option>Pechhulp of verzekering</option>
                    <option>Gevonden fiets</option>
                    <option>Andere vraag</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="c-message" style={labelStyle}>Bericht</label>
                  <textarea
                    id="c-message"
                    rows={5}
                    required
                    maxLength={2000}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    width: "100%",
                    background: "var(--navy)",
                    color: "#fff",
                    border: "none",
                    padding: "14px 20px",
                    borderRadius: 10,
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 500,
                    fontSize: 15,
                    cursor: "pointer",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--navy-mid)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "var(--navy)")}
                >
                  Verstuur bericht
                </button>
              </form>
            )}
          </div>

          <p style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "var(--text-muted)" }}>
            Of stuur ons rechtstreeks een mail:{" "}
            <a href="mailto:support@velopass.com" style={{ color: "var(--green-mid)", textDecoration: "none", fontWeight: 500 }}>
              support@velopass.com
            </a>
          </p>
        </section>
      </main>

      <style>{`
        .contact-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .contact-card:hover { transform: translateY(-3px); box-shadow: 0 20px 40px rgba(13,31,60,0.08); border-color: rgba(46,204,138,0.4); }
        @media (max-width: 768px) {
          .contact-cards { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
}
