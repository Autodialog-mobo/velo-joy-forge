import { Fragment, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowUpRight,
  ArrowLeft,
  CheckCircle2,
  CheckSquare,
  Lightbulb,
  ExternalLink,
  Search,
  AlertTriangle,
  Smartphone,
  Database,
  Shield,
} from "lucide-react";
import { VelopassMark } from "@/components/VelopassMark";
import { Footer } from "@/components/Footer";
import { LangSwitcher } from "@/components/LangSwitcher";
import { useCurrentLang } from "@/i18n/useCurrentLang";
import { buildLocalizedHead } from "@/i18n/seo";
import { isLang } from "@/i18n/config";
import nlStolen from "@/i18n/locales/nl/stolen.json";
import enStolen from "@/i18n/locales/en/stolen.json";
import frStolen from "@/i18n/locales/fr/stolen.json";
import deStolen from "@/i18n/locales/de/stolen.json";

const STOLEN_META = {
  nl: nlStolen.meta,
  en: enStolen.meta,
  fr: frStolen.meta,
  de: deStolen.meta,
} as const;

export const Route = createFileRoute("/$lang/stolen")({
  head: ({ params }) => {
    const lang = isLang(params.lang) ? params.lang : "en";
    const m = STOLEN_META[lang];
    return buildLocalizedHead({
      lang,
      path: "stolen",
      title: m.title,
      description: m.description,
    });
  },
  component: GestolenPage,
});

const APP_LOGIN = "https://app.velopass.com/login";

const NAVY = "#0D1F3C";
const GREEN = "#2ECC8A";
const MUTED = "#5A7090";

const sectionStyle: React.CSSProperties = {
  maxWidth: 880,
  margin: "0 auto",
  padding: "0 6vw",
};

const h2Style: React.CSSProperties = {
  fontFamily: "'Syne', sans-serif",
  fontWeight: 700,
  fontSize: "clamp(24px, 3vw, 32px)",
  color: NAVY,
  letterSpacing: "-0.5px",
  lineHeight: 1.15,
  marginBottom: 14,
};

const bodyStyle: React.CSSProperties = {
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 16,
  lineHeight: 1.65,
  color: MUTED,
};

const navyBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  background: NAVY,
  color: "#F5F3EE",
  padding: "12px 22px",
  borderRadius: 10,
  fontFamily: "'DM Sans', sans-serif",
  fontWeight: 500,
  fontSize: 14,
  textDecoration: "none",
  border: "none",
  cursor: "pointer",
};

const cardStyle: React.CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid rgba(13,31,60,0.1)",
  borderRadius: 16,
  padding: "28px 28px",
};

function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        background: `${color}1F`,
        color,
        border: `1px solid ${color}55`,
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 600,
        fontSize: 11,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        padding: "4px 10px",
        borderRadius: 100,
      }}
    >
      {label}
    </span>
  );
}

function getBrowserCountry(): "BE" | "NL" | "FR" {
  const lang = typeof navigator !== "undefined" ? navigator.language || "" : "";
  const region = lang.split("-")[1]?.toUpperCase();
  if (region === "BE" || region === "NL" || region === "FR") return region;
  if (lang.startsWith("nl")) return "NL";
  if (lang.startsWith("fr")) return "FR";
  return "BE";
}

/* ---------------- Inline markdown renderer ----------------
   Supports inside a line:
     **bold**  → <strong>
     *italic*  → <em>
     [label](url) → external link (green underline)
   Block-level:
     Lines starting with "• " → bullet list
     "\n" → paragraph break
   Used for step.body, intro paragraphs, etc.
------------------------------------------------------------- */

