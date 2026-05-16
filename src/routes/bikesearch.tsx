import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { QrCode, Hash, CheckCircle2, AlertTriangle, Search, Loader2 } from "lucide-react";
import { VelopassMark } from "@/components/VelopassMark";
import { QrScanDialog } from "@/components/QrScanDialog";

export const Route = createFileRoute("/bikesearch")({
  head: () => ({
    meta: [
      { title: "Check de status van een fiets — Velopass" },
      {
        name: "description",
        content:
          "Controleer of een fiets geregistreerd is in de Velopass Community — zonder account, in enkele seconden.",
      },
      { property: "og:title", content: "Check de status van een fiets — Velopass" },
      {
        property: "og:description",
        content: "Controleer een fiets via de Velopass-code of merk + framenummer.",
      },
    ],
  }),
  component: BikeSearchPage,
});

type Status = "secured" | "secured_reported" | "not_registered";
type Lang = "nl-nl" | "fr-fr";

const BRANDS = [
  "Trek", "Specialized", "Cube", "Giant", "Cannondale", "Scott", "Bianchi",
  "BMC", "Canyon", "Merida", "Ridley", "KTM", "Stevens", "Koga", "Gazelle",
  "Batavus", "Cortina", "Cowboy", "VanMoof", "Riese & Müller", "Andere",
];

const t = (lang: Lang) => ({
  back: lang === "fr-fr" ? "← Retour à velopass.com" : "← Terug naar velopass.com",
  eyebrow: lang === "fr-fr" ? "VÉRIFIER UN VÉLO" : "FIETS CONTROLEREN",
  title: lang === "fr-fr" ? "Vérifiez le statut d'un vélo" : "Check de status van een fiets",
  subtitle:
    lang === "fr-fr"
      ? "Vérifiez si un vélo est enregistré dans la Communauté Velopass — sans compte, en quelques secondes."
      : "Controleer of een fiets geregistreerd is in de Velopass Community — zonder account, in enkele seconden.",
  methodA: lang === "fr-fr" ? "Via le code Velopass" : "Via de Velopass-code",
  methodAdesc:
    lang === "fr-fr"
      ? "Scannez le QR-code sur le Frame-ID ou entrez le code Velopass manuellement."
      : "Scan de QR-code op de Frame-ID of voer de Velopass-code handmatig in.",
  codeLabel: lang === "fr-fr" ? "Code Velopass" : "Velopass-code",
  methodB: lang === "fr-fr" ? "Via la marque et le numéro de cadre" : "Via merk en framenummer",
  methodBdesc:
    lang === "fr-fr"
      ? "Recherchez sur base de la marque et du numéro de cadre du vélo."
      : "Zoek op basis van het merk en het framenummer van de fiets.",
  brand: lang === "fr-fr" ? "Marque" : "Merk",
  brandPlaceholder: lang === "fr-fr" ? "Choisir une marque" : "Kies een merk",
  frameNumber: lang === "fr-fr" ? "Numéro de cadre" : "Framenummer",
  check: lang === "fr-fr" ? "Vérifier" : "Controleer",
  loading: lang === "fr-fr" ? "Vérification..." : "Controleren...",
  error: lang === "fr-fr" ? "Une erreur s'est produite. Réessayez." : "Er ging iets mis. Probeer het opnieuw.",
  securedTitle: lang === "fr-fr" ? "Ce vélo est sécurisé" : "Deze fiets is beveiligd",
  securedBody:
    lang === "fr-fr"
      ? "Ce vélo est enregistré dans la Communauté Velopass et n'a pas été signalé comme disparu."
      : "Deze fiets is geregistreerd in de Velopass Community en niet gemeld als vermist.",
  securedCta: lang === "fr-fr" ? "C'est votre vélo ? Ouvrez votre Velopass →" : "Is dit jouw fiets? Open je Velopass →",
  reportedTitle: lang === "fr-fr" ? "Ce vélo a été signalé" : "Deze fiets is gemeld",
  reportedBody:
    lang === "fr-fr"
      ? "Ce vélo est enregistré et activement signalé par son propriétaire. La Communauté Velopass cherche activement."
      : "Deze fiets is geregistreerd én actief gemeld door de eigenaar. De Velopass Community zoekt actief mee.",
  reportedCtaPrimary: lang === "fr-fr" ? "Signaler un vélo trouvé →" : "Meld een gevonden fiets →",
  reportedCtaSecondary: lang === "fr-fr" ? "Appeler la police : 101" : "Bel politie: 101",
  notRegTitle: lang === "fr-fr" ? "Non enregistré" : "Niet geregistreerd",
  notRegBody:
    lang === "fr-fr"
      ? "Ce vélo ne figure pas dans la base de données Velopass. Enregistrez-le pour le sécuriser."
      : "Deze fiets staat niet in de Velopass-database. Registreer hem om hem te beveiligen.",
  notRegCta: lang === "fr-fr" ? "Enregistrez votre vélo →" : "Registreer je fiets →",
  captcha: lang === "fr-fr" ? "Je ne suis pas un robot" : "Ik ben geen robot",
  scanCta: lang === "fr-fr" ? "Scanner le QR-code" : "Scan de QR-code",
  manualCta: lang === "fr-fr" ? "Entrer le code manuellement" : "Code handmatig invoeren",
});

