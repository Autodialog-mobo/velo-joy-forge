import { useState, lazy, Suspense, useEffect } from "react";
import { useCurrentLang } from "@/i18n/useCurrentLang";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation, Trans } from "react-i18next";
import { ArrowUpRight, Shield, ShieldCheck, FileText, Package, Truck, ScanLine, Mail, CheckCircle2, Sparkles, Building2, Wallet, CalendarDays, ExternalLink, ClipboardList, X, Check as CheckIcon, AlertCircle, Smartphone, Link2, Sticker, QrCode, Send, RefreshCw, Monitor } from "lucide-react";
import { VelopassMark } from "@/components/VelopassMark";
import { Footer } from "@/components/Footer";
import { LangSwitcher } from "@/components/LangSwitcher";
import { useActiveShopCount } from "@/lib/active-shop-count";
import { RegisterForm } from "@/components/ProRegisterForm";
import leasingAppMockup from "@/assets/leasing-app-mockup-v2.webp";
import fabOxford from "@/assets/fab-oxford.webp";
import fabBike43 from "@/assets/fab-bike43.webp";
import fabFrameId from "@/assets/fab-frameid.webp";
import fabGranville from "@/assets/fab-granville.webp";
import kbcLogo from "@/assets/kbc-logo.webp";

import { buildLocalizedHead } from "@/i18n/seo";
import { trackProLoginClick } from "@/lib/analytics";
import { verifyHeroContrastMatrix } from "@/lib/a11y/contrast-check";
import enBundle from "@/i18n/locales/en/shop.json";
import nlBundle from "@/i18n/locales/nl/shop.json";
import frBundle from "@/i18n/locales/fr/shop.json";
import deBundle from "@/i18n/locales/de/shop.json";
import esBundle from "@/i18n/locales/es/shop.json";

const ProCommunityMap = lazy(() => import("@/components/ProCommunityMap"));

type MetaBundle = { meta: { title: string; description: string; ogDescription: string } };
const metaMap: Record<string, MetaBundle> = { en: enBundle, nl: nlBundle, fr: frBundle, de: deBundle, es: esBundle };

export const Route = createFileRoute("/$lang/shop")({
  head: ({ params }) => {
    const bundle = metaMap[params.lang] ?? enBundle;
    return buildLocalizedHead({
      lang: params.lang,
      path: "shop",
      title: bundle.meta.title,
      description: bundle.meta.description,
      ogDescription: bundle.meta.ogDescription,
    });
  },
  component: VelopassPro,
});

const QrIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="0" y="0" width="6" height="6" rx="1" fill="#0D1F3C" />
    <rect x="8" y="0" width="6" height="6" rx="1" fill="#0D1F3C" />
    <rect x="0" y="8" width="6" height="6" rx="1" fill="#0D1F3C" />
  </svg>
);

const Check = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M13 4L6 11 3 8" stroke="#2ECC8A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function LeasingScanImage() {
  const [zoomed, setZoomed] = useState(false);
  const { t } = useTranslation("shop");
  return (
    <div
      onClick={() => setZoomed((z) => !z)}
      role="button"
      aria-label={zoomed ? t("leasing.zoomOutTitle") : t("leasing.zoomInTitle")}
      title={zoomed ? t("leasing.zoomOutTitle") : t("leasing.zoomInTitle")}
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
        borderRadius: 12,
        cursor: zoomed ? "zoom-out" : "zoom-in",
      }}
    >
      <img
        src={leasingAppMockup}
        alt={t("leasing.appAlt")}
        loading="lazy"
        decoding="async"
        style={{
          width: "100%",
          maxHeight: 520,
          objectFit: "contain",
          borderRadius: 12,
          filter: "drop-shadow(0 20px 40px rgba(13,31,60,0.15))",
          transform: zoomed ? "scale(2)" : "scale(1)",
          transformOrigin: "center center",
          transition: "transform 0.3s ease",
        }}
      />
    </div>
  );
}

