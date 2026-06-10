import { useState } from "react";
import { useCurrentLang } from "@/i18n/useCurrentLang";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation, Trans } from "react-i18next";
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
import { buildLocalizedHead } from "@/i18n/seo";
import enBundle from "@/i18n/locales/en/stolen.json";
import nlBundle from "@/i18n/locales/nl/stolen.json";
import frBundle from "@/i18n/locales/fr/stolen.json";
import deBundle from "@/i18n/locales/de/stolen.json";

type MetaBundle = { meta: { title: string; description: string } };
const metaMap: Record<string, MetaBundle> = { en: enBundle, nl: nlBundle, fr: frBundle, de: deBundle };

export const Route = createFileRoute("/$lang/stolen")({
  head: ({ params }) => {
    const bundle = metaMap[params.lang] ?? enBundle;
    return buildLocalizedHead({
      lang: params.lang,
      path: "stolen",
      title: bundle.meta.title,
      description: bundle.meta.description,
    });
  },
  component: GestolenPage,
});

const APP_LOGIN = "https://login.velopass.com/login?state=hKFo2SB5ODJtdjhZMGxXRGlPN1NVWFdQM3pqV3JUS1pFQTlkSaFupWxvZ2luo3RpZNkgM3R1ZXU4M2FxM3RqUk1FYVR3UUZCSTRhZV92dTlhRzmjY2lk2SBWak0xVFBUQUFFcG11aWhGNndYeEdGdVFybE5hVTY5MQ&client=VjM1TPTAAEpmuihF6wXxGFuQrlNaU691&protocol=oauth2&scope=openid%20profile%20email&audience=https%3A%2F%2Fcyclistapi.prod.velopass.com&redirect_uri=https%3A%2F%2Fapp.velopass.com%2Fdashboard&response_type=code&response_mode=query&nonce=a3hmZVl5aENNeU95d1U0SUlBaEM3NV9MbkZXNFdXRkg2c3RpOXJlMW5BUQ%3D%3D&code_challenge=5vSSWCjxdP-6B0z5HV38kaBGFWP4KSmv4gORKjvtzi0&code_challenge_method=S256&auth0Client=eyJuYW1lIjoiYXV0aDAtcmVhY3QiLCJ2ZXJzaW9uIjoiMi45LjAifQ%3D%3D#page=cyclist/login&method=standard&lng=nl-nl";

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
  const navLang = typeof navigator !== "undefined" ? navigator.language || "" : "";
  const region = navLang.split("-")[1]?.toUpperCase();
  if (region === "BE" || region === "NL" || region === "FR") return region;
  if (navLang.startsWith("nl")) return "NL";
  if (navLang.startsWith("fr")) return "FR";
  return "BE";
}