// Mock backend — deterministic based on input
async function mockBikeStatus(payload: { velopass_code?: string; frame_number?: string }): Promise<{ status: Status }> {
  await new Promise((r) => setTimeout(r, 700));
  const key = (payload.velopass_code || payload.frame_number || "").toUpperCase().replace(/\s/g, "");
  if (!key) throw new Error("empty");
  // Demo rule: digit sum determines status
  const sum = key.split("").reduce((a, c) => a + (c.charCodeAt(0) % 7), 0);
  const mod = sum % 3;
  const status: Status = mod === 0 ? "secured" : mod === 1 ? "secured_reported" : "not_registered";
  return { status };
}

function BikeSearchPage() {
  const search = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const lang: Lang = search.get("lng") === "fr-fr" ? "fr-fr" : "nl-nl";
  const L = useMemo(() => t(lang), [lang]);

  const [codeA, setCodeA] = useState("");
  const [brand, setBrand] = useState("");
  const [frame, setFrame] = useState("");
  const [captcha, setCaptcha] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);
  const [result, setResult] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submitA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeA.trim()) return;
    setError(null);
    setResult(null);
    setLoadingA(true);
    try {
      const res = await mockBikeStatus({ velopass_code: codeA.trim() });
      setResult(res.status);
    } catch {
      setError(L.error);
    } finally {
      setLoadingA(false);
    }
  };

  const submitB = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand || !frame.trim() || !captcha) return;
    setError(null);
    setResult(null);
    setLoadingB(true);
    try {
      const res = await mockBikeStatus({ frame_number: `${brand}-${frame.trim()}` });
      setResult(res.status);
    } catch {
      setError(L.error);
    } finally {
      setLoadingB(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F5F3EE", display: "flex", flexDirection: "column" }}>
      {/* NAV */}
      <nav
        style={{
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 6vw",
          background: "#F5F3EE",
          borderBottom: "1px solid rgba(13,31,60,0.08)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <a href="https://velopass.com" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <VelopassMark size={32} />
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 17, color: "#0D1F3C", letterSpacing: "-0.3px" }}>
            velopass
          </span>
        </a>
        <a
          href="https://velopass.com"
          style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: 14, color: "#5A7090", textDecoration: "none" }}
        >
          {L.back}
        </a>
      </nav>

      {/* HERO */}
      <section style={{ padding: "64px 6vw 32px", textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 500,
            fontSize: 11,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            color: "#2ECC8A",
            marginBottom: 16,
          }}
        >
          {L.eyebrow}
        </div>
        <h1
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(32px, 5vw, 52px)",
            lineHeight: 1.1,
            color: "#0D1F3C",
            letterSpacing: "-1px",
            marginBottom: 18,
          }}
        >
          {L.title}
        </h1>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 300,
            fontSize: 17,
            color: "#5A7090",
            maxWidth: 480,
            margin: "0 auto",
            lineHeight: 1.6,
          }}
        >
          {L.subtitle}
        </p>
      </section>

      {/* METHODS */}
      <section style={{ padding: "16px 6vw 32px", maxWidth: 1080, margin: "0 auto", width: "100%" }}>
        <div className="bs-grid">
          {/* METHOD A */}
          <form onSubmit={submitA} className="bs-card bs-card-primary">
            <div style={{ marginBottom: 14 }}>
              <QrCode size={28} color="#2ECC8A" strokeWidth={1.8} />
            </div>
            <h2 style={cardTitle}>{L.methodA}</h2>
            <p style={cardDesc}>{L.methodAdesc}</p>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: manualOpen ? 18 : 0 }}>
              <button
                type="button"
                onClick={() => setScanOpen(true)}
                style={{
                  ...navyBtn(false),
                  marginTop: 0,
                  width: "auto",
                  flex: "1 1 200px",
                  background: "#0D1F3C",
                }}
              >
                <QrCode size={16} strokeWidth={2} /> {L.scanCta}
              </button>
              <button
                type="button"
                onClick={() => setManualOpen((o) => !o)}
                style={{
                  marginTop: 0,
                  background: "transparent",
                  color: "#0D1F3C",
                  border: "1.5px solid rgba(13,31,60,0.2)",
                  borderRadius: 10,
                  padding: "14px 20px",
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 500,
                  fontSize: 14,
                  cursor: "pointer",
                  flex: "1 1 200px",
                }}
              >
                {L.manualCta} {manualOpen ? "↑" : "→"}
              </button>
            </div>

            {manualOpen && (
              <>
                <label style={{ ...labelStyle, marginTop: 4 }} htmlFor="bs-code">{L.codeLabel}</label>
                <input
                  id="bs-code"
                  type="text"
                  value={codeA}
                  onChange={(e) => setCodeA(e.target.value)}
                  placeholder="87CH9810171"
                  maxLength={32}
                  style={inputStyle}
                  autoFocus
                />
                <button type="submit" disabled={loadingA || !codeA.trim()} style={navyBtn(loadingA || !codeA.trim())}>
                  {loadingA ? (
                    <>
                      <Loader2 size={16} className="bs-spin" /> {L.loading}
                    </>
                  ) : (
                    L.check
                  )}
                </button>
              </>
            )}
          </form>

          {/* METHOD B */}
          <form onSubmit={submitB} className="bs-card">
            <div style={{ marginBottom: 14 }}>
              <Hash size={28} color="#5A7090" strokeWidth={1.8} />
            </div>
            <h2 style={cardTitle}>{L.methodB}</h2>
            <p style={cardDesc}>{L.methodBdesc}</p>

            <label style={labelStyle} htmlFor="bs-brand">{L.brand}</label>
            <select
              id="bs-brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              style={{ ...inputStyle, appearance: "none", background: "#fff" }}
            >
              <option value="">{L.brandPlaceholder}</option>
              {BRANDS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            <label style={{ ...labelStyle, marginTop: 12 }} htmlFor="bs-frame">{L.frameNumber}</label>
            <input
              id="bs-frame"
              type="text"
              value={frame}
              onChange={(e) => setFrame(e.target.value)}
              placeholder="WTU212C0774E"
              maxLength={32}
              style={inputStyle}
            />

            {/* Mock reCAPTCHA */}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                border: "1px solid rgba(13,31,60,0.12)",
                borderRadius: 6,
                background: "#F9FAFB",
                marginTop: 14,
                cursor: "pointer",
                fontSize: 14,
                color: "#0D1F3C",
              }}
            >
              <input
                type="checkbox"
                checked={captcha}
                onChange={(e) => setCaptcha(e.target.checked)}
                style={{ width: 22, height: 22, cursor: "pointer" }}
              />
              <span style={{ flex: 1 }}>{L.captcha}</span>
              <span style={{ fontSize: 10, color: "#5A7090", textAlign: "right", lineHeight: 1.2 }}>
                reCAPTCHA
                <br />
                <span style={{ fontSize: 9 }}>Privacy · Terms</span>
              </span>
            </label>

            <button
              type="submit"
              disabled={loadingB || !brand || !frame.trim() || !captcha}
              style={navyBtn(loadingB || !brand || !frame.trim() || !captcha)}
            >
              {loadingB ? (
                <>
                  <Loader2 size={16} className="bs-spin" /> {L.loading}
                </>
              ) : (
                L.check
              )}
            </button>
          </form>
        </div>

        {/* ERROR */}
        {error && (
          <div
            style={{
              maxWidth: 680,
              margin: "24px auto 0",
              padding: "14px 18px",
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: 10,
              color: "#E05252",
              fontSize: 14,
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        {/* RESULT */}
        {result && (
          <div style={{ maxWidth: 680, margin: "32px auto 0" }}>
            {result === "secured" && <SecuredCard L={L} />}
            {result === "secured_reported" && <ReportedCard L={L} />}
            {result === "not_registered" && <NotRegCard L={L} />}
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer
        style={{
          marginTop: "auto",
          padding: "32px 6vw",
          textAlign: "center",
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 400,
          fontSize: 12,
          color: "#5A7090",
          borderTop: "1px solid rgba(13,31,60,0.08)",
        }}
      >
        © 2026 Velopass BV · Stokerijstraat 29/bus a1, 2110 Wijnegem · BTW BE0777.359.681 ·{" "}
        <a href="https://velopass.com" style={{ color: "#2ECC8A", textDecoration: "none" }}>
          velopass.com
        </a>
      </footer>

      <style>{`
        .bs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        @media (max-width: 768px) { .bs-grid { grid-template-columns: 1fr; } }
        .bs-card {
          background: #fff;
          border: 1px solid rgba(13,31,60,0.1);
          border-radius: 14px;
          padding: 32px;
          display: flex;
          flex-direction: column;
        }
        .bs-card-primary { border-top: 3px solid #2ECC8A; }
        .bs-spin { animation: bs-spin 0.8s linear infinite; }
        @keyframes bs-spin { to { transform: rotate(360deg); } }
      `}</style>

      <QrScanDialog open={scanOpen} onOpenChange={setScanOpen} />
    </div>
  );
}

/* ---------- styles ---------- */
const cardTitle: React.CSSProperties = {
  fontFamily: "'Syne', sans-serif",
  fontWeight: 700,
  fontSize: 20,
  color: "#0D1F3C",
  letterSpacing: "-0.3px",
  marginBottom: 8,
};
const cardDesc: React.CSSProperties = {
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 14,
  color: "#5A7090",
  lineHeight: 1.55,
  marginBottom: 22,
};
const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "'DM Sans', sans-serif",
  fontWeight: 500,
  fontSize: 12,
  color: "#0D1F3C",
  textTransform: "uppercase",
  letterSpacing: 0.8,
  marginBottom: 6,
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#fff",
  border: "1.5px solid rgba(13,31,60,0.12)",
  borderRadius: 10,
  padding: "12px 14px",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 15,
  color: "#0D1F3C",
  outline: "none",
  boxSizing: "border-box",
};
const navyBtn = (disabled: boolean): React.CSSProperties => ({
  marginTop: 18,
  width: "100%",
  background: disabled ? "#94A3B8" : "#0D1F3C",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "14px 20px",
  fontFamily: "'DM Sans', sans-serif",
  fontWeight: 500,
  fontSize: 15,
  cursor: disabled ? "not-allowed" : "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  transition: "background 0.2s",
});

/* ---------- result cards ---------- */
const badgeBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  fontFamily: "'Syne', sans-serif",
  fontWeight: 700,
  fontSize: 11,
  letterSpacing: 0.8,
  textTransform: "uppercase",
  borderRadius: 100,
  padding: "3px 12px",
};
const resultCard = (color: string): React.CSSProperties => ({
  background: "#fff",
  borderRadius: 14,
  borderLeft: `4px solid ${color}`,
  border: "1px solid rgba(13,31,60,0.1)",
  borderLeftWidth: 4,
  borderLeftColor: color,
  padding: "28px 32px",
  boxShadow: "0 10px 30px rgba(13,31,60,0.06)",
});
const resultTitle: React.CSSProperties = {
  fontFamily: "'Syne', sans-serif",
  fontWeight: 700,
  fontSize: 22,
  color: "#0D1F3C",
  letterSpacing: "-0.3px",
  marginTop: 14,
  marginBottom: 8,
};
const resultBody: React.CSSProperties = {
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 15,
  color: "#5A7090",
  lineHeight: 1.6,
  marginBottom: 20,
};

function SecuredCard({ L }: { L: ReturnType<typeof t> }) {
  return (
    <div style={resultCard("#2ECC8A")}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ ...badgeBase, background: "#2ECC8A", color: "#0D1F3C" }}>SECURED</span>
        <CheckCircle2 color="#2ECC8A" size={24} />
      </div>
      <h3 style={resultTitle}>{L.securedTitle}</h3>
      <p style={resultBody}>{L.securedBody}</p>
      <a
        href="https://velopass.com"
        style={{ color: "#2ECC8A", fontWeight: 500, textDecoration: "none", fontSize: 14 }}
      >
        {L.securedCta}
      </a>
    </div>
  );
}