const INLINE_RE = /(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)]+\))|(\*[^*]+\*)/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(INLINE_RE)) {
    const start = m.index ?? 0;
    if (start > last) {
      out.push(<Fragment key={`${keyPrefix}-t-${i++}`}>{text.slice(last, start)}</Fragment>);
    }
    const tok = m[0];
    if (tok.startsWith("**")) {
      out.push(
        <strong key={`${keyPrefix}-b-${i++}`} style={{ color: NAVY }}>
          {tok.slice(2, -2)}
        </strong>,
      );
    } else if (tok.startsWith("[")) {
      const mm = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(tok);
      if (mm) {
        out.push(
          <a
            key={`${keyPrefix}-l-${i++}`}
            href={mm[2]}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: GREEN,
              textDecoration: "underline",
              textUnderlineOffset: 3,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {mm[1]} <ExternalLink size={14} strokeWidth={2} />
          </a>,
        );
      }
    } else if (tok.startsWith("*")) {
      out.push(<em key={`${keyPrefix}-i-${i++}`}>{tok.slice(1, -1)}</em>);
    }
    last = start + tok.length;
  }
  if (last < text.length) {
    out.push(<Fragment key={`${keyPrefix}-t-${i++}`}>{text.slice(last)}</Fragment>);
  }
  return out;
}

function MarkdownBlock({ text, keyPrefix }: { text: string; keyPrefix: string }) {
  const lines = text.split("\n");
  const bulletLines = lines.filter((l) => l.startsWith("• "));
  const allBullets = bulletLines.length === lines.filter((l) => l.trim().length > 0).length && bulletLines.length > 0;

  if (allBullets) {
    return (
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
        {bulletLines.map((l, idx) => (
          <li key={`${keyPrefix}-li-${idx}`}>{renderInline(l, `${keyPrefix}-${idx}`)}</li>
        ))}
      </ul>
    );
  }

  // Split into paragraphs by blank line; inside paragraph, render with <br/>
  const paragraphs: string[][] = [[]];
  for (const l of lines) {
    if (l.trim() === "") paragraphs.push([]);
    else paragraphs[paragraphs.length - 1].push(l);
  }

  // Use <span style={{display:"block"}}> wrappers so the output stays valid
  // phrasing content inside parent <p> elements.
  return (
    <>
      {paragraphs.map((para, pi) => {
        if (para.length === 0) return null;
        return (
          <span
            key={`${keyPrefix}-p-${pi}`}
            style={{ display: "block", marginTop: pi === 0 ? 0 : 8 }}
          >
            {para.map((line, li) => {
              if (line.startsWith("• ")) {
                return (
                  <span
                    key={`${keyPrefix}-bl-${pi}-${li}`}
                    style={{ display: "flex", gap: 6, marginTop: li === 0 ? 0 : 2 }}
                  >
                    <span>•</span>
                    <span>{renderInline(line.slice(2), `${keyPrefix}-bl-${pi}-${li}`)}</span>
                  </span>
                );
              }
              return (
                <Fragment key={`${keyPrefix}-ln-${pi}-${li}`}>
                  {li > 0 ? <br /> : null}
                  {renderInline(line, `${keyPrefix}-ln-${pi}-${li}`)}
                </Fragment>
              );
            })}
          </span>
        );
      })}
    </>
  );
}

type ChecklistItem = { text: string; velopass?: string; note?: string };
type StepItem = { title: string; body: string; tip?: string };
type FlowStep = { title: string; body: string };