function GestolenPage() {
  const lang = useCurrentLang();
  const { t } = useTranslation(["stolen", "common"]);
  const [navOpen, setNavOpen] = useState(false);
  const [country, setCountry] = useState<"BE" | "NL" | "FR">(getBrowserCountry);

  const beChecklist = t("stolen:be.checklist", { returnObjects: true }) as Array<{ text: string; velopass?: string }>;
  const nlChecklist = t("stolen:nl.checklist", { returnObjects: true }) as Array<{ text: string; velopass?: string }>;
  const frChecklist = t("stolen:fr.checklist", { returnObjects: true }) as Array<{ text: string; velopass?: string; note?: string }>;
  const argumentItems = t("stolen:argument.items", { returnObjects: true }) as Array<{ left: string; right: string }>;
  const frHow = t("stolen:fr.how", { returnObjects: true }) as Array<{ title: string; body: string }>;
  const frHowIcons = [
    <Smartphone size={22} color={NAVY} strokeWidth={2} />,
    <Database size={22} color={NAVY} strokeWidth={2} />,
    <Shield size={22} color={NAVY} strokeWidth={2} />,
  ];

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
          <li><Link to="/$lang" params={{ lang }} hash="order-sticker" hashScrollIntoView={{ behavior: "smooth", block: "start" }}>{t("common:nav.order_sticker")}</Link></li>
          <li><Link to="/$lang" params={{ lang }} hash="community" hashScrollIntoView={{ behavior: "smooth", block: "start" }}>{t("common:nav.community")}</Link></li>
          <li><Link to="/$lang/shop" params={{ lang }} style={{ color: "var(--green-mid)", display: "inline-flex", alignItems: "center", gap: 6 }}><ArrowUpRight size={15} strokeWidth={2.2} />{t("common:nav.for_professionals")}</Link></li>
        </ul>
        <div className="nav-actions">
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
          {t("stolen:back")}
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
            {t("stolen:hero.eyebrow")}
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
            {t("stolen:hero.title")}
          </h1>
          <p style={{ ...bodyStyle, maxWidth: 560, margin: "0 auto" }}>
            {t("stolen:hero.body")}
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
              {t("stolen:argument.title")}
            </h2>
            <div className="vp-compare-grid">
              {argumentItems.map((item) => (
                <div key={item.left} className="vp-compare-row">
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: 15, color: MUTED }}>
                    {item.left}
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
                    {item.right}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 28, textAlign: "center" }}>
              <a href={APP_LOGIN} style={navyBtn} target="_blank" rel="noopener noreferrer">
                {t("stolen:argument.cta")}
              </a>
            </div>
          </div>
        </section>

        {/* STEP 1 */}
        <section style={{ ...sectionStyle, marginBottom: 64 }}>
          <h2 style={h2Style}>{t("stolen:step1.title")}</h2>
          <p style={{ ...bodyStyle, marginBottom: 20 }}>
            {t("stolen:step1.body.prefix")} <strong style={{ color: NAVY }}>{t("stolen:step1.body.myBike")}</strong>
            {t("stolen:step1.body.mid")} <strong style={{ color: NAVY }}>{t("stolen:step1.body.reportMissing")}</strong>
            {t("stolen:step1.body.post")}
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
              {t("stolen:step1.reportedText")}
            </p>
          </div>

          <a href={APP_LOGIN} style={navyBtn} target="_blank" rel="noopener noreferrer">
            {t("stolen:step1.cta")}
          </a>
        </section>

        {/* STEP 2 */}
        <section style={{ ...sectionStyle, marginBottom: 64 }}>
          <h2 style={h2Style}>{t("stolen:step2.title")}</h2>
          <p style={{ ...bodyStyle, marginBottom: 20 }}>{t("stolen:step2.intro")}</p>

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
            {([
              { code: "BE" as const, labelKey: "stolen:step2.tabs.be", enabled: true },
              { code: "NL" as const, labelKey: "stolen:step2.tabs.nl", enabled: true },
              { code: "FR" as const, labelKey: "stolen:step2.tabs.fr", enabled: true },
            ]).map((tab) => {
              const active = country === tab.code;
              return (
                <button
                  key={tab.code}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  disabled={!tab.enabled}
                  onClick={() => tab.enabled && setCountry(tab.code)}
                  title={!tab.enabled ? t("stolen:step2.comingSoon") : undefined}
                  style={{
                    border: "none",
                    background: active ? "#FFFFFF" : "transparent",
                    color: tab.enabled ? (active ? NAVY : MUTED) : "rgba(13,31,60,0.3)",
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: active ? 600 : 500,
                    fontSize: 14,
                    padding: "8px 16px",
                    borderRadius: 8,
                    cursor: tab.enabled ? "pointer" : "not-allowed",
                    boxShadow: active ? "0 2px 8px rgba(13,31,60,0.08)" : "none",
                  }}
                >
                  {t(tab.labelKey)}
                  {!tab.enabled && (
                    <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.7 }}>
                      {t("stolen:step2.comingSoon")}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* BE panel */}
          {country === "BE" && (
            <div style={{ display: "grid", gap: 24 }}>
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
                  {t("stolen:be.intro")}
                </p>
              </div>

              <div style={cardStyle}>
                <h3
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 700,
                    fontSize: 18,
                    color: NAVY,
                    marginBottom: 16,
                  }}
                >
                  {t("stolen:checklistTitle")}
                </h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
                  {beChecklist.map((item, i) => (
                    <li key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
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
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ display: "grid", gap: 14 }}>
                {/* s1 */}
                <div style={{ ...cardStyle, padding: "22px 24px", display: "flex", gap: 18 }}>
                  <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 10, background: NAVY, color: "#F5F3EE", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>1</div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: NAVY, marginBottom: 8 }}>{t("stolen:be.steps.s1.title")}</h4>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14.5, color: MUTED, lineHeight: 1.6 }}>
                      <a href="https://www.police-on-web.be" target="_blank" rel="noopener noreferrer" style={{ color: GREEN, textDecoration: "underline", textUnderlineOffset: 3, display: "inline-flex", alignItems: "center", gap: 6 }}>
                        www.police-on-web.be <ExternalLink size={14} strokeWidth={2} />
                      </a>
                    </div>
                  </div>
                </div>
                {/* s2 */}
                <div style={{ ...cardStyle, padding: "22px 24px", display: "flex", gap: 18 }}>
                  <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 10, background: NAVY, color: "#F5F3EE", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>2</div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: NAVY, marginBottom: 8 }}>{t("stolen:be.steps.s2.title")}</h4>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14.5, color: MUTED, lineHeight: 1.6 }}>
                      {t("stolen:be.steps.s2.pre")} <strong style={{ color: NAVY }}>{t("stolen:be.steps.s2.newReport")}</strong> {t("stolen:be.steps.s2.mid")} <strong style={{ color: NAVY }}>{t("stolen:be.steps.s2.biketheft")}</strong>{t("stolen:be.steps.s2.post")}
                    </div>
                  </div>
                </div>
                {/* s3 */}
                <div style={{ ...cardStyle, padding: "22px 24px", display: "flex", gap: 18 }}>
                  <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 10, background: NAVY, color: "#F5F3EE", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>3</div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: NAVY, marginBottom: 8 }}>{t("stolen:be.steps.s3.title")}</h4>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14.5, color: MUTED, lineHeight: 1.6 }}>
                      {t("stolen:be.steps.s3.body")}
                    </div>
                  </div>
                </div>
                {/* s4 */}
                <div style={{ ...cardStyle, padding: "22px 24px", display: "flex", gap: 18 }}>
                  <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 10, background: NAVY, color: "#F5F3EE", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>4</div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: NAVY, marginBottom: 8 }}>{t("stolen:be.steps.s4.title")}</h4>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14.5, color: MUTED, lineHeight: 1.6 }}>
                      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
                        <li>{t("stolen:be.steps.s4.li1")}</li>
                        <li>{t("stolen:be.steps.s4.li2")}</li>
                        <li>{t("stolen:be.steps.s4.li3")}</li>
                      </ul>
                    </div>
                    <div style={{ marginTop: 14, background: "rgba(46,204,138,0.08)", border: "1px solid rgba(46,204,138,0.25)", borderRadius: 10, padding: "10px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, color: NAVY, lineHeight: 1.5 }}>
                      💡 {t("stolen:be.steps.s4.tip")}
                    </div>
                  </div>
                </div>
                {/* s5 */}
                <div style={{ ...cardStyle, padding: "22px 24px", display: "flex", gap: 18 }}>
                  <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 10, background: NAVY, color: "#F5F3EE", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>5</div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: NAVY, marginBottom: 8 }}>{t("stolen:be.steps.s5.title")}</h4>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14.5, color: MUTED, lineHeight: 1.6 }}>
                      {t("stolen:be.steps.s5.pre")} <strong style={{ color: NAVY }}>{t("stolen:be.steps.s5.submit")}</strong>{t("stolen:be.steps.s5.post")}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ background: "rgba(13,31,60,0.04)", border: "1px solid rgba(13,31,60,0.08)", borderRadius: 14, padding: "18px 22px" }}>
                <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: NAVY, marginBottom: 8 }}>
                  {t("stolen:be.after.title")}
                </h4>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: MUTED, lineHeight: 1.65, margin: 0 }}>
                  {t("stolen:be.after.body")}
                </p>
              </div>

              <div style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: 14, padding: "18px 22px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                <Lightbulb size={22} strokeWidth={2} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: NAVY, marginBottom: 6 }}>
                    {t("stolen:be.tip.title")}
                  </h4>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: MUTED, lineHeight: 1.6, margin: 0 }}>
                    {t("stolen:be.tip.pre")}{" "}
                    <a href="https://www.gevondenfietsen.be" target="_blank" rel="noopener noreferrer" style={{ color: NAVY, fontWeight: 500, textDecoration: "underline", textUnderlineOffset: 3 }}>
                      www.gevondenfietsen.be
                    </a>
                    {" "}{t("stolen:be.tip.post")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* NL panel */}
          {country === "NL" && (
            <div style={{ display: "grid", gap: 24 }}>
              <div style={{ background: "rgba(46,204,138,0.08)", border: "1px solid rgba(46,204,138,0.25)", borderRadius: 14, padding: "18px 22px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                <CheckCircle2 size={22} strokeWidth={2} color={GREEN} style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: NAVY, lineHeight: 1.6, margin: 0 }}>
                  {t("stolen:nl.intro")}
                </p>
              </div>

              <div style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: 14, padding: "18px 22px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                <Lightbulb size={22} strokeWidth={2} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: NAVY, marginBottom: 6 }}>
                    {t("stolen:nl.checkFirst.title")}
                  </h4>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: MUTED, lineHeight: 1.6, margin: 0 }}>
                    {t("stolen:nl.checkFirst.body")}
                  </p>
                </div>
              </div>

              <div style={cardStyle}>
                <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, color: NAVY, marginBottom: 16 }}>
                  {t("stolen:checklistTitle")}
                </h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
                  {nlChecklist.map((item, i) => (
                    <li key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <CheckSquare size={18} strokeWidth={2} color={NAVY} style={{ flexShrink: 0, marginTop: 2, opacity: 0.7 }} />
                      <div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: NAVY, lineHeight: 1.5 }}>
                          {item.text}
                        </div>
                        {item.velopass && (
                          <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: 13, color: GREEN, marginTop: 2, display: "inline-flex", alignItems: "center", gap: 6 }}>
                            → {item.velopass}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ background: "rgba(13,31,60,0.04)", border: "1px solid rgba(13,31,60,0.08)", borderRadius: 14, padding: "18px 22px" }}>
                <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: NAVY, marginBottom: 8 }}>
                  {t("stolen:nl.conditions.title")}
                </h4>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: MUTED, lineHeight: 1.65, margin: "0 0 8px" }}>
                  {t("stolen:nl.conditions.intro")}
                </p>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 10px", display: "grid", gap: 4 }}>
                  <li style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: MUTED, lineHeight: 1.55 }}>{t("stolen:nl.conditions.c1")}</li>
                  <li style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: MUTED, lineHeight: 1.55 }}>{t("stolen:nl.conditions.c2")}</li>
                </ul>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, color: MUTED, lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>
                  {t("stolen:nl.conditions.note")}
                </p>
              </div>

              <div style={{ display: "grid", gap: 14 }}>
                {/* s1 */}
                <div style={{ ...cardStyle, padding: "22px 24px", display: "flex", gap: 18 }}>
                  <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 10, background: NAVY, color: "#F5F3EE", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>1</div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: NAVY, marginBottom: 8 }}>{t("stolen:nl.steps.s1.title")}</h4>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14.5, color: MUTED, lineHeight: 1.6 }}>
                      <a href="https://www.politie.nl/aangifte-of-melding-doen/aangifte-van-diefstal-fiets.html" target="_blank" rel="noopener noreferrer" style={{ color: GREEN, textDecoration: "underline", textUnderlineOffset: 3, display: "inline-flex", alignItems: "center", gap: 6 }}>
                        www.politie.nl/aangifte <ExternalLink size={14} strokeWidth={2} />
                      </a>
                    </div>
                  </div>
                </div>
                {/* s2 */}
                <div style={{ ...cardStyle, padding: "22px 24px", display: "flex", gap: 18 }}>
                  <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 10, background: NAVY, color: "#F5F3EE", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>2</div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: NAVY, marginBottom: 8 }}>{t("stolen:nl.steps.s2.title")}</h4>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14.5, color: MUTED, lineHeight: 1.6 }}>
                      {t("stolen:nl.steps.s2.pre")} <strong style={{ color: NAVY }}>{t("stolen:nl.steps.s2.option")}</strong>{t("stolen:nl.steps.s2.post")}
                    </div>
                  </div>
                </div>
                {/* s3 */}
                <div style={{ ...cardStyle, padding: "22px 24px", display: "flex", gap: 18 }}>
                  <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 10, background: NAVY, color: "#F5F3EE", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>3</div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: NAVY, marginBottom: 8 }}>{t("stolen:nl.steps.s3.title")}</h4>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14.5, color: MUTED, lineHeight: 1.6 }}>
                      {t("stolen:nl.steps.s3.body")}
                    </div>
                  </div>
                </div>
                {/* s4 */}
                <div style={{ ...cardStyle, padding: "22px 24px", display: "flex", gap: 18 }}>
                  <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 10, background: NAVY, color: "#F5F3EE", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>4</div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: NAVY, marginBottom: 8 }}>{t("stolen:nl.steps.s4.title")}</h4>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14.5, color: MUTED, lineHeight: 1.6 }}>
                      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
                        <li>{t("stolen:nl.steps.s4.li1")}</li>
                        <li>{t("stolen:nl.steps.s4.li2")}</li>
                        <li>{t("stolen:nl.steps.s4.li3")}</li>
                      </ul>
                    </div>
                    <div style={{ marginTop: 14, background: "rgba(46,204,138,0.08)", border: "1px solid rgba(46,204,138,0.25)", borderRadius: 10, padding: "10px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, color: NAVY, lineHeight: 1.5 }}>
                      💡 {t("stolen:nl.steps.s4.tip")}
                    </div>
                  </div>
                </div>
                {/* s5 */}
                <div style={{ ...cardStyle, padding: "22px 24px", display: "flex", gap: 18 }}>
                  <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 10, background: NAVY, color: "#F5F3EE", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>5</div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: NAVY, marginBottom: 8 }}>{t("stolen:nl.steps.s5.title")}</h4>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14.5, color: MUTED, lineHeight: 1.6 }}>
                      {t("stolen:nl.steps.s5.body")}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ background: "rgba(13,31,60,0.04)", border: "1px solid rgba(13,31,60,0.08)", borderRadius: 14, padding: "18px 22px" }}>
                <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: NAVY, marginBottom: 8 }}>
                  {t("stolen:nl.after.title")}
                </h4>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: MUTED, lineHeight: 1.65, margin: 0 }}>
                  {t("stolen:nl.after.body")}
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
                <div style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: 14, padding: "18px 22px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <Lightbulb size={22} strokeWidth={2} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: NAVY, marginBottom: 6 }}>
                      {t("stolen:nl.tipGevonden.title")}
                    </h4>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: MUTED, lineHeight: 1.6, margin: 0 }}>
                      {t("stolen:nl.tipGevonden.pre")}{" "}
                      <a href="https://www.gevondenfietsen.be" target="_blank" rel="noopener noreferrer" style={{ color: NAVY, fontWeight: 500, textDecoration: "underline", textUnderlineOffset: 3 }}>
                        www.gevondenfietsen.be
                      </a>
                      {t("stolen:nl.tipGevonden.post")}
                    </p>
                  </div>
                </div>
                <div style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: 14, padding: "18px 22px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <Search size={22} strokeWidth={2} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: NAVY, marginBottom: 6 }}>
                      {t("stolen:nl.tipMarktplaats.title")}
                    </h4>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: MUTED, lineHeight: 1.6, margin: 0 }}>
                      {t("stolen:nl.tipMarktplaats.body")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FR panel */}
          {country === "FR" && (
            <div style={{ display: "grid", gap: 24 }}>
              <div style={{ background: "rgba(46,204,138,0.10)", border: "1px solid rgba(46,204,138,0.35)", borderRadius: 16, padding: "28px 28px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                  <VelopassMark size={36} />
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: MUTED }}>×</span>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: NAVY, background: "rgba(13,31,60,0.08)", padding: "6px 10px", borderRadius: 6 }}>
                    FNUCI · République Française
                  </span>
                </div>
                <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, color: NAVY, lineHeight: 1.3, marginBottom: 14 }}>
                  {t("stolen:fr.fnuci.title")}
                </h3>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: NAVY, lineHeight: 1.65, margin: 0 }}>
                  <Trans i18nKey="fr.fnuci.body1" ns="stolen" components={{ strong: <strong />, em: <em /> }} />
                </p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: NAVY, lineHeight: 1.65, margin: "12px 0 0" }}>
                  {t("stolen:fr.fnuci.body2")}
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
                {frHow.map((s, i) => (
                  <div key={i} style={{ ...cardStyle, padding: "22px 22px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(13,31,60,0.06)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                        {frHowIcons[i]}
                      </div>
                      <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: GREEN }}>
                        {t("stolen:fr.stepLabel", { n: i + 1 })}
                      </span>
                    </div>
                    <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: NAVY, marginBottom: 6 }}>{s.title}</h4>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: MUTED, lineHeight: 1.6, margin: 0 }}>{s.body}</p>
                  </div>
                ))}
              </div>

              <div style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: 14, padding: "18px 22px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                <Lightbulb size={22} strokeWidth={2} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: NAVY, lineHeight: 1.6, margin: 0 }}>
                  <Trans i18nKey="fr.fnuciNote" ns="stolen" components={{ bold: <strong style={{ color: NAVY }} />, em: <em /> }} />
                </p>
              </div>

              <div style={{ background: "rgba(46,204,138,0.08)", border: "1px solid rgba(46,204,138,0.25)", borderRadius: 14, padding: "18px 22px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                <CheckCircle2 size={22} strokeWidth={2} color={GREEN} style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: NAVY, lineHeight: 1.6, margin: 0 }}>
                  <Trans i18nKey="fr.intro" ns="stolen" components={{ em: <em /> }} />
                </p>
              </div>

              <div style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: 14, padding: "18px 22px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                <AlertTriangle size={22} strokeWidth={2} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: NAVY, marginBottom: 6 }}>
                    {t("stolen:fr.alreadyHome.title")}
                  </h4>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: MUTED, lineHeight: 1.6, margin: 0 }}>
                    {t("stolen:fr.alreadyHome.body")}
                  </p>
                </div>
              </div>

              <div style={cardStyle}>
                <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, color: NAVY, marginBottom: 16 }}>
                  {t("stolen:checklistTitle")}
                </h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
                  {frChecklist.map((item, i) => (
                    <li key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <CheckSquare size={18} strokeWidth={2} color={NAVY} style={{ flexShrink: 0, marginTop: 2, opacity: 0.7 }} />
                      <div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: NAVY, lineHeight: 1.5 }}>
                          {item.text}
                        </div>
                        {item.velopass && (
                          <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: 13, color: GREEN, marginTop: 2 }}>
                            → {item.velopass}
                          </div>
                        )}
                        {item.note && (
                          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: MUTED, marginTop: 2, fontStyle: "italic" }}>
                            → {item.note}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
                <div style={{ ...cardStyle, padding: "22px 22px" }}>
                  <div style={{ marginBottom: 10 }}>
                    <StatusBadge label={t("stolen:fr.digital.badge")} color={GREEN} />
                  </div>
                  <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: NAVY, marginBottom: 8 }}>
                    {t("stolen:fr.digital.title")}
                  </h4>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: MUTED, lineHeight: 1.6, margin: 0 }}>
                    <Trans i18nKey="fr.digital.body" ns="stolen" components={{ em: <em /> }} />
                  </p>
                </div>
                <div style={{ ...cardStyle, padding: "22px 22px" }}>
                  <div style={{ marginBottom: 10 }}>
                    <StatusBadge label={t("stolen:fr.tourist.badge")} color="#F59E0B" />
                  </div>
                  <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: NAVY, marginBottom: 8 }}>
                    {t("stolen:fr.tourist.title")}
                  </h4>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: MUTED, lineHeight: 1.6, margin: 0 }}>
                    <Trans i18nKey="fr.tourist.body" ns="stolen" components={{ em: <em /> }} />
                  </p>
                </div>
              </div>

              <div style={{ display: "grid", gap: 14 }}>
                {/* s1 */}
                <div style={{ ...cardStyle, padding: "22px 24px", display: "flex", gap: 18 }}>
                  <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 10, background: NAVY, color: "#F5F3EE", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>1</div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: NAVY, marginBottom: 8 }}>{t("stolen:fr.steps.s1.title")}</h4>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14.5, color: MUTED, lineHeight: 1.6 }}>
                      <a href="https://plainte-en-ligne.masecurite.interieur.gouv.fr/" target="_blank" rel="noopener noreferrer" style={{ color: GREEN, textDecoration: "underline", textUnderlineOffset: 3, display: "inline-flex", alignItems: "center", gap: 6 }}>
                        {t("stolen:fr.steps.s1.linkText")} <ExternalLink size={14} strokeWidth={2} />
                      </a>
                      <div style={{ marginTop: 6 }}>{t("stolen:fr.steps.s1.note")}</div>
                    </div>
                  </div>
                </div>
                {/* s2 */}
                <div style={{ ...cardStyle, padding: "22px 24px", display: "flex", gap: 18 }}>
                  <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 10, background: NAVY, color: "#F5F3EE", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>2</div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: NAVY, marginBottom: 8 }}>{t("stolen:fr.steps.s2.title")}</h4>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14.5, color: MUTED, lineHeight: 1.6 }}>
                      {t("stolen:fr.steps.s2.pre")} <strong style={{ color: NAVY }}>{t("stolen:fr.steps.s2.vol")}</strong> {t("stolen:fr.steps.s2.post")}
                    </div>
                  </div>
                </div>
                {/* s3 */}
                <div style={{ ...cardStyle, padding: "22px 24px", display: "flex", gap: 18 }}>
                  <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 10, background: NAVY, color: "#F5F3EE", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>3</div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: NAVY, marginBottom: 8 }}>{t("stolen:fr.steps.s3.title")}</h4>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14.5, color: MUTED, lineHeight: 1.6 }}>
                      {t("stolen:fr.steps.s3.body")}
                    </div>
                  </div>
                </div>
                {/* s4 */}
                <div style={{ ...cardStyle, padding: "22px 24px", display: "flex", gap: 18 }}>
                  <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 10, background: NAVY, color: "#F5F3EE", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>4</div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: NAVY, marginBottom: 8 }}>{t("stolen:fr.steps.s4.title")}</h4>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14.5, color: MUTED, lineHeight: 1.6 }}>
                      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
                        <li>{t("stolen:fr.steps.s4.li1")}</li>
                        <li>{t("stolen:fr.steps.s4.li2")}</li>
                        <li>{t("stolen:fr.steps.s4.li3")}</li>
                      </ul>
                    </div>
                    <div style={{ marginTop: 14, background: "rgba(46,204,138,0.08)", border: "1px solid rgba(46,204,138,0.25)", borderRadius: 10, padding: "10px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, color: NAVY, lineHeight: 1.5 }}>
                      💡 {t("stolen:fr.steps.s4.tip")}
                    </div>
                  </div>
                </div>
                {/* s5 */}
                <div style={{ ...cardStyle, padding: "22px 24px", display: "flex", gap: 18 }}>
                  <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 10, background: NAVY, color: "#F5F3EE", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>5</div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: NAVY, marginBottom: 8 }}>{t("stolen:fr.steps.s5.title")}</h4>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14.5, color: MUTED, lineHeight: 1.6 }}>
                      <div><strong style={{ color: NAVY }}>{t("stolen:fr.steps.s5.withFc")}</strong> {t("stolen:fr.steps.s5.withFcBody")}</div>
                      <div style={{ marginTop: 8 }}><strong style={{ color: NAVY }}>{t("stolen:fr.steps.s5.withoutFc")}</strong> {t("stolen:fr.steps.s5.withoutFcBody")}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: 14, padding: "18px 22px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                <Lightbulb size={22} strokeWidth={2} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: NAVY, marginBottom: 6 }}>
                    {t("stolen:fr.chat.title")}
                  </h4>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: MUTED, lineHeight: 1.6, margin: 0 }}>
                    {t("stolen:fr.chat.pre")}{" "}
                    <a href="https://www.masecurite.interieur.gouv.fr/" target="_blank" rel="noopener noreferrer" style={{ color: NAVY, fontWeight: 500, textDecoration: "underline", textUnderlineOffset: 3 }}>
                      Ma Sécurité
                    </a>
                    {t("stolen:fr.chat.post")}
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* STEP 3 */}
        <section style={{ ...sectionStyle, marginBottom: 64 }}>
          <h2 style={h2Style}>{t("stolen:step3.title")}</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
            <StatusBadge label="ALL CLEAR" color={GREEN} />
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: MUTED }}>
              {t("stolen:step3.statusLabel")}
            </span>
          </div>
          <p style={{ ...bodyStyle, marginBottom: 22 }}>
            {t("stolen:step3.body.pre")} <strong style={{ color: NAVY }}>{t("stolen:step3.body.found")}</strong>
            {t("stolen:step3.body.post")}
          </p>
          <a href={APP_LOGIN} style={navyBtn} target="_blank" rel="noopener noreferrer">
            {t("stolen:step3.cta")}
          </a>
        </section>

        {/* CTA */}
        <section style={{ ...sectionStyle, maxWidth: 1000 }}>
          <div style={{ background: NAVY, borderRadius: 20, padding: "48px 40px", textAlign: "center", color: "#fff" }}>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "clamp(26px, 3vw, 34px)", color: "#fff", marginBottom: 14, letterSpacing: "-0.5px" }}>
              {t("stolen:cta.title")}
            </h2>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, maxWidth: 520, margin: "0 auto 28px" }}>
              {t("stolen:cta.body")}
            </p>
            <Link
              to="/"
              hash="order-sticker"
              hashScrollIntoView={{ behavior: "smooth", block: "start" }}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, background: GREEN, color: NAVY, padding: "14px 26px", borderRadius: 10, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 15, textDecoration: "none" }}
            >
              {t("stolen:cta.button")}
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
