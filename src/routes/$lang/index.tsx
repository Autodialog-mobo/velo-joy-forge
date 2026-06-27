import { useState, useMemo, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Store, Package, QrCode, ArrowRightLeft, Mail, KeyRound, CheckCircle2, ArrowUpRight, ChevronDown } from "lucide-react";
import stickerImg from "@/assets/velopass-sticker.webp";
import walletPassImg from "@/assets/velopass-wallet-pass.png.asset.json";
import heroBgWebp from "@/assets/hero-cyclist-bg-harmonized-desktop.webp.asset.json";
import heroBgWebpMobile from "@/assets/hero-cyclist-bg-harmonized-mobile.webp.asset.json";
import heroBgAvif from "@/assets/hero-cyclist-bg-harmonized-desktop.avif.asset.json";
import heroBgAvifMobile from "@/assets/hero-cyclist-bg-harmonized-mobile.avif.asset.json";
import { VelopassMark } from "@/components/VelopassMark";
import { ShopFinder } from "@/components/ShopFinder";
import { QrScanDialog } from "@/components/QrScanDialog";
import { FaqSection } from "@/components/FaqSection";
import { Footer } from "@/components/Footer";
import { LangSwitcher } from "@/components/LangSwitcher";
import { trackCheckBikeClick } from "@/lib/analytics";
import shopsData from "@/data/shops.json";
import { isLang, type Lang } from "@/i18n/config";
import { buildLocalizedHead, SITE_URL } from "@/i18n/seo";
import faqEn from "@/i18n/locales/en/faq.json";
import faqNl from "@/i18n/locales/nl/faq.json";
import faqFr from "@/i18n/locales/fr/faq.json";
import faqDe from "@/i18n/locales/de/faq.json";

const FAQ_BY_LANG: Record<Lang, { left: Array<{ q: string; a: string }>; right: Array<{ q: string; a: string }> }> = {
  en: faqEn as never,
  nl: faqNl as never,
  fr: faqFr as never,
  de: faqDe as never,
};