function GestolenPage() {
  const lang = useCurrentLang();
  const { t } = useTranslation(["stolen", "common"]);
  const [navOpen, setNavOpen] = useState(false);
  const [country, setCountry] = useState<"BE" | "NL" | "FR">(getBrowserCountry);

  const argRowsRaw = t("argument.rows", { returnObjects: true });
  const argRows: [string, string][] = Array.isArray(argRowsRaw) ? (argRowsRaw as [string, string][]) : [];

  const getList = <T,>(key: string): T[] => {
    const raw = t(key, { returnObjects: true });
    return Array.isArray(raw) ? (raw as T[]) : [];
  };

  return (
    <>
      <div className={`nav-backdrop${navOpen ? " open" : ""}`} onClick={() => setNavOpen(false)} aria-hidden="true" />
      <nav className="vp-nav">
        <Link to="/$lang" params={{ lang }} className="nav-logo">
          <div className="logo-mark"><VelopassMark /></div>
          <span className="logo-text">velopass</span>
        </Link>
        <ul className={`nav-links${navOpen ? " open" : ""}`} onClick={() => setNavOpen(false)}>
          <li><Link to="/$lang" params={{ lang }} hash="voordelen" hashScrollIntoView={{ behavior: "smooth", block: "start" }}>{t("common:nav.what_you_get")}</Link></li>
          <li><Link to="/$lang" params={{ lang }} hash="al-sticker" hashScrollIntoView={{ behavior: "smooth", block: "start" }}>{t("common:nav.already_have_one")}</Link></li>
          <li><Link to="/$lang" params={{ lang }} hash="nieuwe-sticker" hashScrollIntoView={{ behavior: "smooth", block: "start" }}>{t("common:nav.order_sticker")}</Link></li>
          <li><Link to="/$lang" params={{ lang }} hash="community" hashScrollIntoView={{ behavior: "smooth", block: "start" }}>{t("common:nav.community")}</Link></li>
          <li><Link to="/$lang/shop" params={{ lang }} style={{ color: "var(--green-mid)", display: "inline-flex", alignItems: "center", gap: 6 }}><ArrowUpRight size={15} strokeWidth={2.2} />{t("common:nav.for_professionals")}</Link></li>
        </ul>
        <div className="nav-actions" style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <LangSwitcher currentLang={lang} />
          <a href={APP_LOGIN} className="btn-login">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M2 13c0-2.5 2.7-4 6-4s6 1.5 6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {t("common:nav.login")}
          </a>
          <button
            type="button"
            className="nav-toggle"
            aria-label={t("common:nav.menu")}
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
          {t("back")}
        </button>
      </div>

      <main style={{ background: "var(--bg)", paddingTop: 16, paddingBottom: 80, minHeight: "100vh" }}>
        {/* HERO */}
        <section style={{ ...sectionStyle, textAlign: "center", padding: "24px 6vw 48px", maxWidth: 880 }}>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
              fontSize: 12,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: GREEN,
              marginBottom: 14,
            }}
          >
            {t("hero.eyebrow")}
          </p>
          <h1
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(34px, 5vw, 52px)",
              color: NAVY,
              letterSpacing: "-1.2px",
              lineHeight: 1.05,
              marginBottom: 18,
            }}
          >
            {t("hero.title")}
          </h1>
          <p style={{ ...bodyStyle, maxWidth: 560, margin: "0 auto" }}>
            {t("hero.lead")}
          </p>
        </section>

        {/* VELOPASS ARGUMENT */}
        <section style={{ ...sectionStyle, marginBottom: 64 }}>
          <div style={{ ...cardStyle, padding: "32px 32px" }}>
            <h2
              style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 700,
                fontSize: 20,
                color: NAVY,
                lineHeight: 1.3,
                marginBottom: 24,
              }}
            >
              {t("argument.title")}
            </h2>
            <div className="vp-compare-grid">
              {argRows.map(([left, right]) => (
                <div key={left} className="vp-compare-row">
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: 15, color: MUTED }}>
                    {left}
                  </div>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      fontFamily: "'DM Sans', sans-serif",
                      fontWeight: 500,
                      fontSize: 15,
                      color: GREEN,
                    }}
                  >
                    <CheckCircle2 size={16} strokeWidth={2.2} />
                    {right}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 28, textAlign: "center" }}>
              <a href={APP_LOGIN} style={navyBtn} target="_blank" rel="noopener noreferrer">
                {t("argument.cta")}
              </a>
            </div>
          </div>
        </section>

        {/* STAP 1 */}
        <section style={{ ...sectionStyle, marginBottom: 64 }}>
          <h2 style={h2Style}>{t("step1.title")}</h2>
          <p style={{ ...bodyStyle, marginBottom: 20 }}>
            <MarkdownBlock text={t("step1.body")} keyPrefix="s1" />
          </p>

          <div
            style={{
              ...cardStyle,
              display: "flex",
              gap: 16,
              alignItems: "flex-start",
              padding: "20px 22px",
              marginBottom: 24,
            }}
          >
            <div style={{ flexShrink: 0, marginTop: 2 }}>
              <StatusBadge label="REPORTED" color="#F59E0B" />
            </div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: MUTED, lineHeight: 1.6, margin: 0 }}>
              {t("step1.badge_note")}
            </p>
          </div>

          <a href={APP_LOGIN} style={navyBtn} target="_blank" rel="noopener noreferrer">
            {t("step1.cta")}
          </a>
        </section>

        {/* STAP 2 */}
        <section style={{ ...sectionStyle, marginBottom: 64 }}>
          <h2 style={h2Style}>{t("step2.title")}</h2>
          <p style={{ ...bodyStyle, marginBottom: 20 }}>{t("step2.lead")}</p>

          {/* Country tabs */}
          <div
            role="tablist"
            style={{
              display: "inline-flex",
              gap: 4,
              padding: 4,
              background: "rgba(13,31,60,0.06)",
              borderRadius: 12,
              marginBottom: 28,
              flexWrap: "wrap",
            }}
          >
            {(["BE", "NL", "FR"] as const).map((code) => {
              const active = country === code;
              return (
                <button
                  key={code}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setCountry(code)}
                  style={{
                    border: "none",
                    background: active ? "#FFFFFF" : "transparent",
                    color: active ? NAVY : MUTED,
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: active ? 600 : 500,
                    fontSize: 14,
                    padding: "8px 16px",
                    borderRadius: 8,
                    cursor: "pointer",
                    boxShadow: active ? "0 2px 8px rgba(13,31,60,0.08)" : "none",
                  }}
                >
                  {t(`step2.countries.${code}`)}
                </button>
              );
            })}
          </div>

          {country === "BE" && <CountryBE getList={getList} t={t} />}
          {country === "NL" && <CountryNL getList={getList} t={t} />}
          {country === "FR" && <CountryFR getList={getList} t={t} />}
        </section>

        {/* STAP 3 */}
        <section style={{ ...sectionStyle, marginBottom: 64 }}>
          <h2 style={h2Style}>{t("step3.title")}</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
            <StatusBadge label="ALL CLEAR" color={GREEN} />
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: MUTED }}>
              {t("step3.badge_note")}
            </span>
          </div>
          <p style={{ ...bodyStyle, marginBottom: 22 }}>
            <MarkdownBlock text={t("step3.body")} keyPrefix="s3" />
          </p>
          <a href={APP_LOGIN} style={navyBtn} target="_blank" rel="noopener noreferrer">
            {t("step3.cta")}
          </a>
        </section>

        {/* CTA — geen Velopass */}
        <section style={{ ...sectionStyle, maxWidth: 1000 }}>
          <div
            style={{
              background: NAVY,
              borderRadius: 20,
              padding: "48px 40px",
              textAlign: "center",
              color: "#fff",
            }}
          >
            <h2
              style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 700,
                fontSize: "clamp(26px, 3vw, 34px)",
                color: "#fff",
                marginBottom: 14,
                letterSpacing: "-0.5px",
              }}
            >
              {t("cta.title")}
            </h2>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 16,
                color: "rgba(255,255,255,0.6)",
                lineHeight: 1.6,
                maxWidth: 520,
                margin: "0 auto 28px",
              }}
            >
              {t("cta.body")}
            </p>
            <Link
              to="/$lang"
              params={{ lang }}
              hash="nieuwe-sticker"
              hashScrollIntoView={{ behavior: "smooth", block: "start" }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: GREEN,
                color: NAVY,
                padding: "14px 26px",
                borderRadius: 10,
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: 15,
                textDecoration: "none",
              }}
            >
              {t("cta.button")}
            </Link>
          </div>
        </section>
      </main>

      <Footer />

      <style>{`
        .back-btn-wrap { padding: 72px 6vw 0; max-width: 1100px; margin: 0 auto; }
        .back-btn { display: inline-flex; align-items: center; gap: 6px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; color: var(--text-muted); background: none; border: none; cursor: pointer; padding: 0; text-decoration: underline; text-underline-offset: 3px; }
        .vp-compare-grid { display: grid; gap: 0; }
        .vp-compare-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 14px 0; border-bottom: 1px solid rgba(13,31,60,0.08); align-items: center; }
        .vp-compare-row:last-child { border-bottom: none; }
        @media (max-width: 640px) {
          .back-btn-wrap { padding-top: 64px; }
          .back-btn { font-size: 12px; }
          .vp-compare-row { grid-template-columns: 1fr; gap: 4px; padding: 12px 0; }
        }
      `}</style>
    </>
  );
}

