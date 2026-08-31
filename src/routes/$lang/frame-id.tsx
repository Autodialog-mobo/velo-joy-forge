import { useState } from "react";
import { useTranslation } from "react-i18next";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Play, ArrowUpRight, ArrowRight } from "lucide-react";
import { VelopassMark } from "@/components/VelopassMark";
import { LangSwitcher } from "@/components/LangSwitcher";
import { Footer } from "@/components/Footer";
import { useCurrentLang } from "@/i18n/useCurrentLang";
import { buildLocalizedHead } from "@/i18n/seo";
import { isLang } from "@/i18n/config";
import nlFrameId from "@/i18n/locales/nl/frame-id.json";
import enFrameId from "@/i18n/locales/en/frame-id.json";
import frFrameId from "@/i18n/locales/fr/frame-id.json";
import deFrameId from "@/i18n/locales/de/frame-id.json";
import esFrameId from "@/i18n/locales/es/frame-id.json";

const FRAME_ID_META = {
  nl: nlFrameId.meta,
  en: enFrameId.meta,
  fr: frFrameId.meta,
  de: deFrameId.meta,
  es: esFrameId.meta,
} as const;

export const Route = createFileRoute("/$lang/frame-id")({
  head: ({ params }) => {
    const lang = isLang(params.lang) ? params.lang : "en";
    const m = FRAME_ID_META[lang];
    return buildLocalizedHead({
      lang,
      path: "frame-id",
      title: m.title,
      description: m.description,
      ogDescription: m.ogDescription,
    });
  },
  component: FrameIdPage,
});

const NAVY = "#0D1F3C";
const GREEN = "#2ECC8A";
const OFFWHITE = "#F5F3EE";

function FrameIdPage() {
  const lang = useCurrentLang();
  const { t } = useTranslation(["frame-id", "common"]);
  const [navOpen, setNavOpen] = useState(false);

  const steps = [t("steps.one"), t("steps.two"), t("steps.three")];

  return (
    <>
      <div
        className={`nav-backdrop${navOpen ? " open" : ""}`}
        onClick={() => setNavOpen(false)}
        aria-hidden="true"
      />
      <nav className="vp-nav">
        <Link to="/$lang" params={{ lang }} className="nav-logo">
          <div className="logo-mark"><VelopassMark /></div>
          <span className="logo-text">velopass</span>
        </Link>
        <ul
          id="primary-navigation"
          className={`nav-links${navOpen ? " open" : ""}`}
          onClick={() => setNavOpen(false)}
        >
          <li><Link to="/$lang" params={{ lang }} hash="wat-je-krijgt" hashScrollIntoView={{ behavior: "smooth", block: "start" }}>{t("common:nav.what_you_get")}</Link></li>
          <li><Link to="/$lang" params={{ lang }} hash="order-sticker" hashScrollIntoView={{ behavior: "smooth", block: "start" }}>{t("common:nav.order_sticker")}</Link></li>
          <li><Link to="/$lang/bike-check" params={{ lang }}>{t("common:nav.bike_check")}</Link></li>
          <li><Link to="/$lang/shop" params={{ lang }} style={{ color: "var(--green-mid)", display: "inline-flex", alignItems: "center", gap: 6 }}><ArrowUpRight size={15} strokeWidth={2.2} />{t("common:nav.for_professionals")}</Link></li>
        </ul>
        <div className="nav-actions" style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <LangSwitcher currentLang={lang} tone="light" />
          <button
            type="button"
            className="nav-toggle"
            aria-controls="primary-navigation"
            aria-haspopup="true"
            aria-label={t("common:nav.menu")}
            aria-expanded={navOpen}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setNavOpen((o) => !o);
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

      <section style={{ background: OFFWHITE, padding: "104px 24px 64px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", display: "grid", gap: 28 }}>
          <header style={{ display: "grid", gap: 10 }}>
            <span style={{ fontFamily: "'DM Sans', sans-serif", color: GREEN, fontWeight: 700, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase" }}>
              {t("hero.eyebrow")}
            </span>
            <h1 style={{ fontFamily: "Syne, sans-serif", color: NAVY, fontSize: "clamp(28px, 5vw, 44px)", lineHeight: 1.1, margin: 0, fontWeight: 800 }}>
              {t("hero.title")}
            </h1>
            <p style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(13,31,60,0.7)", fontSize: 16, lineHeight: 1.6, margin: 0 }}>
              {t("hero.subtitle")}
            </p>
          </header>

          {/* Videoblok — placeholder; later te vervangen door een embed (YouTube/Vimeo/self-hosted) */}
          <div
            role="img"
            aria-label={t("video.aria")}
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "16 / 9",
              background: NAVY,
              borderRadius: 16,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
            }}
          >
            <span
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "rgba(46,204,138,0.16)",
                border: `1.5px solid ${GREEN}`,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Play size={26} color={GREEN} strokeWidth={2} fill={GREEN} />
            </span>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(245,243,238,0.75)" }}>
              {t("video.caption")}
            </span>
          </div>

          <div style={{ display: "grid", gap: 14 }}>
            <h2 style={{ fontFamily: "Syne, sans-serif", color: NAVY, fontSize: 20, margin: 0, fontWeight: 700 }}>
              {t("steps.title")}
            </h2>
            <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
              {steps.map((step, i) => (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, fontFamily: "'DM Sans', sans-serif" }}>
                  <span
                    aria-hidden="true"
                    style={{
                      flex: "0 0 auto",
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: GREEN,
                      color: NAVY,
                      fontWeight: 700,
                      fontSize: 13,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {i + 1}
                  </span>
                  <span style={{ color: NAVY, fontSize: 15, lineHeight: 1.55, paddingTop: 3 }}>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* De sticker zelf, rechtstreeks zichtbaar op de pagina */}
          <figure
            style={{
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: 16,
              background: "#F5F3EE",
              border: "1px solid rgba(13,31,60,0.08)",
              borderRadius: 16,
              padding: 16,
              flexWrap: "wrap",
            }}
          >
            <img
              src={velopassStickerAsset.url}
              alt={t("sticker.alt")}
              width={120}
              height={120}
              loading="lazy"
              style={{ width: 120, height: "auto", aspectRatio: "1 / 1", borderRadius: 10, display: "block", flex: "0 0 auto" }}
            />
            <figcaption style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(13,31,60,0.7)", fontSize: 14, lineHeight: 1.55, minWidth: 180, flex: 1 }}>
              {t("sticker.caption")}
            </figcaption>
          </figure>



          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              color: "rgba(13,31,60,0.7)",
              fontSize: 14,
              lineHeight: 1.6,
              margin: 0,
              borderLeft: `3px solid ${GREEN}`,
              paddingLeft: 14,
            }}
          >
            {t("value")}
          </p>

          <div style={{ display: "grid", gap: 12, justifyItems: "start" }}>
            <Link
              to="/$lang/order"
              params={{ lang }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: GREEN,
                color: NAVY,
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 700,
                fontSize: 15,
                padding: "14px 22px",
                borderRadius: 12,
                textDecoration: "none",
              }}
            >
              {t("cta.order")}
              <ArrowRight size={17} strokeWidth={2.2} />
            </Link>
            <Link
              to="/$lang/bike-check"
              params={{ lang }}
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                color: "rgba(13,31,60,0.6)",
                textDecoration: "underline",
              }}
            >
              {t("cta.check")}
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