function stripFaqMarkdown(s: string): string {
  return s
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildHomeJsonLd(lang: Lang) {
  const faq = FAQ_BY_LANG[lang] ?? FAQ_BY_LANG.en;
  const allFaqs = [...faq.left, ...faq.right];
  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Velopass",
    url: SITE_URL,
    inLanguage: lang,
  };
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Velopass",
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.svg`,
    sameAs: ["https://app.velopass.com"],
  };
  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: allFaqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: stripFaqMarkdown(f.a) },
    })),
  };
  const product = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Velopass Frame-ID",
    description:
      "Digital bike passport sticker. One Frame-ID on your bike for theft protection, roadside assistance, insurance and your digital service book.",
    brand: { "@type": "Brand", name: "Velopass" },
    url: `${SITE_URL}/${lang}/order`,
    offers: {
      "@type": "Offer",
      priceCurrency: "EUR",
      price: "12.95",
      availability: "https://schema.org/InStock",
      url: `${SITE_URL}/${lang}/order`,
    },
  };
  return [website, organization, faqPage, product];
}

const pathIconBox: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 12,
  background: "#0D1F3C",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

export const Route = createFileRoute("/$lang/")({
  head: ({ params }) => {
    const lang = isLang(params.lang) ? params.lang : "en";
    const base = buildLocalizedHead({
      lang,
      path: "",
      title: `Velopass — ${lang === "nl" ? "Altijd op de fiets. Alles geregeld." : "Every bike. A customer for life."}`,
      description:
        lang === "nl"
          ? "Eén Frame-ID op je fiets en je hebt altijd toegang tot diefstalprotectie, pechhulp, verzekering en je fietswinkel. Het digitale fietspaspoort."
          : "One Frame-ID on your bike and you always have access to theft protection, roadside assistance, insurance and your bike shop. The digital bike passport.",
      ogTitle: "Velopass — Every bike. A customer for life.",
      ogDescription:
        "One Frame-ID on your bike and you always have access to theft protection, roadside assistance, insurance and your bike shop.",
    });
    return {
      ...base,
      links: [
        ...(base.links ?? []),
        {
          rel: "preload",
          as: "image",
          href: heroBgAvif.url,
          type: "image/avif",
          fetchpriority: "high",
          imagesrcset: `${heroBgAvifMobile.url} 800w, ${heroBgAvif.url} 1248w`,
          imagesizes: "100vw",
        } as never,
      ],
      scripts: buildHomeJsonLd(lang).map((data) => ({
        type: "application/ld+json",
        children: JSON.stringify(data),
      })),
    };
  },
  component: VelopassHome,
});

function VelopassHome() {
  const { lang } = Route.useParams();
  const currentLang = (isLang(lang) ? lang : "en") as Lang;
  const { t } = useTranslation(["common", "home"]);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanManual, setScanManual] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const activeShopsCount = useMemo(() => (shopsData as Array<{ status: string }>).filter((s) => s.status === "active").length, []);
  const QR_STORAGE_KEY = "velopass:qr-overlay:v2";
  const [qrX, setQrX] = useState(50);
  const [qrY, setQrY] = useState(49);
  const [qrSize, setQrSize] = useState(26);
  const [tunerOpen, setTunerOpen] = useState(false);
  const [noMailOpen, setNoMailOpen] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(QR_STORAGE_KEY);
      if (!raw) return;
      const v = JSON.parse(raw);
      if (typeof v.x === "number") setQrX(v.x);
      if (typeof v.y === "number") setQrY(v.y);
      if (typeof v.size === "number") setQrSize(v.size);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(QR_STORAGE_KEY, JSON.stringify({ x: qrX, y: qrY, size: qrSize }));
    } catch {}
  }, [qrX, qrY, qrSize]);

  // Dev-only WCAG contrast check: title, subtitle and badge on both
  // desktop and mobile hero background variants.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    import("@/lib/a11y/contrast-check").then(({ verifyHeroContrastMatrix }) => {
      // Desktop: object-position 72% center → text sits over the left/center
      // of the source image (roughly x≈0.5 of the photo).
      // Mobile: object-position 65% center → text region shifts slightly left.
      verifyHeroContrastMatrix({
        variants: [
          {
            name: "hero desktop (webp + desktop overlay)",
            imageUrl: heroBgWebp.url,
            textRegion: { x: 0.30, y: 0.30, w: 0.40, h: 0.40 },
            overlays: [
              "rgba(6,14,28,0.55)", // radial center
              "rgba(6,14,28,0.70)", // linear mid
            ],
          },
          {
            name: "hero mobile (webp-mobile + mobile overlay)",
            imageUrl: heroBgWebpMobile.url,
            textRegion: { x: 0.20, y: 0.30, w: 0.50, h: 0.45 },
            overlays: [
              "rgba(6,14,28,0.32)", // upper-mid (30%)
              "rgba(6,14,28,0.62)", // lower-mid (65%)
            ],
          },
        ],
        texts: [
          // Title is huge (>=42px) → "large" thresholds (3:1 AA, 4.5:1 AAA).
          { name: "title", textColor: "rgb(255,255,255)", size: "large" },
          { name: "title-em", textColor: "rgb(79,227,168)", size: "large" },
          // Subtitle is 18px regular → "normal" thresholds.
          { name: "subtitle", textColor: "rgba(255,255,255,0.95)", size: "normal" },
          // Eyebrow badge is 12.5px → "normal" thresholds (strictest).
          { name: "badge", textColor: "rgb(79,227,168)", size: "normal" },
        ],
      });
    });

    // Consolidated section-level audit (all landing sections except hero,
    // which needs image-pixel sampling above).
    import("@/lib/a11y/contrast-check").then(({ verifySectionContrastMatrix }) => {
      verifySectionContrastMatrix([
        {
          name: "Nav",
          rootSelector: ".vp-nav",
          probes: [
            { selector: ".logo-text", name: "logo" },
            { selector: ".nav-links a", name: "link", limit: 3 },
            { selector: ".btn-login", name: "login btn" },
          ],
        },
        {
          name: "Frame-ID (sticker)",
          rootSelector: "#frame-id",
          probes: [
            { selector: ".eyebrow", name: "eyebrow" },
            { selector: ".st-line-1", name: "title line 1" },
            { selector: ".st-line-2", name: "title line 2 (em)" },
            { selector: ".sec-sub", name: "intro" },
            { selector: ".sticker-feat strong", name: "feat title", limit: 3 },
            { selector: ".sticker-feat span", name: "feat body", limit: 3 },
          ],
        },
        {
          name: "Voordelen",
          rootSelector: "#wat-je-krijgt",
          probes: [
            { selector: ".eyebrow", name: "eyebrow" },
            { selector: ".sec-title", name: "title" },
            { selector: ".vc h3", name: "card title", limit: 4 },
            { selector: ".vc p", name: "card body", limit: 4 },
            { selector: ".optional-badge", name: "optional badge" },
            { selector: ".secured-pill", name: "secured pill" },
          ],
        },
        {
          name: "Path — already have one",
          rootSelector: "#already-have-one",
          probes: [
            { selector: ".eyebrow", name: "eyebrow" },
            { selector: ".sec-title", name: "title" },
            { selector: ".sec-sub", name: "lead" },
            { selector: ".sf h4", name: "step title", limit: 3 },
            { selector: ".sf p", name: "step body", limit: 3 },
            { selector: ".btn-p", name: "primary cta" },
            { selector: ".btn-s", name: "secondary cta" },
          ],
        },
        {
          name: "Path — order sticker (dark)",
          rootSelector: "#order-sticker",
          probes: [
            { selector: ".eyebrow", name: "eyebrow" },
            { selector: ".sec-title", name: "title" },
            { selector: ".sec-sub", name: "lead" },
            { selector: ".sn h4", name: "card title", limit: 2 },
            { selector: ".sn p", name: "card body", limit: 2 },
            { selector: ".path-final h4", name: "final title" },
            { selector: ".path-final p", name: "final body" },
          ],
        },
        {
          name: "Path — second hand",
          rootSelector: "#tweedehands",
          probes: [
            { selector: ".eyebrow", name: "eyebrow" },
            { selector: ".sec-title", name: "title" },
            { selector: ".sec-sub", name: "lead" },
            { selector: ".sf h4", name: "step title", limit: 3 },
            { selector: ".sf p", name: "step body", limit: 3 },
          ],
        },
        {
          name: "Community / Shop finder",
          rootSelector: "#community",
          probes: [
            { selector: ".eyebrow", name: "eyebrow" },
            { selector: "h2, .sec-title", name: "title" },
            { selector: "p", name: "body", limit: 2 },
          ],
        },
        {
          name: "FAQ",
          rootSelector: "#faq, .faq-section",
          probes: [
            { selector: ".eyebrow", name: "eyebrow" },
            { selector: "h2, .sec-title", name: "title" },
            { selector: "button, summary, [role='button']", name: "question", limit: 3 },
            { selector: "p", name: "answer", limit: 3 },
          ],
        },
        {
          name: "Footer",
          rootSelector: "footer",
          probes: [
            { selector: "a", name: "link", limit: 4 },
            { selector: "p, span, small", name: "text", limit: 3 },
          ],
        },
      ]);
    });
  }, []);

  return (
    <>
      <div className={`nav-backdrop${navOpen ? " open" : ""}`} onClick={() => { setNavOpen(false); setLangOpen(false); }} aria-hidden="true" />
      <nav className="vp-nav">
        <Link to="/$lang" params={{ lang: currentLang }} className="nav-logo">
          <div className="logo-mark"><VelopassMark /></div>
          <span className="logo-text">velopass</span>
        </Link>
        <ul id="primary-navigation" className={`nav-links${navOpen ? " open" : ""}`} onClick={() => { setNavOpen(false); setLangOpen(false); }}>
          <li><a href="#wat-je-krijgt">{t("common:nav.what_you_get")}</a></li>
          <li><a href="#already-have-one">{t("common:nav.already_have_one")}</a></li>
          <li><a href="#order-sticker">{t("common:nav.order_sticker")}</a></li>
          <li><a href="#community">{t("common:nav.community")}</a></li>
          <li><Link to="/$lang/bike-check" params={{ lang: currentLang }} search={{ lng: "nl-nl" }}>{t("common:nav.bike_check")}</Link></li>
          <li><Link to="/$lang/contact" params={{ lang: currentLang }} search={{ type: "rider" }}>{t("common:nav.contact")}</Link></li>
          <li><Link to="/$lang/shop" params={{ lang: currentLang }} style={{ color: "var(--green-mid)", display: "inline-flex", alignItems: "center", gap: 6 }}><ArrowUpRight size={15} strokeWidth={2.2} />{t("common:nav.for_professionals")}</Link></li>
        </ul>
        <div className="nav-actions" style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <LangSwitcher currentLang={currentLang} tone="light" isOpen={langOpen} onOpenChange={(o) => { setLangOpen(o); if (o) setNavOpen(false); }} />
          <a href="https://app.velopass.com" className="btn-login">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M2 13c0-2.5 2.7-4 6-4s6 1.5 6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {t("common:nav.login")}
          </a>
          <button
            type="button"
            className="nav-toggle" aria-controls="primary-navigation" aria-haspopup="true"
            aria-label={t("common:nav.menu")}
            aria-expanded={navOpen}
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              event.preventDefault();
              event.stopPropagation();
              setNavOpen((o) => !o);
              setLangOpen(false);
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (!("PointerEvent" in window)) {
                setNavOpen((o) => !o);
                setLangOpen(false);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                setNavOpen((o) => !o);
                setLangOpen(false);
              }
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              {navOpen ? (
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              ) : (
                <>
                  <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </>
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero scroll-target" id="hero">
        <picture>
          <source
            type="image/avif"
            srcSet={`${heroBgAvifMobile.url} 800w, ${heroBgAvif.url} 1248w`}
            sizes="100vw"
          />
          <source
            type="image/webp"
            srcSet={`${heroBgWebpMobile.url} 800w, ${heroBgWebp.url} 1248w`}
            sizes="100vw"
          />
          <img
            className="hero-bg"
            src={heroBgWebp.url}
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            decoding="async"
          />
        </picture>
        <div className="hero-overlay" aria-hidden="true" />
        <span className="hero-eyebrow"><span className="eyebrow-dot" />{t("home:hero.eyebrow")}</span>
        <h1 className="hero-title">{t("home:hero.title_line_1")}<br /><em>{t("home:hero.title_line_2_em")}<br />{t("home:hero.title_line_3_em")}</em></h1>
        <p className="hero-sub">{t("home:hero.sub")}</p>

        <div className="hero-cta-wrap">
          <Link to="/$lang/order" params={{ lang: currentLang }} className="hero-cta-primary">{t("home:hero.cta_primary")}</Link>
          <div className="hero-cta-sub">{t("home:hero.cta_sub")}</div>
        </div>


        <div className="path-split">
          <div className="path-card primary">
            <div className="path-tag">{t("home:paths.shop.tag")}</div>
            <div className="path-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0D1F3C" strokeWidth="1.8" strokeLinecap="round">
                <rect x="2" y="2" width="8" height="8" rx="1" />
                <rect x="14" y="2" width="8" height="8" rx="1" />
                <rect x="2" y="14" width="8" height="8" rx="1" />
                <rect x="14" y="14" width="4" height="4" rx="0.5" fill="#0D1F3C" />
              </svg>
            </div>
            <div className="path-title">{t("home:paths.shop.title")}</div>
            <p className="path-desc">{t("home:paths.shop.desc")}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start" }}>
              <a href="#already-have-one" className="path-cta" style={{ fontWeight: 600 }}>
                {t("home:paths.shop.cta")}
              </a>
              <Link
                to="/$lang/bike-check"
                params={{ lang: currentLang }}
                className="path-cta"
                style={{ color: "rgba(13,31,60,0.75)", textDecoration: "underline", textUnderlineOffset: 3 }}
              >
                {t("home:paths.shop.cta_register")}
              </Link>
            </div>
          </div>
          <Link to="/$lang/order" params={{ lang: currentLang }} className="path-card secondary">
            <div className="path-tag">{t("home:paths.order.tag")}</div>
            <div className="path-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </div>
            <div className="path-title">{t("home:paths.order.title")}</div>
            <p className="path-desc">{t("home:paths.order.desc")}</p>
            <span className="path-cta">{t("home:paths.order.cta")}</span>
          </Link>
          <a href="#tweedehands" className="path-card tertiary">
            <div className="path-tag">{t("home:paths.second_hand.tag")}</div>
            <div className="path-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round">
                <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
            </div>
            <div className="path-title">{t("home:paths.second_hand.title")}</div>
            <p className="path-desc">{t("home:paths.second_hand.desc")}</p>
            <span className="path-cta">{t("home:paths.second_hand.cta")}</span>
          </a>
        </div>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <Link
            to="/$lang/stolen"
            params={{ lang: currentLang }}
            className="stolen-link"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 400,
              fontSize: 13,
              color: "rgba(255,255,255,0.45)",
              textDecoration: "none",
            }}
          >
            {t("home:hero.stolen_link")}
          </Link>
        </div>

        <div className="hero-trust">
          <div className="avatars">
            <div className="av">LV</div><div className="av">MP</div><div className="av">KD</div><div className="av">+</div>
          </div>
          <div className="trust-text">{t("home:hero.trust_text_cyclists")}&nbsp; ·&nbsp; <strong>{activeShopsCount.toLocaleString(currentLang)}+ {t("home:hero.trust_text_suffix")}</strong></div>
        </div>
      </section>

      {/* FRAME-ID UITLEG */}
      <section className="sticker-section scroll-target" id="frame-id">
        <div className="sticker-grid">
          <div className="sticker-visual">
            <div
              className="sticker-frame"
              style={{
                ['--qr-x' as any]: `${qrX}%`,
                ['--qr-y' as any]: `${qrY}%`,
                ['--qr-size' as any]: `${qrSize}%`,
              }}
            >
              <img src={stickerImg} alt={t("home:sticker.img_alt")} width={1024} height={1024} loading="lazy" decoding="async" />
              <div className="scan-overlay" aria-hidden="true">
                <span className="scan-corner tl" />
                <span className="scan-corner tr" />
                <span className="scan-corner bl" />
                <span className="scan-corner br" />
                <span className="scan-line" />
              </div>
              <div className="scan-badge">{t("home:sticker.scan_badge")}</div>
              <div className="secured-tag" aria-label="Secured"><span className="secured-tag-dot" />SECURED</div>
            </div>
            {import.meta.env.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).has("tune") && (
              <div className="qr-tuner">
                <button type="button" className="qr-tuner-toggle" onClick={() => setTunerOpen((o) => !o)}>
                  {tunerOpen ? "Hide" : "Tune"} QR overlay
                </button>
                {tunerOpen && (
                  <div className="qr-tuner-panel">
                    <label>X <span>{qrX}%</span><input type="range" min={0} max={100} step={0.5} value={qrX} onChange={(e) => setQrX(parseFloat(e.target.value))} /></label>
                    <label>Y <span>{qrY}%</span><input type="range" min={0} max={100} step={0.5} value={qrY} onChange={(e) => setQrY(parseFloat(e.target.value))} /></label>
                    <label>Size <span>{qrSize}%</span><input type="range" min={10} max={90} step={0.5} value={qrSize} onChange={(e) => setQrSize(parseFloat(e.target.value))} /></label>
                    <code>--qr-x:{qrX}% --qr-y:{qrY}% --qr-size:{qrSize}%</code>
                    <button type="button" className="qr-tuner-toggle" style={{ alignSelf: "flex-start" }} onClick={() => { setQrX(50); setQrY(49); setQrSize(26); try { localStorage.removeItem(QR_STORAGE_KEY); } catch {} }}>Reset</button>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="sticker-content">
            <p className="eyebrow">{t("home:sticker.eyebrow")}</p>
            <h2 className="sticker-title">
              <span className="st-line-1">{t("home:sticker.title_line_1")}</span>
              <span className="st-line-2">{t("home:sticker.title_line_2")}</span>
            </h2>
            <p className="sec-sub">{t("home:sticker.intro")}</p>
            <div className="sticker-feats">
              <div className="sticker-feat">
                <div className="sfeat-bar" />
                <div><strong>{t("home:sticker.feats.location.title")}</strong><span>{t("home:sticker.feats.location.body")}</span></div>
              </div>
              <div className="sticker-feat">
                <div className="sfeat-bar" />
                <div><strong>{t("home:sticker.feats.access.title")}</strong><span>{t("home:sticker.feats.access.body")}</span></div>
              </div>
              <div className="sticker-feat">
                <div className="sfeat-bar" />
                <div><strong>{t("home:sticker.feats.frame.title")}</strong><span>{t("home:sticker.feats.frame.body")}</span></div>
              </div>
            </div>
            <div style={{ marginTop: 24, padding: "18px 20px", borderRadius: 14, background: "rgba(13,31,60,0.04)", border: "1px solid rgba(13,31,60,0.08)" }}>
              <p style={{ margin: "0 0 12px", fontSize: 15, lineHeight: 1.5, color: "rgba(13,31,60,0.82)" }}>
                {t("home:sticker.check_lead")}
              </p>
              <Link
                to="/$lang/bike-check"
                params={{ lang: currentLang }}
                onClick={() => trackCheckBikeClick("homepage_scan_section", currentLang)}

                className="path-cta"
                style={{ fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                {t("home:sticker.check_cta")}
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* VOORDELEN */}
      <section className="voordelen scroll-target" id="wat-je-krijgt">
        <p className="eyebrow">{t("home:benefits.section_label")}</p>
        <h2 className="sec-title">{t("home:benefits.title")}</h2>
        <div className="vgrid">
          <div className="vc">
            <div className="vc-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0D1F3C" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="2" width="8" height="8" rx="1" /><rect x="14" y="2" width="8" height="8" rx="1" /><rect x="2" y="14" width="8" height="8" rx="1" /><rect x="14" y="14" width="4" height="4" rx="0.5" fill="#2ECC8A" /></svg></div>
            <div>
              <div className="vc-head"><h3>{t("home:benefits.cards.theft")}</h3></div>
              <p>{t("home:benefits.cards.theft_body", { shopCount: activeShopsCount.toLocaleString(currentLang) })}</p>
              <div className="secured-pill"><span className="sdot" />{t("home:benefits.secured_pill")}</div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: 12, color: "var(--text-muted)", marginTop: 10, lineHeight: 1.5 }}>
                {t("home:benefits.cards.theft_mybike")}
              </p>
              <Link
                to="/$lang/stolen"
                params={{ lang: currentLang }}
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 500,
                  fontSize: 12,
                  color: "#F59E0B",
                  textDecoration: "none",
                  display: "inline-block",
                  marginTop: 10,
                }}
              >
                {t("home:benefits.cards.theft_stolen_link")}
              </Link>
            </div>
          </div>
          <div className="vc">
            <div className="vc-icon"><Store size={22} color="#0D1F3C" strokeWidth={1.8} /></div>
            <div className="vc-wallet-row">
              <div className="vc-wallet-text">
                <div className="vc-head"><h3>{t("home:benefits.cards.service_book")}</h3></div>
                <p className="vc-wallet-body">{t("home:benefits.cards.service_book_body")}</p>
                <p className="vc-wallet-load">{t("home:benefits.cards.service_book_wallet_load")}</p>
                <p className="vc-wallet-note">{t("home:benefits.cards.service_book_note")}</p>
              </div>
              <img
                className="vc-wallet-img"
                src={walletPassImg.url}
                alt={t("home:benefits.cards.service_book_wallet_alt")}
                loading="lazy"
              />
            </div>
          </div>
          <div className="vc">
            <div className="vc-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0D1F3C" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></svg></div>
            <div>
              <div className="vc-head"><h3>{t("home:benefits.cards.roadside")}</h3><span className="optional-badge">{t("home:benefits.optional_badge")}</span></div>
              <p>{t("home:benefits.cards.roadside_body")}</p>
            </div>
          </div>
          <div className="vc">
            <div className="vc-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0D1F3C" strokeWidth="1.8" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg></div>
            <div>
            <div className="vc-head"><h3>{t("home:benefits.cards.insurance")}</h3><span className="optional-badge">{t("home:benefits.optional_badge")}</span></div>
              <p>{t("home:benefits.cards.insurance_body")}</p>
            </div>
          </div>
          <div className="vc" style={{ gridColumn: "1/-1" }}>
            <div className="vc-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0D1F3C" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg></div>
            <div style={{ flex: 1 }}>
              <div className="vc-head"><h3>{t("home:benefits.cards.ownership")}</h3></div>
              <p>{t("home:benefits.cards.ownership_body")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* PAD 1 */}
      <section className="flow-sticker scroll-target" id="already-have-one">
        <p className="eyebrow">{t("home:paths.shop.eyebrow")}</p>
        <h2 className="sec-title">{t("home:paths.shop.title")}</h2>
        <p className="sec-sub">{t("home:paths.shop.body")}</p>
        <div className="steps-flow">
          {[
            { n: 1, t: t("home:paths.shop.steps.s1.title"), d: t("home:paths.shop.steps.s1.body"), icon: <Mail size={22} color="#2ECC8A" strokeWidth={1.8} /> },
            { n: 2, t: t("home:paths.shop.steps.s2.title"), d: t("home:paths.shop.steps.s2.body"), icon: <KeyRound size={22} color="#2ECC8A" strokeWidth={1.8} /> },
            { n: 3, t: t("home:paths.shop.steps.s3.title"), d: t("home:paths.shop.steps.s3.body"), icon: <CheckCircle2 size={22} color="#2ECC8A" strokeWidth={1.8} /> },
          ].map((s, i, arr) => (
            <div className="sf" key={s.n}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div className="sf-num" style={{ marginBottom: 0 }}>{s.n}</div>
                {s.icon}
              </div>
              <h4>{s.t}</h4>
              <p>{s.d}</p>
              {i < arr.length - 1 && (
                <div className="sf-arrow">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 5h4M5 3l2 2-2 2" stroke="#5A7090" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 36, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
          <a href="https://app.velopass.com" className="btn-p">{t("home:paths.shop.cta_primary")}</a>
          <div className="no-mail-help" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <button
              type="button"
              className="btn-s no-mail-trigger"
              onClick={() => setNoMailOpen((o) => !o)}
              aria-expanded={noMailOpen}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              {t("home:paths.shop.no_mail_trigger")}
              <ChevronDown size={14} strokeWidth={2.2} style={{ transform: noMailOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }} />
            </button>
            {noMailOpen && (
              <div className="no-mail-steps" style={{ marginTop: 12, padding: "16px 18px", background: "rgba(13,31,60,0.45)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", maxWidth: 380 }}>
                <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                  <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: "50%", background: "rgba(46,204,138,0.15)", color: "#2ECC8A", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>1</span>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "rgba(255,255,255,0.85)" }}>{t("home:paths.shop.no_mail_step1")}</p>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: "50%", background: "rgba(46,204,138,0.15)", color: "#2ECC8A", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>2</span>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "rgba(255,255,255,0.85)" }}>{t("home:paths.shop.no_mail_step2")}</p>
                    <Link to="/$lang/bike-check" params={{ lang: currentLang }} style={{ display: "inline-block", marginTop: 8, fontSize: 14, fontWeight: 600, color: "#2ECC8A", textDecoration: "none" }}>{t("home:paths.shop.no_mail_step2_cta")}</Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* PAD 2 */}
      <section className="flow-new scroll-target" id="order-sticker">
        <p className="eyebrow">{t("home:paths.order.eyebrow")}</p>
        <h2 className="sec-title">{t("home:paths.order.title")}</h2>
        <p className="sec-sub">{t("home:paths.order.body")}</p>
        <div className="steps-new two-paths">
          <div className="sn path-shop">
            <div style={pathIconBox}><Store size={24} color="#fff" strokeWidth={1.8} /></div>
            <h4>{t("home:paths.order.shop_path.title")}</h4>
            <p>{t("home:paths.order.shop_path.body")}</p>
            <a href="#community" className="btn-p">{t("home:paths.order.shop_path.cta")}</a>
          </div>
          <div className="sn path-shop">
            <div style={pathIconBox}><Package size={24} color="#fff" strokeWidth={1.8} /></div>
            <h4>{t("home:paths.order.web_path.title")}</h4>
            <p>{t("home:paths.order.web_path.body")}</p>
            <Link to="/$lang/order" params={{ lang: currentLang }} className="btn-g">{t("home:paths.order.web_path.cta")}</Link>
          </div>
        </div>
        <div className="path-final">
          <div className="path-final-arrow">
            <CheckCircle2 size={22} color="#2ECC8A" strokeWidth={1.8} />
          </div>
          <div>
            <h4>{t("home:paths.order.final.title")}</h4>
            <p>{t("home:paths.order.final.body")}</p>
          </div>
        </div>
      </section>

      <ShopFinder />

      {/* PAD 3 */}
      <section className="flow-sticker scroll-target" id="tweedehands" style={{ background: "var(--bg)" }}>
        <p className="eyebrow">{t("home:paths.second_hand.eyebrow")}</p>
        <h2 className="sec-title">{t("home:paths.second_hand.title_lead")} <em style={{ fontStyle: "normal", color: "#2ECC8A" }}>{t("home:paths.second_hand.title_em")}</em></h2>
        <p className="sec-sub">{t("home:paths.second_hand.body")}</p>
        <div className="steps-flow">
          {[
            { n: 1, t: t("home:paths.second_hand.steps.s1.title"), d: t("home:paths.second_hand.steps.s1.body"), icon: <QrCode size={22} color="#2ECC8A" strokeWidth={1.8} /> },
            { n: 2, t: t("home:paths.second_hand.steps.s2.title"), d: t("home:paths.second_hand.steps.s2.body"), icon: <ArrowRightLeft size={22} color="#2ECC8A" strokeWidth={1.8} /> },
            { n: 3, t: t("home:paths.second_hand.steps.s3.title"), d: t("home:paths.second_hand.steps.s3.body"), icon: <CheckCircle2 size={22} color="#2ECC8A" strokeWidth={1.8} /> },
          ].map((s, i, arr) => (
            <div className="sf" key={s.n}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div className="sf-num" style={{ marginBottom: 0 }}>{s.n}</div>
                {s.icon}
              </div>
              <h4>{s.t}</h4>
              <p>{s.d}</p>
              {i < arr.length - 1 && (
                <div className="sf-arrow">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 5h4M5 3l2 2-2 2" stroke="#5A7090" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 36, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button type="button" onClick={() => { setScanManual(false); setScanOpen(true); }} className="btn-p" style={{ border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <QrCode size={16} strokeWidth={2} /> {t("home:paths.second_hand.cta_scan")}
          </button>
          <button type="button" onClick={() => { setScanManual(true); setScanOpen(true); }} className="btn-s" style={{ border: "none", background: "transparent", cursor: "pointer", font: "inherit" }}>
            {t("home:paths.second_hand.cta_manual")}
          </button>
        </div>
      </section>

      <FaqSection />

      {/* NOG VRAGEN CTA */}
      <section style={{ background: "#183A6E", padding: "32px 40px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <div>
            <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 20, color: "#fff", margin: 0 }}>{t("home:contact_band.title")}</p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.7)", margin: "4px 0 0" }}>{t("home:contact_band.subtitle")}</p>

          </div>
          <Link
            to="/$lang/contact"
            params={{ lang: currentLang }}
            search={{ type: "rider" }}
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: 14,
              letterSpacing: "1.2px",
              textTransform: "uppercase",
              background: "#2ECC8A",
              color: "#0D1F3C",
              padding: "12px 24px",
              borderRadius: 10,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              whiteSpace: "nowrap",
            }}
          >
            {t("home:contact_band.cta")}
          </Link>
        </div>
      </section>

      <Footer />

      <QrScanDialog open={scanOpen} onOpenChange={setScanOpen} initialManual={scanManual} />
    </>
  );
}