type TFn = ReturnType<typeof useTranslation>["t"];
type GetList = <T>(key: string) => T[];

/* ============== Shared step rendering ============== */
function StepsList({ steps, keyPrefix }: { steps: StepItem[]; keyPrefix: string }) {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      {steps.map((step, i) => (
        <div key={i} style={{ ...cardStyle, padding: "22px 24px", display: "flex", gap: 18 }}>
          <div
            style={{
              flexShrink: 0,
              width: 36,
              height: 36,
              borderRadius: 10,
              background: NAVY,
              color: "#F5F3EE",
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: 16,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {i + 1}
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: NAVY, marginBottom: 8 }}>
              {step.title}
            </h4>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14.5, color: MUTED, lineHeight: 1.6 }}>
              <MarkdownBlock text={step.body} keyPrefix={`${keyPrefix}-${i}`} />
            </div>
            {step.tip && (
              <div
                style={{
                  marginTop: 14,
                  background: "rgba(46,204,138,0.08)",
                  border: "1px solid rgba(46,204,138,0.25)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13.5,
                  color: NAVY,
                  lineHeight: 1.5,
                }}
              >
                💡 {step.tip}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ChecklistCard({
  title,
  items,
  keyPrefix,
}: {
  title: string;
  items: ChecklistItem[];
  keyPrefix: string;
}) {
  return (
    <div style={cardStyle}>
      <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, color: NAVY, marginBottom: 16 }}>
        {title}
      </h3>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
        {items.map((item, i) => (
          <li key={`${keyPrefix}-${i}`} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <CheckSquare size={18} strokeWidth={2} color={NAVY} style={{ flexShrink: 0, marginTop: 2, opacity: 0.7 }} />
            <div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: NAVY, lineHeight: 1.5 }}>
                {item.text}
              </div>
              {item.velopass && (
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 500,
                    fontSize: 13,
                    color: GREEN,
                    marginTop: 2,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  → {item.velopass}
                </div>
              )}
              {item.note && (
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    color: MUTED,
                    marginTop: 2,
                    fontStyle: "italic",
                  }}
                >
                  → {item.note}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GreenIntroCard({ text }: { text: string }) {
  return (
    <div
      style={{
        background: "rgba(46,204,138,0.08)",
        border: "1px solid rgba(46,204,138,0.25)",
        borderRadius: 14,
        padding: "18px 22px",
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
      }}
    >
      <CheckCircle2 size={22} strokeWidth={2} color={GREEN} style={{ flexShrink: 0, marginTop: 2 }} />
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: NAVY, lineHeight: 1.6, margin: 0 }}>
        {text}
      </p>
    </div>
  );
}

function AmberTipCard({ icon, title, body, keyPrefix }: { icon: ReactNode; title?: string; body: string; keyPrefix: string }) {
  return (
    <div
      style={{
        background: "rgba(245, 158, 11, 0.08)",
        border: "1px solid rgba(245, 158, 11, 0.3)",
        borderRadius: 14,
        padding: "18px 22px",
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
      }}
    >
      {icon}
      <div>
        {title && (
          <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: NAVY, marginBottom: 6 }}>
            {title}
          </h4>
        )}
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: MUTED, lineHeight: 1.6, margin: 0 }}>
          <MarkdownBlock text={body} keyPrefix={keyPrefix} />
        </p>
      </div>
    </div>
  );
}