function ReportedCard({ L }: { L: ReturnType<typeof t> }) {
  return (
    <div style={resultCard("#F59E0B")}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ ...badgeBase, background: "#2ECC8A", color: "#0D1F3C" }}>SECURED</span>
        <span style={{ ...badgeBase, background: "#F59E0B", color: "#0D1F3C" }}>REPORTED</span>
        <AlertTriangle color="#F59E0B" size={24} style={{ marginLeft: 4 }} />
      </div>
      <h3 style={resultTitle}>{L.reportedTitle}</h3>
      <p style={resultBody}>{L.reportedBody}</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <a
          href="mailto:found@velopass.com"
          style={{
            background: "#0D1F3C",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: 10,
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {L.reportedCtaPrimary}
        </a>
        <a
          href="tel:101"
          style={{
            background: "transparent",
            color: "#0D1F3C",
            border: "1.5px solid #0D1F3C",
            padding: "12px 20px",
            borderRadius: 10,
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {L.reportedCtaSecondary}
        </a>
      </div>
    </div>
  );
}

function NotRegCard({ L }: { L: ReturnType<typeof t> }) {
  return (
    <div style={resultCard("#CBD5E1")}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ ...badgeBase, background: "#F1F5F9", color: "#0D1F3C" }}>NOT REGISTERED</span>
        <Search color="#5A7090" size={24} />
      </div>
      <h3 style={resultTitle}>{L.notRegTitle}</h3>
      <p style={resultBody}>{L.notRegBody}</p>
      <a
        href="https://velopass.com"
        style={{
          background: "#0D1F3C",
          color: "#fff",
          padding: "12px 20px",
          borderRadius: 10,
          textDecoration: "none",
          fontSize: 14,
          fontWeight: 500,
          display: "inline-block",
        }}
      >
        {L.notRegCta}
      </a>
    </div>
  );
}