function VelopassPro() {
  const lang = useCurrentLang();
  const { t } = useTranslation("shop");
  const [navOpen, setNavOpen] = useState(false);
  const activeShopsCount = useActiveShopCount();
  const [currentMonthYear, setCurrentMonthYear] = useState("");
  useEffect(() => {
    const locale = lang === "fr" ? "fr-BE" : lang === "de" ? "de-DE" : lang === "en" ? "en-GB" : "nl-BE";
    setCurrentMonthYear(new Date().toLocaleDateString(locale, { month: "long", year: "numeric" }));
  }, [lang]);

  // Dev-only WCAG contrast check for hero text over (image + overlay).
  useEffect(() => {
    const imageUrl =
      "https://images.unsplash.com/photo-1675798225739-d8919b7a23f7?w=1920&q=80";
    const overlays = ["rgba(6,14,28,0.78)", "rgba(6,14,28,0.90)"];
    verifyHeroContrastMatrix({
      variants: [
        {
          name: "shop hero (image + overlay)",
          imageUrl,
          textRegion: { x: 0.08, y: 0.35, w: 0.35, h: 0.3 },
          overlays,
        },
      ],
      texts: [
        { name: "title", textColor: "rgb(255,255,255)", size: "large" },
        { name: "subtitle", textColor: "rgba(255,255,255,0.85)", size: "normal" },
      ],
    });
  }, []);

  const bikes = [
    { name: "Trek Domane AL 4", sub: t("hero.dash.bike1Sub"), a: true },
    { name: "Specialized Turbo Como", sub: t("hero.dash.bike2Sub"), a: false },
    { name: "Giant Escape 3", sub: t("hero.dash.bike3Sub"), a: true },
  ];

  return (
    <>
      <div className={`nav-backdrop${navOpen ? " open" : ""}`} onClick={() => setNavOpen(false)} aria-hidden="true" />
      <nav className="vp-nav dark">
        <Link to="/$lang/shop" params={{ lang }} className="nav-logo">
          <div className="logo-mark"><VelopassMark /></div>
          <span className="logo-text">velopass<span className="logo-pro">pro</span></span>
        </Link>
        <ul id="primary-navigation" className={`nav-links${navOpen ? " open" : ""}`} onClick={() => setNavOpen(false)}>
          <li><a href="#voordelen">{t("nav.voordelen")}</a></li>
          <li><a href="#hoe-werkt-het">{t("nav.howItWorks")}</a></li>
          <li><a href="#fabrikanten">{t("nav.fabrikanten")}</a></li>
          <li><a href="#leasing">{t("nav.leasing")}</a></li>
          <li><a href="#registreer">{t("nav.register")}</a></li>
          <li><a href="#community">{t("nav.community")}</a></li>
          <li>
            <Link to="/$lang" params={{ lang }} style={{ color: "rgba(46,204,138,0.7)", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <ArrowUpRight size={15} strokeWidth={2.2} />{t("nav.forCyclists")}
            </Link>
          </li>
          <li className="nav-link-pro-login">
            <a href="https://app.velopass.pro" className="vp-pro" onClick={() => trackProLoginClick("mobile_menu", lang)}>{t("nav.proLogin")}</a>
          </li>
        </ul>
        <div className="nav-actions" style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <LangSwitcher currentLang={lang} />
          <a href="https://app.velopass.pro" className="btn-pro-login" onClick={() => trackProLoginClick("header", lang)}>{t("nav.proLogin")}</a>
          <a href="#registreer" className="btn-nav-cta">{t("nav.registerCta")}</a>
          <button
            type="button"
            className="nav-toggle" aria-controls="primary-navigation" aria-haspopup="true"
            aria-label={t("nav.menuLabel")}
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

      <section className="pro-hero">
        <div
          className="pro-hero-bg"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1675798225739-d8919b7a23f7?w=1920&q=80')` }}
        />
        <div className="pro-hero-overlay" aria-hidden="true" />
        <div className="pro-hero-left">
          <span className="hero-eyebrow"><span className="eyebrow-dot" />{t("hero.eyebrow")}</span>
          <h1 className="pro-hero-title">{t("hero.title1")}<br /><em>{t("hero.titleEm")}</em></h1>
          <p className="pro-hero-sub">{t("hero.sub")}</p>
          <div className="hero-ctas">
            <a href="#registreer" className="btn-g">{t("hero.ctaPrimary")}</a>
            <a href="#hoe-werkt-het" className="btn-s dark">{t("hero.ctaSecondary")}</a>
          </div>
          <a href="https://app.velopass.pro" className="hero-pro-login-link" onClick={() => trackProLoginClick("hero", lang)}>
            <ArrowUpRight size={14} strokeWidth={2.2} /> {t("nav.alreadyPartner")}
          </a>
          <div className="hero-stats">
            <div>
              <div className="stat-num">{activeShopsCount.toLocaleString("nl-BE")}<span>+</span></div>
              <div className="stat-label">{t("hero.statShopsLabel")}</div>
            </div>
            <div>
              <div className="stat-num">+200<span>K</span></div>
              <div className="stat-label">{t("hero.statBikesLabel")}</div>
            </div>
            <div>
              <div className="stat-num">22<span>%</span></div>
              <div className="stat-label">{t("hero.statRetentionLabel")}</div>
            </div>
          </div>
          <p style={{ marginTop: 18, fontSize: 13, lineHeight: 1.55, color: "rgba(255,255,255,0.75)", maxWidth: 560 }}>
            {t("hero.trustLine")}
          </p>
        </div>
        <div className="pro-hero-right">
          <div className="dash">
            <div className="dash-hdr">
              <span className="dash-title">{t("hero.dash.shopName")} — {currentMonthYear}</span>
              <span className="dash-date">{t("hero.dash.subtitle")}</span>
            </div>
            <div className="dash-stats">
              <div className="ds"><div className="ds-label">{t("hero.dash.stat1Label")}</div><div className="ds-val">284</div><div className="ds-delta">{t("hero.dash.stat1Delta")}</div></div>
              <div className="ds"><div className="ds-label">{t("hero.dash.stat2Label")}</div><div className="ds-val g">€ 340</div><div className="ds-delta">{t("hero.dash.stat2Delta")}</div></div>
              <div className="ds"><div className="ds-label">{t("hero.dash.stat3Label")}</div><div className="ds-val">47</div><div className="ds-delta">{t("hero.dash.stat3Delta")}</div></div>
              <div className="ds"><div className="ds-label">{t("hero.dash.stat4Label")}</div><div className="ds-val g">91%</div><div className="ds-delta">{t("hero.dash.stat4Delta")}</div></div>
            </div>
            <div className="dash-div" />
            <div className="dash-list-title">{t("hero.dash.recentScans")}</div>
            {bikes.map((b) => (
              <div className="bike-row" key={b.name}>
                <div className="bike-info">
                  <div className="bike-qr"><QrIcon /></div>
                  <div><div className="bike-name">{b.name}</div><div className="bike-sub">{b.sub}</div></div>
                </div>
                <span className={`badge ${b.a ? "a" : "p"}`}>{b.a ? t("hero.dash.badgeActive") : t("hero.dash.badgePending")}</span>
              </div>
            ))}
            <button className="scan-btn">{t("hero.dash.scanBtn")}</button>
          </div>
        </div>
      </section>

      <section className="pijlers" id="voordelen">
        <p className="eyebrow">{t("pillars.eyebrow")}</p>
        <h2 className="sec-title" style={{ marginBottom: 56, maxWidth: 520 }}>
          {t("pillars.title", { count: activeShopsCount.toLocaleString("nl-BE") })}
        </h2>
        <div className="pijler-grid">
          <div className="pc">
            <div className="pc-num">01</div>
            <div className="pc-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0D1F3C" strokeWidth="1.8" strokeLinecap="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
            </div>
            <h3>{t("pillars.p1.title")}</h3>
            <p>{t("pillars.p1.body")}</p>
          </div>
          <div className="pc">
            <div className="pc-num">02</div>
            <div className="pc-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0D1F3C" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
              </svg>
            </div>
            <h3>{t("pillars.p2.title")}</h3>
            <p>{t("pillars.p2.body")}</p>
            <p style={{ fontSize: 12, lineHeight: 1.5, opacity: 0.6, marginTop: 6 }}>{t("pillars.p2.note")}</p>

            <div className="ctag">{t("pillars.p2.tag")}</div>
          </div>
          <div className="pc">
            <div className="pc-num">03</div>
            <div className="pc-icon"><ScanLine size={22} color="#0D1F3C" strokeWidth={1.8} /></div>
            <h3>{t("pillars.p3.title")}</h3>
            <p>{t("pillars.p3.body")}</p>
            <div className="pc-reported-orange">
              <AlertCircle size={13} color="#F59E0B" strokeWidth={2} />
              <span>
                <Trans
                  i18nKey="pillars.p3.reported"
                  ns="shop"
                  components={{ strong: <strong style={{ color: "#F59E0B" }} /> }}
                />
              </span>
            </div>
          </div>
          <div className="pc">
            <div className="pc-num">04</div>
            <div className="pc-icon"><Smartphone size={22} color="#0D1F3C" strokeWidth={1.8} /></div>
            <h3>{t("pillars.p4.title")}</h3>
            <p>{t("pillars.p4.body")}</p>
          </div>
        </div>
      </section>

      <section className="how" id="hoe-werkt-het">
        <p className="eyebrow">{t("how.eyebrow")}</p>
        <h2 className="sec-title">
          <Trans
            i18nKey="how.title"
            ns="shop"
            components={{ green: <span style={{ color: "#2ECC8A" }} /> }}
          />
        </h2>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div className="mstep">
            <div className="mnum">1</div>
            <div style={{ flex: 1 }}>
              <h4>{t("how.step1.title")}</h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 10 }}>
                <div style={{ background: "rgba(46,204,138,0.08)", borderRadius: 10, padding: 16, borderLeft: "3px solid #2ECC8A", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#2ECC8A" }}>
                    <Monitor size={16} color="#2ECC8A" strokeWidth={2} /> {t("how.step1.posLabel")}
                  </div>
                  <h5 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#fff", fontFamily: "'DM Sans', sans-serif" }}>{t("how.step1.posTitle")}</h5>
                  <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.55 }}>{t("how.step1.posBody")}</p>
                  <span style={{ marginTop: "auto", alignSelf: "flex-start", fontSize: 11, fontWeight: 600, color: "#2ECC8A", background: "rgba(46,204,138,0.15)", padding: "4px 8px", borderRadius: 6 }}>{t("how.step1.posBadge")}</span>
                </div>
                <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: 16, borderLeft: "3px solid rgba(255,255,255,0.3)", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#fff" }}>
                    <Smartphone size={16} color="#fff" strokeWidth={2} /> {t("how.step1.appLabel")}
                  </div>
                  <h5 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#fff", fontFamily: "'DM Sans', sans-serif" }}>{t("how.step1.appTitle")}</h5>
                  <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.55 }}>{t("how.step1.appBody")}</p>
                  <span style={{ marginTop: "auto", alignSelf: "flex-start", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.08)", padding: "4px 8px", borderRadius: 6 }}>{t("how.step1.appBadge")}</span>
                </div>
              </div>
            </div>
          </div>
          {[
            { n: 2, icon: <Send size={16} strokeWidth={2} />, titleKey: "how.step2.title", bodyKey: "how.step2.body" },
            { n: 3, icon: <RefreshCw size={16} strokeWidth={2} />, titleKey: "how.step3.title", bodyKey: "how.step3.body" },
          ].map((s) => (
            <div className="mstep" key={s.n}>
              <div className="mnum">{s.n}</div>
              <div>
                <h4 style={{ display: "flex", alignItems: "center", gap: 8 }}>{s.icon} {t(s.titleKey)}</h4>
                <p>{t(s.bodyKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Fabrikanten />

      <Leasing />

      <section className="register" id="registreer">
        <div className="reg-inner">
          <div>
            <p className="eyebrow">{t("register.eyebrow")}</p>
            <h2 className="sec-title">{t("register.title")}</h2>
            <p className="reg-sub">{t("register.sub")}</p>

            <div className="reg-package">
              <div className="reg-package-title">{t("register.packageTitle")}</div>
              <div className="reg-package-items">
                <div className="reg-package-item"><span className="reg-pcheck">✓</span><span className="reg-package-text">{t("register.packageItem1")}</span></div>
                <div className="reg-package-item"><span className="reg-pcheck">✓</span><span className="reg-package-text">{t("register.packageItem2")}</span></div>
                <div className="reg-package-item">
                  <span className="reg-pcheck">✓</span>
                  <span className="reg-package-text">{t("register.packageItem3")}</span>
                </div>
                <div className="reg-package-sub">{t("register.packageItem3Sub")}</div>
                <div className="reg-package-item">
                  <span className="reg-pcheck">✓</span>
                  <span className="reg-package-text">{t("register.packageItem4")}</span>
                </div>
                <div className="reg-package-item"><span className="reg-pcheck">✓</span><span className="reg-package-text">{t("register.packageItem5")}</span></div>
                <div className="reg-package-item"><span className="reg-pcheck">✓</span><span className="reg-package-text">{t("register.packageItem6")}</span></div>
              </div>
              <p className="reg-package-note">{t("register.packageNote")}</p>
            </div>

            {[
              { titleKey: "register.feat1Title", bodyKey: "register.feat1Body" },
              { titleKey: "register.feat2Title", bodyKey: "register.feat2Body" },
              { titleKey: "register.feat3Title", bodyKey: "register.feat3Body" },
            ].map((f) => (
              <div className="rfeat" key={f.titleKey}>
                <div className="rfeat-icon"><Check /></div>
                <div><h4>{t(f.titleKey)}</h4><p>{t(f.bodyKey)}</p></div>
              </div>
            ))}
          </div>
          <RegisterForm />
        </div>
      </section>

      <ProCommunity activeShopsCount={activeShopsCount} />

      <section style={{ background: "#183A6E", padding: "32px 40px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <div>
            <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 20, color: "#fff", margin: 0 }}>{t("contactCta.title")}</p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.7)", margin: "4px 0 0" }}>{t("contactCta.sub")}</p>
          </div>
          <Link
            to="/$lang/contact"
            params={{ lang }}
            search={{ type: "shop" }}
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
            {t("contactCta.btn")}
          </Link>
        </div>
      </section>

      <Footer variant="pro" />
    </>
  );
}

function ProCommunity({ activeShopsCount }: { activeShopsCount: number }) {
  const { t } = useTranslation("shop");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const formatted = activeShopsCount.toLocaleString("nl-BE");
  return (
    <section className="pro-community" id="community">
      <div className="pcm-inner">
        <div className="pcm-header">
          <p className="eyebrow" style={{ color: "#2ECC8A" }}>{t("community.eyebrow")}</p>
          <h2 className="pcm-title">
            <Trans
              i18nKey="community.title"
              ns="shop"
              components={{ em: <em /> }}
            />
          </h2>
          <p className="pcm-sub">
            {t("community.sub", { count: formatted })}
          </p>
          <p className="pcm-note">{t("community.note")}</p>
        </div>

        <div className="pcm-stats">
          <div className="pcm-stat">
            <div className="pcm-stat-num">{formatted}<span>+</span></div>
            <div className="pcm-stat-label">{t("community.stat1Label")}</div>
          </div>
          <div className="pcm-stat">
            <div className="pcm-stat-num">+200<span>K</span></div>
            <div className="pcm-stat-label">{t("community.stat2Label")}</div>
          </div>
          <div className="pcm-stat">
            <div className="pcm-stat-num g">{t("community.stat3Num")}</div>
            <div className="pcm-stat-label">{t("community.stat3Label")}</div>
          </div>
        </div>

        <div className="pcm-mapcard">
          <div className="pcm-mapcard-head">
            <div>
              <div className="pcm-mapcard-title">{t("community.mapTitle")}</div>
              <div className="pcm-mapcard-sub">{t("community.mapSub")}</div>
            </div>
            <a href="#registreer" className="pcm-cta">{t("community.mapCta")}</a>
          </div>
          <div className="pcm-map">
            {mounted ? (
              <Suspense fallback={<div className="sf-map-loading">{t("community.mapLoading")}</div>}>
                <ProCommunityMap />
              </Suspense>
            ) : (
              <div className="sf-map-loading">{t("community.mapLoading")}</div>
            )}
          </div>
        </div>

        <div className="pcm-tagline">
          Every bike. <span>A customer. For life.</span>
        </div>
      </div>
    </section>
  );
}

type Attr = "decal" | "lak" | "data" | "doos";

function Fabrikanten() {
  const { t } = useTranslation("shop");

  const badgeMeta: Record<Attr, { label: string; cls: string }> = {
    decal: { label: t("fab.badgeDecal"), cls: "fb-badge fb-decal" },
    lak:   { label: t("fab.badgeLak"),   cls: "fb-badge fb-lak" },
    data:  { label: t("fab.badgeData"),  cls: "fb-badge fb-data" },
    doos:  { label: t("fab.badgeDoos"),  cls: "fb-badge fb-doos" },
  };

  const features = [
    { icon: <Shield size={20} color="#2ECC8A" />, t: t("fab.feat1Title"), d: t("fab.feat1Body"), premium: true, badge: t("fab.feat1Badge") },
    { icon: <FileText size={20} color="#2ECC8A" />, t: t("fab.feat2Title"), d: t("fab.feat2Body") },
    { icon: <Package size={20} color="#2ECC8A" />, t: t("fab.feat3Title"), d: t("fab.feat3Body") },
  ];

  const makers: Array<{ name: string; attrs: Attr[]; sub: string; extra?: string; logo?: string }> = [
    { name: "Oxford",      attrs: ["decal", "data", "doos"], sub: t("fab.makers.oxfordSub"),   extra: t("fab.makers.oxfordExtra"),   logo: "https://cdn.prod.website-files.com/66538f2ad65b2084a18d9d09/666c4e21b72c3a8feea5c9e8_oxford%20logo.png" },
    { name: "Granville",   attrs: ["decal", "lak", "data"],  sub: t("fab.makers.granvilleSub"), extra: t("fab.makers.granvilleExtra"), logo: "https://cdn.prod.website-files.com/66538f2ad65b2084a18d9d09/67910d67578d775904d1a1de_Granville%20logo.png" },
    { name: "Veloe",       attrs: ["lak", "data"],            sub: t("fab.makers.veloeSub"),    logo: "https://cdn.prod.website-files.com/66538f2ad65b2084a18d9d09/680b77032634561d90f2037b_veloe-logo-black-transparant.png" },
    { name: "Bike43",      attrs: ["lak"],                    sub: t("fab.makers.defaultSub"),  logo: "https://cdn.prod.website-files.com/66538f2ad65b2084a18d9d09/666c507342c67709752afa70_Bike%2043%20logo.png" },
    { name: "UrbanBiker",  attrs: ["lak"],                    sub: t("fab.makers.defaultSub"),  logo: "https://www.urbanbiker.com/wp-content/uploads/2023/03/cropped-Icono-principal-sin-fondo-270x270.png" },
    { name: "Lev",         attrs: ["lak"],                    sub: t("fab.makers.defaultSub"),  logo: "https://www.golev.eu/apple-touch-icon.png" },
    { name: "Specter",     attrs: ["lak"],                    sub: t("fab.makers.defaultSub"),  logo: "https://cdn.prod.website-files.com/66538f2ad65b2084a18d9d09/66c31ea4b8feecaefcc34807_specter%20logo.png" },
    { name: "Thompson",    attrs: ["lak"],                    sub: t("fab.makers.defaultSub"),  logo: "https://cdn.prod.website-files.com/66538f2ad65b2084a18d9d09/66c09339ca49535d8bfbd2b0_thompson%20logo.png" },
    { name: "Flebi",       attrs: ["lak"],                    sub: t("fab.makers.defaultSub"),  logo: "https://flebi.com/wp-content/uploads/2024/10/cropped-Flebi_icono_positivo-270x270.png" },
  ];

  return (
    <section className="fabrikanten" id="fabrikanten">
      <div className="fb-inner">
        <p className="eyebrow" style={{ color: "#1AAD70" }}>{t("fab.eyebrow")}</p>
        <h2 className="sec-title">{t("fab.title")}</h2>
        <p className="fb-sub">{t("fab.sub")}</p>

        <div className="fb-gallery">
          <figure className="fb-shot">
            <img src={fabOxford} alt={t("fab.img1Alt")} loading="lazy" />
            <figcaption>{t("fab.img1Caption")}</figcaption>
          </figure>
          <figure className="fb-shot">
            <img src={fabGranville} alt={t("fab.img2Alt")} loading="lazy" />
            <figcaption>{t("fab.img2Caption")}</figcaption>
          </figure>
          <figure className="fb-shot">
            <img src={fabBike43} alt={t("fab.img3Alt")} loading="lazy" />
            <figcaption>{t("fab.img3Caption")}</figcaption>
          </figure>
          <figure className="fb-shot">
            <img src={fabFrameId} alt={t("fab.img4Alt")} loading="lazy" />
            <figcaption>{t("fab.img4Caption")}</figcaption>
          </figure>
        </div>

        <div className="fb-features">
          {features.map((f) => (
            <div className={`fb-feat${f.premium ? " fb-feat-premium" : ""}`} key={f.t}>
              {f.badge && <span className="fb-feat-badge">{f.badge}</span>}
              <div className="fb-feat-icon">{f.icon}</div>
              <h4>{f.t}</h4>
              <p>{f.d}</p>
            </div>
          ))}
        </div>

        <div className="fb-grid">
          {makers.map((m) => (
            <div className="fb-card" key={m.name}>
              {m.logo && (
                <img
                  src={m.logo}
                  alt={`${m.name} logo`}
                  className={`fb-card-logo ${m.name === "Specter" ? "fb-card-logo--specter" : m.name === "Granville" ? "fb-card-logo--granville" : ""}`}
                  loading="lazy"
                />
              )}
              <div className="fb-name">{m.name}</div>
              <div className="fb-badges">
                {m.attrs.filter((a) => a !== "lak").map((a) => (
                  <span key={a} className={badgeMeta[a].cls}>{badgeMeta[a].label}</span>
                ))}
              </div>
              <div className="fb-cardsub">{m.sub}</div>
              {m.extra && (
                <div className="fb-card-extra">
                  {m.name === "Granville" ? <ShieldCheck size={13} color="#2ECC8A" /> : <Sparkles size={13} color="#2ECC8A" />}
                  <span>{m.extra}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="fb-flow">
          <div className="fb-zone fb-zone-dim fb-zone-border">
            <div className="fb-zone-tag">{t("fab.flowZone1Tag")}</div>
            <div className="fb-flow-step">
              <div className="fb-flow-icon"><Truck size={24} /></div>
              <div className="fb-flow-label">{t("fab.flowZone1Label")}</div>
              <h4 className="fb-flow-title">{t("fab.flowZone1Title")}</h4>
              <p className="fb-flow-body">{t("fab.flowZone1Body")}</p>
            </div>
            <span className="fb-zone-connector">{t("fab.flowConnector")}</span>
          </div>

          <div className="fb-zone fb-zone-primary">
            <div className="fb-zone-tag fb-zone-tag-green">{t("fab.flowZone2Tag")}</div>
            <div className="fb-flow-step">
              <div className="fb-flow-icon fb-flow-icon-lg"><ScanLine size={28} /></div>
              <div className="fb-flow-label">{t("fab.flowZone2Label")}</div>
              <h4 className="fb-flow-title fb-flow-title-lg">{t("fab.flowZone2Title")}</h4>
              <p className="fb-flow-body fb-flow-body-bright">{t("fab.flowZone2Body")}</p>
            </div>
            <div className="fb-zone-divider"><span className="fb-zone-badge">{t("fab.flowAuto")}</span></div>
          </div>

          <div className="fb-zone fb-zone-dim">
            <div className="fb-zone-tag">{t("fab.flowZone3Tag")}</div>
            <div className="fb-substeps">
              <div className="fb-substep">
                <div className="fb-flow-icon fb-flow-icon-sm"><Mail size={20} /></div>
                <div className="fb-flow-label fb-flow-label-sm">{t("fab.flowStep1Label")}</div>
                <h5 className="fb-substep-title">{t("fab.flowStep1Title")}</h5>
                <p className="fb-substep-body">{t("fab.flowStep1Body")}</p>
              </div>
              <div className="fb-substep">
                <div className="fb-flow-icon fb-flow-icon-sm"><CheckCircle2 size={20} /></div>
                <div className="fb-flow-label fb-flow-label-sm">{t("fab.flowStep2Label")}</div>
                <h5 className="fb-substep-title">{t("fab.flowStep2Title")}</h5>
                <p className="fb-substep-body">{t("fab.flowStep2Body")}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="fb-flow-closing">
          <span className="fb-flow-closing-dim">{t("fab.flowClosingDim")}</span>{" "}
          <span className="fb-flow-closing-green">{t("fab.flowClosingGreen")}</span>
        </div>

        <div className="fb-cta-card">
          <h3 className="fb-cta-title">{t("fab.ctaTitle")}</h3>
          <p className="fb-cta-body">{t("fab.ctaBody")}</p>
          <a href="mailto:info@velopass.com" className="fb-cta-btn">{t("fab.ctaBtn")}</a>
        </div>
      </div>
    </section>
  );
}

function Leasing() {
  const { t } = useTranslation("shop");
  const navy = "#0D1F3C";
  const green = "#2ECC8A";
  const muted = "#5A7090";
  const cream = "#F5F3EE";

  const problems = [
    t("leasing.problem1"),
    t("leasing.problem2"),
    t("leasing.problem3"),
  ];
  const solutions = [
    t("leasing.solution1"),
    t("leasing.solution2"),
    t("leasing.solution3"),
    t("leasing.solution4"),
  ];
  const scanItems: Array<{ icon: React.ReactNode; title: string; body: string }> = [
    { icon: <Building2 size={18} color={green} />,    title: t("leasing.scanItem1Title"), body: t("leasing.scanItem1Body") },
    { icon: <Wallet size={18} color={green} />,       title: t("leasing.scanItem2Title"), body: t("leasing.scanItem2Body") },
    { icon: <CalendarDays size={18} color={green} />, title: t("leasing.scanItem3Title"), body: t("leasing.scanItem3Body") },
    { icon: <ExternalLink size={18} color={green} />, title: t("leasing.scanItem4Title"), body: t("leasing.scanItem4Body") },
    { icon: <ClipboardList size={18} color={green} />,title: t("leasing.scanItem5Title"), body: t("leasing.scanItem5Body") },
  ];

  return (
    <section id="leasing" style={{ background: "#FFFFFF", padding: "96px 6vw" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: green, marginBottom: 14 }}>
          {t("leasing.eyebrow")}
        </p>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "clamp(28px, 3.6vw, 40px)", color: navy, lineHeight: 1.15, marginBottom: 16, maxWidth: 720 }}>
          {t("leasing.title")}
        </h2>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: muted, lineHeight: 1.65, maxWidth: 600, marginBottom: 48 }}>
          {t("leasing.sub")}
        </p>

        <div style={{ borderTop: "1px solid rgba(13,31,60,0.08)", borderBottom: "1px solid rgba(13,31,60,0.08)", padding: "24px 0", marginBottom: 48 }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: green, textAlign: "center", marginBottom: 10 }}>
            {t("leasing.logosLabel")}
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: muted, lineHeight: 1.6, maxWidth: 520, margin: "0 auto 20px", textAlign: "center" }}>
            {t("leasing.logosDesc")}
          </p>
          <div className="leasing-logos">
            <div className="logo-tile"><img src="https://cdn.prod.website-files.com/66538f2ad65b2084a18d9d09/668e8739b353377af0a24598_cyclis-300x112.png" alt="Cyclis" /></div>
            <div className="logo-tile"><img src={kbcLogo} alt="KBC" /></div>
            <div className="logo-tile"><img src="https://cdn.prod.website-files.com/66538f2ad65b2084a18d9d09/666c50aaf0e1ba5e869a3fc1_Logo_Joule.svg" alt="Joule" style={{ maxHeight: 24 }} /></div>
            <div className="logo-tile"><img src="https://cdn.prod.website-files.com/66538f2ad65b2084a18d9d09/66c317c971ffa1b69d08dab5_cycle%20valley%20logo%201.jpg" alt="Cycle Valley" /></div>
            <div className="logo-tile"><img src="https://hertlease.be/build/assets/logo-B0RsqD4r.png" alt="Hert Lease" style={{ maxHeight: 24 }} /></div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20, marginBottom: 56 }}>
          <div style={{ background: cream, borderLeft: "3px solid #E07A4F", borderRadius: 20, padding: 24 }}>
            <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, color: navy, marginBottom: 16 }}>
              {t("leasing.problemsTitle")}
            </h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
              {problems.map((p) => (
                <li key={p} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: muted, lineHeight: 1.55 }}>
                  <X size={16} color="#E07A4F" strokeWidth={2.4} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>

          <div style={{ background: "rgba(46,204,138,0.06)", borderLeft: `3px solid ${green}`, borderRadius: 20, padding: 24 }}>
            <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, color: navy, marginBottom: 16 }}>
              {t("leasing.solutionsTitle")}
            </h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
              {solutions.map((s) => (
                <li key={s} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: muted, lineHeight: 1.55 }}>
                  <CheckIcon size={16} color={green} strokeWidth={2.4} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "clamp(32px, 5vw, 64px)", alignItems: "center", marginBottom: 56 }}>
          <div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: green, marginBottom: 12 }}>
              {t("leasing.scanEyebrow")}
            </p>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 28, color: navy, marginBottom: 12, lineHeight: 1.2 }}>
              {t("leasing.scanTitle")}
            </h3>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: muted, marginBottom: 24, lineHeight: 1.65 }}>
              {t("leasing.scanSub")}
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
              {scanItems.map((it) => (
                <li key={it.title} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: navy, lineHeight: 1.5 }}>
                  <CheckIcon size={18} color={green} strokeWidth={2.4} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{it.title}</span>
                </li>
              ))}
            </ul>
          </div>

          <LeasingScanImage />
        </div>

        <div style={{ marginBottom: 56 }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: green, marginBottom: 12 }}>
            {t("leasing.howEyebrow")}
          </p>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 28, color: navy, marginBottom: 20, lineHeight: 1.2 }}>
            {t("leasing.howTitle")}
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#F5F3EE", borderLeft: "3px solid #D1D5DB", borderRadius: 8, padding: "12px 16px", marginBottom: 24 }}>
            <CheckCircle2 size={14} color="#6B7280" style={{ flexShrink: 0 }} />
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#6B7280", lineHeight: 1.5, margin: 0 }}>
              {t("leasing.howContext")}
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
            {[
              {
                n: "01",
                icon: <Sticker size={22} color={green} />,
                title: t("leasing.step1Title"),
                body: t("leasing.step1Body"),
                note: t("leasing.step1Note"),
                tag: t("leasing.stepTag"),
                variant: "action" as const,
              },
              {
                n: "02",
                icon: <Link2 size={22} color={green} />,
                title: t("leasing.step2Title"),
                body: t("leasing.step2Body"),
                tag: t("leasing.stepTag"),
                variant: "action" as const,
              },
            ].map((s) => {
              const isAction = s.variant === "action";
              return (
                <div
                  key={s.n}
                  style={{
                    background: isAction ? "rgba(46,204,138,0.06)" : "#F5F3EE",
                    borderRadius: 12,
                    borderLeft: isAction ? `3px solid ${green}` : "3px solid #D1D5DB",
                    padding: 24,
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                    position: "relative",
                  }}
                >
                  <span style={{ position: "absolute", top: 14, right: 16, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: isAction ? green : "#9CA3AF" }}>
                    {s.tag}
                  </span>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: isAction ? "rgba(46,204,138,0.15)" : "rgba(156,163,175,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 22, color: isAction ? navy : "#6B7280" }}>
                    {s.n}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {s.icon}
                    <h4 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 16, color: isAction ? navy : "#6B7280", margin: 0 }}>
                      {s.title}
                    </h4>
                  </div>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: isAction ? muted : "#6B7280", lineHeight: 1.6, margin: 0 }}>
                    {s.body}
                  </p>
                  {"note" in s && s.note && (
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontStyle: "italic", fontSize: 11, color: muted, margin: 0 }}>
                      {s.note}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 24, background: navy, borderRadius: 12, padding: "18px 22px", display: "flex", alignItems: "center", gap: 14 }}>
            <ScanLine size={22} color={green} style={{ flexShrink: 0 }} />
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#FFFFFF", lineHeight: 1.6, margin: 0 }}>
              {t("leasing.resultBannerPre")}{" "}
              <span style={{ color: green, fontWeight: 600 }}>{t("leasing.resultBannerHighlight")}</span>
            </p>
          </div>
        </div>

        <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontStyle: "italic", fontSize: 13, color: muted, lineHeight: 1.6, marginBottom: 18 }}>
            {t("leasing.ctaNote")}
          </p>
          <a href="#registreer" style={{ display: "inline-block", background: green, color: navy, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, padding: "14px 24px", borderRadius: 10, textDecoration: "none" }}>
            {t("leasing.ctaBtn")}
          </a>
        </div>
      </div>
    </section>
  );
}