function AfterCard({ title, body }: { title: string; body: string }) {
  return (
    <div
      style={{
        background: "rgba(13,31,60,0.04)",
        border: "1px solid rgba(13,31,60,0.08)",
        borderRadius: 14,
        padding: "18px 22px",
      }}
    >
      <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: NAVY, marginBottom: 8 }}>
        {title}
      </h4>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: MUTED, lineHeight: 1.65, margin: 0 }}>
        {body}
      </p>
    </div>
  );
}

/* ============== BE ============== */
function CountryBE({ getList, t }: { getList: GetList; t: TFn }) {
  const checklist = getList<ChecklistItem>("step2.BE.checklist");
  const steps = getList<StepItem>("step2.BE.steps");
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <GreenIntroCard text={t("step2.BE.intro")} />
      <ChecklistCard title={t("step2.checklist_title")} items={checklist} keyPrefix="be-cl" />
      <StepsList steps={steps} keyPrefix="be-st" />
      <AfterCard title={t("step2.after_title")} body={t("step2.BE.after_body")} />
      <AmberTipCard
        icon={<Lightbulb size={22} strokeWidth={2} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />}
        title={t("step2.BE.found_title")}
        body={t("step2.BE.found_body")}
        keyPrefix="be-found"
      />
    </div>
  );
}

