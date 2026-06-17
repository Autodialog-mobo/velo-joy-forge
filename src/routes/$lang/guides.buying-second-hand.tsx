import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowUpRight, ArrowLeft } from "lucide-react";
import { useCurrentLang } from "@/i18n/useCurrentLang";
import { VelopassMark } from "@/components/VelopassMark";
import { Footer } from "@/components/Footer";
import { LangSwitcher } from "@/components/LangSwitcher";
import { buildLocalizedHead } from "@/i18n/seo";
import i18n from "@/i18n/config";

const APP_LOGIN = "https://app.velopass.com/login";

type Section = { title: string; body?: string; list?: string[] };
type Faq = { q: string; a: string };

export const Route = createFileRoute("/$lang/guides/buying-second-hand")({
  head: ({ params }) => {
    const lang = typeof params.lang === "string" ? params.lang : "en";
    const t = i18n.getFixedT(lang, "guides");
    const meta = buildLocalizedHead({
      lang: params.lang,
      path: "guides/buying-second-hand",
      title: t("buying_second_hand.meta.title"),
      description: t("buying_second_hand.meta.description"),
      ogType: "article",
    });

    // FAQPage + Article JSON-LD for rich results.
    const rawFaq = t("buying_second_hand.faq", { returnObjects: true });
    const faqList: Faq[] = Array.isArray(rawFaq) ? (rawFaq as Faq[]) : [];
    const faqLd = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqList.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    };

    return {
      ...meta,
      scripts: [
        { type: "application/ld+json", children: JSON.stringify(faqLd) },
      ],
    };
  },
  component: BuyingSecondHandGuide,
});

function BuyingSecondHandGuide() {
  const lang = useCurrentLang();
  const { t } = useTranslation(["guides", "common"]);
  const [navOpen, setNavOpen] = useState(false);
  const base = "buying_second_hand";
  const rawSections = t(`${base}.sections`, { returnObjects: true });
  const sections: Section[] = Array.isArray(rawSections) ? (rawSections as Section[]) : [];
  const rawFaq = t(`${base}.faq`, { returnObjects: true });
  const faq: Faq[] = Array.isArray(rawFaq) ? (rawFaq as Faq[]) : [];

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
          <li><Link to="/$lang/bike-check" params={{ lang }} search={{ lng: "nl-nl" }}>{t("common:nav.bike_check")}</Link></li>
          <li><Link to="/$lang/contact" params={{ lang }} search={{ type: "rider" }}>{t("common:nav.contact")}</Link></li>
          <li><Link to="/$lang/shop" params={{ lang }} style={{ color: "var(--green-mid)", display: "inline-flex", alignItems: "center", gap: 6 }}><ArrowUpRight size={15} strokeWidth={2.2} />{t("common:nav.for_professionals")}</Link></li>
        </ul>
        <div className="nav-actions" style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <LangSwitcher currentLang={lang} tone="light" />
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
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              event.preventDefault();
              event.stopPropagation();
              setNavOpen((o) => !o);
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (!("PointerEvent" in window)) {
                setNavOpen((o) => !o);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                setNavOpen((o) => !o);
              }
            }}
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
      <div style={{ paddingTop: 88, maxWidth: 760, margin: "0 auto", paddingLeft: "6vw", paddingRight: "6vw" }}>
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              window.history.back();
            } else {
              window.location.href = "/";
            }
          }}
          style={{
            background: "transparent",
            border: "none",
            padding: 0,
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            color: "#5A7090",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <ArrowLeft size={14} strokeWidth={2} />
          {t(`${base}.back`)}
        </button>
      </div>

      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "24px 6vw 60px",
          minHeight: "100vh",
        }}
      >
        <p
          style={{
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "1.2px",
            textTransform: "uppercase",
            color: "var(--green)",
            marginBottom: 14,
          }}
        >
          {t(`${base}.eyebrow`)}
        </p>
        <h1
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(30px, 4vw, 46px)",
            lineHeight: 1.1,
            letterSpacing: "-1px",
            color: "var(--navy)",
            marginBottom: 20,
          }}
        >
          {t(`${base}.title`)}
        </h1>
        <p
          style={{
            fontSize: 18,
            color: "var(--text-mid)",
            lineHeight: 1.6,
            marginBottom: 32,
          }}
        >
          {t(`${base}.intro`)}
        </p>

        <aside
          style={{
            background: "color-mix(in srgb, var(--green) 8%, transparent)",
            border: "1px solid color-mix(in srgb, var(--green) 25%, transparent)",
            borderRadius: 14,
            padding: "20px 22px",
            marginBottom: 40,
          }}
        >
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "1px",
              textTransform: "uppercase",
              color: "var(--green)",
              margin: "0 0 8px",
            }}
          >
            {t(`${base}.tldr_title`)}
          </p>
          <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.65, color: "var(--navy)" }}>
            {t(`${base}.tldr`)}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
            <Link
              to="/$lang/bike-check"
              params={{ lang }}
              style={{
                background: "var(--green)",
                color: "white",
                padding: "10px 18px",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              {t(`${base}.cta_primary`)} →
            </Link>
            <Link
              to="/$lang/stolen"
              params={{ lang }}
              style={{
                background: "white",
                color: "var(--navy)",
                padding: "10px 18px",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
                border: "1px solid color-mix(in srgb, var(--navy) 15%, transparent)",
              }}
            >
              {t(`${base}.cta_secondary`)}
            </Link>
          </div>
        </aside>

        {sections.map((s, i) => (
          <section key={i} style={{ marginBottom: 36 }}>
            <h2
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: 22,
                fontWeight: 700,
                color: "var(--navy)",
                marginBottom: 12,
                letterSpacing: "-0.3px",
              }}
            >
              {s.title}
            </h2>
            {s.body && (
              <p style={{ margin: 0, fontSize: 16, lineHeight: 1.7, color: "var(--text-mid)" }}>
                {s.body}
              </p>
            )}
            {s.list && (
              <ul
                style={{
                  listStyle: "disc",
                  paddingLeft: 22,
                  marginTop: 10,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  fontSize: 16,
                  lineHeight: 1.65,
                  color: "var(--text-mid)",
                }}
              >
                {s.list.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        {faq.length > 0 && (
          <section style={{ marginTop: 56 }}>
            <h2
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: 26,
                fontWeight: 700,
                color: "var(--navy)",
                marginBottom: 20,
                letterSpacing: "-0.3px",
              }}
            >
              {t(`${base}.faq_title`)}
            </h2>
            {faq.map((f, i) => (
              <details
                key={i}
                style={{
                  borderTop: "1px solid color-mix(in srgb, var(--navy) 10%, transparent)",
                  padding: "16px 0",
                }}
              >
                <summary
                  style={{
                    cursor: "pointer",
                    fontSize: 16,
                    fontWeight: 600,
                    color: "var(--navy)",
                    listStyle: "none",
                  }}
                >
                  {f.q}
                </summary>
                <p
                  style={{
                    margin: "10px 0 0",
                    fontSize: 15.5,
                    lineHeight: 1.7,
                    color: "var(--text-mid)",
                  }}
                >
                  {f.a}
                </p>
              </details>
            ))}
          </section>
        )}
      </div>
      <Footer />
    </>
  );
}