/* ============== NL ============== */
function CountryNL({ getList, t }: { getList: GetList; t: TFn }) {
  const checklist = getList<ChecklistItem>("step2.NL.checklist");
  const steps = getList<StepItem>("step2.NL.steps");
  const conditions = getList<string>("step2.NL.conditions");
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <GreenIntroCard text={t("step2.NL.intro")} />
      <AmberTipCard
        icon={<Lightbulb size={22} strokeWidth={2} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />}
        title={t("step2.NL.check_first_title")}
        body={t("step2.NL.check_first_body")}
        keyPrefix="nl-check"
      />
      <ChecklistCard title={t("step2.checklist_title")} items={checklist} keyPrefix="nl-cl" />
      <div
        style={{
          background: "rgba(13,31,60,0.04)",
          border: "1px solid rgba(13,31,60,0.08)",
          borderRadius: 14,
          padding: "18px 22px",
        }}
      >
        <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: NAVY, marginBottom: 8 }}>
          {t("step2.NL.conditions_title")}
        </h4>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: MUTED, lineHeight: 1.65, margin: "0 0 8px" }}>
          {t("step2.NL.conditions_intro")}
        </p>
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 10px", display: "grid", gap: 4 }}>
          {conditions.map((c, i) => (
            <li key={i} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: MUTED, lineHeight: 1.55 }}>
              • {c}
            </li>
          ))}
        </ul>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, color: MUTED, lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>
          {t("step2.NL.conditions_note")}
        </p>
      </div>
      <StepsList steps={steps} keyPrefix="nl-st" />
      <AfterCard title={t("step2.after_title")} body={t("step2.NL.after_body")} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
        <AmberTipCard
          icon={<Lightbulb size={22} strokeWidth={2} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />}
          title={t("step2.NL.tip1_title")}
          body={t("step2.NL.tip1_body")}
          keyPrefix="nl-tip1"
        />
        <AmberTipCard
          icon={<Search size={22} strokeWidth={2} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />}
          title={t("step2.NL.tip2_title")}
          body={t("step2.NL.tip2_body")}
          keyPrefix="nl-tip2"
        />
      </div>
    </div>
  );
}

/* ============== FR ============== */
function CountryFR({ getList, t }: { getList: GetList; t: TFn }) {
  const checklist = getList<ChecklistItem>("step2.FR.checklist");
  const steps = getList<StepItem>("step2.FR.steps");
  const flowSteps = getList<FlowStep>("step2.FR.flow_steps");
  const flowIcons = [
    <Smartphone size={22} color={NAVY} strokeWidth={2} />,
    <Database size={22} color={NAVY} strokeWidth={2} />,
    <Shield size={22} color={NAVY} strokeWidth={2} />,
  ];
  return (
    <div style={{ display: "grid", gap: 24 }}>
      {/* FNUCI prominent card */}
      <div
        style={{
          background: "rgba(46,204,138,0.10)",
          border: "1px solid rgba(46,204,138,0.35)",
          borderRadius: 16,
          padding: "28px 28px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <VelopassMark size={36} />
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: MUTED }}>×</span>
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
              fontSize: 12,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: NAVY,
              background: "rgba(13,31,60,0.08)",
              padding: "6px 10px",
              borderRadius: 6,
            }}
          >
            {t("step2.FR.fnuci_badge")}
          </span>
        </div>
        <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, color: NAVY, lineHeight: 1.3, marginBottom: 14 }}>
          {t("step2.FR.fnuci_title")}
        </h3>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: NAVY, lineHeight: 1.65, margin: 0 }}>
          <MarkdownBlock text={t("step2.FR.fnuci_body_1")} keyPrefix="fr-fnuci1" />
        </p>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: NAVY, lineHeight: 1.65, margin: "12px 0 0" }}>
          <MarkdownBlock text={t("step2.FR.fnuci_body_2")} keyPrefix="fr-fnuci2" />
        </p>
      </div>

      {/* 3-stappen flow */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        {flowSteps.map((s, i) => (
          <div key={i} style={{ ...cardStyle, padding: "22px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(13,31,60,0.06)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                {flowIcons[i] ?? flowIcons[0]}
              </div>
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: GREEN }}>
                {t("step2.FR.flow_step_label", { n: i + 1 })}
              </span>
            </div>
            <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: NAVY, marginBottom: 6 }}>{s.title}</h4>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: MUTED, lineHeight: 1.6, margin: 0 }}>{s.body}</p>
          </div>
        ))}
      </div>

      {/* Code note amber */}
      <div
        style={{
          background: "rgba(245, 158, 11, 0.08)",
          border: "1px solid rgba(245, 158, 11, 0.3)",
          borderRadius: 14,
          padding: "18px 22px",
          display: "flex",
          gap: 14,
          alignItems: "flex-start",
        }}
      >
        <Lightbulb size={22} strokeWidth={2} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: NAVY, lineHeight: 1.6, margin: 0 }}>
          <MarkdownBlock text={t("step2.FR.code_note")} keyPrefix="fr-code" />
        </p>
      </div>

      <GreenIntroCard text={t("step2.FR.ma_intro")} />

      <AmberTipCard
        icon={<AlertTriangle size={22} strokeWidth={2} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />}
        title={t("step2.FR.home_already_title")}
        body={t("step2.FR.home_already_body")}
        keyPrefix="fr-home"
      />

      <ChecklistCard title={t("step2.checklist_title")} items={checklist} keyPrefix="fr-cl" />

      {/* Twee manieren cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
        <div style={{ ...cardStyle, padding: "22px 22px" }}>
          <div style={{ marginBottom: 10 }}>
            <StatusBadge label={t("step2.FR.method1_badge")} color={GREEN} />
          </div>
          <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: NAVY, marginBottom: 8 }}>
            {t("step2.FR.method1_title")}
          </h4>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: MUTED, lineHeight: 1.6, margin: 0 }}>
            <MarkdownBlock text={t("step2.FR.method1_body")} keyPrefix="fr-m1" />
          </p>
        </div>
        <div style={{ ...cardStyle, padding: "22px 22px" }}>
          <div style={{ marginBottom: 10 }}>
            <StatusBadge label={t("step2.FR.method2_badge")} color="#F59E0B" />
          </div>
          <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: NAVY, marginBottom: 8 }}>
            {t("step2.FR.method2_title")}
          </h4>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: MUTED, lineHeight: 1.6, margin: 0 }}>
            <MarkdownBlock text={t("step2.FR.method2_body")} keyPrefix="fr-m2" />
          </p>
        </div>
      </div>

      <StepsList steps={steps} keyPrefix="fr-st" />

      <AmberTipCard
        icon={<Lightbulb size={22} strokeWidth={2} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />}
        title={t("step2.FR.chat_title")}
        body={t("step2.FR.chat_body")}
        keyPrefix="fr-chat"
      />
    </div>
  );
}
