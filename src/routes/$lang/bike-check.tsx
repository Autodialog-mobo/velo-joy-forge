import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCurrentLang } from "@/i18n/useCurrentLang";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { QrCode, Hash, CheckCircle2, AlertTriangle, Search, Loader2, ArrowUpRight, XCircle } from "lucide-react";
import { VelopassMark } from "@/components/VelopassMark";
import { QrScanDialog } from "@/components/QrScanDialog";
import { Footer } from "@/components/Footer";
import { LangSwitcher } from "@/components/LangSwitcher";
import { trackRegisterBikeClick } from "@/lib/analytics";
import { buildLocalizedHead } from "@/i18n/seo";
import { isLang } from "@/i18n/config";
import { checkBike, checkBikeByFrame, type BikeCheckResult } from "@/lib/bike-check.functions";
import BIKE_BRANDS from "@/data/bike-brands.json";
import nlBikeCheck from "@/i18n/locales/nl/bike-check.json";
import enBikeCheck from "@/i18n/locales/en/bike-check.json";
import frBikeCheck from "@/i18n/locales/fr/bike-check.json";
import deBikeCheck from "@/i18n/locales/de/bike-check.json";

// Cloudflare Turnstile site key — real production key.
const TURNSTILE_SITE_KEY = "0x4AAAAAADkaXNe7SmFnETSM";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
      reset: (id?: string) => void;
    };
  }
}

function TurnstileWidget({ siteKey, onToken }: { siteKey: string; onToken: (t: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    let cancelled = false;
    const render = () => {
      if (cancelled || !window.turnstile || !containerRef.current || widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        size: "invisible",
        callback: (token: string) => onTokenRef.current(token),
        "refresh-expired": "auto",
        "error-callback": () => onTokenRef.current(""),
        "expired-callback": () => onTokenRef.current(""),
      });
    };
    if (window.turnstile) {
      render();
    } else {
      const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      let script = document.querySelector<HTMLScriptElement>(`script[src^="${SRC}"]`);
      if (!script) {
        script = document.createElement("script");
        script.src = SRC;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", render);
    }
    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch { /* ignore */ }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey]);

  return <div ref={containerRef} />;
}

function SlotCodeInput({
  value,
  onChange,
  maxLength = 10,
  placeholder,
  sanitize,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  placeholder?: string;
  sanitize: (v: string) => string;
  id?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  const showSlots = value.length > 0 || focused;

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      style={{
        ...inputStyle,
        display: "flex",
        alignItems: "center",
        gap: 4,
        cursor: "text",
        position: "relative",
        minHeight: 46,
        overflow: "hidden",
      }}
    >
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="text"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(sanitize(e.target.value))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={showSlots ? undefined : placeholder}
        maxLength={maxLength}
        style={{
          position: "absolute",
          opacity: 0,
          pointerEvents: "none",
          left: 0,
          top: 0,
          width: "100%",
          height: "100%",
        }}
      />
      {showSlots ? (
        <div style={{ display: "flex", width: "100%", gap: 4 }}>
          {Array.from({ length: maxLength }).map((_, i) => (
            <span
              key={i}
              style={{
                flex: 1,
                textAlign: "center",
                fontSize: 15,
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: i < value.length ? 500 : 400,
                color: i < value.length ? "#0D1F3C" : "#CBD5E1",
                borderBottom: `2px solid ${i < value.length ? "#0D1F3C" : "#E2E8F0"}`,
                paddingBottom: 2,
                minWidth: 0,
                transition: "all 0.15s ease",
              }}
            >
              {i < value.length ? value[i] : "_"}
            </span>
          ))}
        </div>
      ) : (
        <span style={{ color: "#9CA3AF", fontSize: 15, fontFamily: "'DM Sans', sans-serif" }}>
          {placeholder}
        </span>
      )}
    </div>
  );
}


const BIKE_CHECK_META = {
  nl: nlBikeCheck.meta,
  en: enBikeCheck.meta,
  fr: frBikeCheck.meta,
  de: deBikeCheck.meta,
} as const;

export const Route = createFileRoute("/$lang/bike-check")({
  head: ({ params }) => {
    const lang = isLang(params.lang) ? params.lang : "en";
    const m = BIKE_CHECK_META[lang];
    return buildLocalizedHead({
      lang,
      path: "bike-check",
      title: m.title,
      description: m.description,
      ogDescription: m.ogDescription,
    });
  },
  component: BikeSearchPage,
});


type TFn = ReturnType<typeof useTranslation>["t"];

function BikeSearchPage() {
  const lang = useCurrentLang();
  const { t } = useTranslation(["bike-check", "common"]);
  const runCheckBike = useServerFn(checkBike);
  const runCheckByFrame = useServerFn(checkBikeByFrame);

  const [codeA, setCodeA] = useState("");
  const [brand, setBrand] = useState("");
  const [frame, setFrame] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [brandFocused, setBrandFocused] = useState(false);
  const brandSuggestions = (() => {
    const q = brand.trim().toLowerCase();
    if (!q) return [] as string[];
    return (BIKE_BRANDS as string[])
      .filter((b) => b.toLowerCase().includes(q) && b.toLowerCase() !== q)
      .slice(0, 8);
  })();

  const sanitizeCode = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
  const sanitizeAlnum = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, "");

  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);
  const [result, setResult] = useState<BikeCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastMethod, setLastMethod] = useState<"a" | "b" | null>(null);

  const runCheck = async (code: string) => {
    const clean = sanitizeCode(code);
    if (!clean) return;


    setError(null);
    setResult(null);
    setLoadingA(true);
    setLastMethod("a");
    try {
      const res = await runCheckBike({ data: { code: clean, turnstileToken } });
      setResult(res);
    } catch {
      setError(t("errors.generic"));
    } finally {
      setLoadingA(false);
    }
  };

  const submitA = async (e: React.FormEvent) => {
    e.preventDefault();
    await runCheck(codeA);
  };

  const handleScanResult = (raw: string) => {
    const clean = sanitizeCode(raw);
    setCodeA(clean);
    void runCheck(clean);
  };

  const submitB = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanBrand = brand.trim();
    const cleanFrame = sanitizeAlnum(frame);
    if (!cleanBrand || !cleanFrame) return;
    setError(null);
    setResult(null);
    setLoadingB(true);
    setLastMethod("b");
    try {
      const res = await runCheckByFrame({
        data: { brand: cleanBrand, frameNumber: cleanFrame, turnstileToken },
      });
      setResult(res);
    } catch {
      setError(t("errors.generic"));
    } finally {
      setLoadingB(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F5F3EE", display: "flex", flexDirection: "column" }}>
      <div className={`nav-backdrop${navOpen ? " open" : ""}`} onClick={() => setNavOpen(false)} aria-hidden="true" />
      <nav className="vp-nav">
        <a href={`/${lang}`} className="nav-logo">
          <div className="logo-mark"><VelopassMark /></div>
          <span className="logo-text">velopass</span>
        </a>
        <ul className={`nav-links${navOpen ? " open" : ""}`} onClick={() => setNavOpen(false)}>
          <li><a href={`/${lang}#wat-je-krijgt`}>{t("nav.what_you_get")}</a></li>
          <li><a href={`/${lang}#already-have-one`}>{t("nav.already_have_one")}</a></li>
          <li><a href={`/${lang}#order-sticker`}>{t("nav.order_sticker")}</a></li>
          <li><a href={`/${lang}#community`}>{t("nav.community")}</a></li>
          <li><Link to="/$lang/bike-check" params={{ lang }} search={{ lng: "nl-nl" }}>{t("nav.bike_check")}</Link></li>
          <li><Link to="/$lang/shop" params={{ lang }} style={{ color: "var(--green-mid)", display: "inline-flex", alignItems: "center", gap: 6 }}><ArrowUpRight size={15} strokeWidth={2.2} />{t("nav.for_professionals")}</Link></li>
        </ul>
        <div className="nav-actions" style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <LangSwitcher currentLang={lang} tone="light" />
          <a href="https://login.velopass.com/login?state=hKFo2SB5ODJtdjhZMGxXRGlPN1NVWFdQM3pqV3JUS1pFQTlkSaFupWxvZ2luo3RpZNkgM3R1ZXU4M2FxM3RqUk1FYVR3UUZCSTRhZV92dTlhRzmjY2lk2SBWak0xVFBUQUFFcG11aWhGNndYeEdGdVFybE5hVTY5MQ&client=VjM1TPTAAEpmuihF6wXxGFuQrlNaU691&protocol=oauth2&scope=openid%20profile%20email&audience=https%3A%2F%2Fcyclistapi.prod.velopass.com&redirect_uri=https%3A%2F%2Fapp.velopass.com%2Fdashboard&response_type=code&response_mode=query&nonce=a3hmZVl5aENNeU95d1U0SUlBaEM3NV9MbkZXNFdXRkg2c3RpOXJlMW5BUQ%3D%3D&code_challenge=5vSSWCjxdP-6B0z5HV38kaBGFWP4KSmv4gORKjvtzi0&code_challenge_method=S256&auth0Client=eyJuYW1lIjoiYXV0aDAtcmVhY3QiLCJ2ZXJzaW9uIjoiMi45LjAifQ%3D%3D#page=cyclist/login&method=standard&lng=nl-nl" className="btn-login">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M2 13c0-2.5 2.7-4 6-4s6 1.5 6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {t("nav.login")}
          </a>
          <button
            type="button"
            className="nav-toggle"
            aria-label={t("nav.menu_label")}
            aria-expanded={navOpen}
            onClick={() => setNavOpen((o) => !o)}
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
      <section style={{ padding: "88px 6vw 0", maxWidth: 1080, margin: "0 auto", width: "100%" }}>
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
          {t("page.back")}
        </button>
      </section>
      <section style={{ padding: "16px 6vw 16px", textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 500,
            fontSize: 11,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            color: "#2ECC8A",
            marginBottom: 10,
          }}
        >
          {t("page.eyebrow")}
        </div>
        <h1
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(28px, 4vw, 42px)",
            lineHeight: 1.1,
            color: "#0D1F3C",
            letterSpacing: "-1px",
            marginBottom: 12,
          }}
        >
          {t("page.title")}
        </h1>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 300,
            fontSize: 15,
            color: "#5A7090",
            maxWidth: 480,
            margin: "0 auto",
            lineHeight: 1.6,
          }}
        >
          {t("page.subtitle")}
        </p>
      </section>

      {/* METHODS */}
      <section style={{ padding: "12px 6vw 24px", maxWidth: 1080, margin: "0 auto", width: "100%" }}>
        <div className="bs-grid">
          {/* METHOD A */}
          <form onSubmit={submitA} className="bs-card bs-card-primary">
            <div style={{ marginBottom: 14 }}>
              <QrCode size={28} color="#2ECC8A" strokeWidth={1.8} />
            </div>
            <h2 style={cardTitle}>{t("method_a.title")}</h2>
            <p style={cardDesc}>{t("method_a.desc")}</p>

            <label style={labelStyle} htmlFor="bs-code">{t("method_a.code_label")}</label>
            <SlotCodeInput
              id="bs-code"
              value={codeA}
              onChange={setCodeA}
              placeholder="UC9K4D3NCJ"
              maxLength={10}
              sanitize={sanitizeCode}
            />

            {/* Cloudflare Turnstile (invisible) — token is verified server-side */}
            <div style={{ marginTop: 12 }}>
              <TurnstileWidget siteKey={TURNSTILE_SITE_KEY} onToken={setTurnstileToken} />
            </div>


            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
              <button
                type="button"
                onClick={() => setScanOpen(true)}
                style={{
                  background: "transparent",
                  color: "#0D1F3C",
                  border: "1.5px solid rgba(13,31,60,0.2)",
                  borderRadius: 10,
                  padding: "14px 20px",
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 500,
                  fontSize: 14,
                  cursor: "pointer",
                  flex: "1 1 180px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <QrCode size={16} strokeWidth={2} /> {t("method_a.scan_cta")}
              </button>
              <button
                type="submit"
                disabled={loadingA || !codeA}
                style={{ ...navyBtn(loadingA || !codeA), marginTop: 0, width: "auto", flex: "1 1 180px" }}
              >
                {loadingA ? (
                  <>
                    <Loader2 size={16} className="bs-spin" /> {t("method_b.loading")}
                  </>
                ) : (
                  t("method_b.check")
                )}
              </button>
            </div>
          </form>

          {/* METHOD B */}
          <form onSubmit={submitB} className="bs-card">
            <div style={{ marginBottom: 14 }}>
              <Hash size={28} color="#5A7090" strokeWidth={1.8} />
            </div>
            <h2 style={cardTitle}>{t("method_b.title")}</h2>
            <p style={cardDesc}>{t("method_b.desc")}</p>

            <label style={labelStyle} htmlFor="bs-brand">{t("method_b.brand")}</label>
            <div style={{ position: "relative" }}>
              <input
                id="bs-brand"
                type="text"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="off"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                onFocus={() => setBrandFocused(true)}
                onBlur={() => setTimeout(() => setBrandFocused(false), 120)}
                placeholder={t("method_b.brand_placeholder")}
                style={inputStyle}
              />
              {brandFocused && brandSuggestions.length > 0 && (
                <ul
                  role="listbox"
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    margin: "4px 0 0",
                    padding: 4,
                    listStyle: "none",
                    background: "#fff",
                    border: "1px solid #d6dde6",
                    borderRadius: 8,
                    boxShadow: "0 6px 20px rgba(15,23,42,0.08)",
                    zIndex: 20,
                    maxHeight: 280,
                    overflowY: "auto",
                  }}
                >
                  {brandSuggestions.map((b) => (
                    <li key={b}>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setBrand(b);
                          setBrandFocused(false);
                        }}
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          padding: "8px 10px",
                          border: "none",
                          background: "transparent",
                          borderRadius: 6,
                          cursor: "pointer",
                          fontSize: 15,
                          color: "#0F172A",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        {b}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <label style={{ ...labelStyle, marginTop: 12 }} htmlFor="bs-frame">{t("method_b.frame_number")}</label>
            <input
              id="bs-frame"
              type="text"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              value={frame}
              onChange={(e) => setFrame(sanitizeAlnum(e.target.value))}
              placeholder="WTU212C0774E"
              style={inputStyle}
            />

            {/* Cloudflare Turnstile (invisible) — token is verified server-side */}
            <div style={{ marginTop: 14 }}>
              <TurnstileWidget siteKey={TURNSTILE_SITE_KEY} onToken={setTurnstileToken} />
            </div>

            <button
              type="submit"
              disabled={loadingB || !brand || !frame.trim()}
              style={navyBtn(loadingB || !brand || !frame.trim())}
            >
              {loadingB ? (
                <>
                  <Loader2 size={16} className="bs-spin" /> {t("method_b.loading")}
                </>
              ) : (
                t("method_b.check")
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
            {!result.found && <NotRegCard t={t} />}
            {result.found && result.status === "ALL_CLEAR" && <SecuredCard t={t} bike={result} />}
            {result.found && result.status === "REPORTED" && <ReportedCard t={t} bike={result} />}
          </div>
        )}
      </section>

      {/* STATUS OVERVIEW */}
      <section style={{ padding: "48px 6vw", background: "#F5F3EE" }}>
        <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto 28px" }}>
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 500,
              fontSize: 11,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              color: "#2ECC8A",
              marginBottom: 10,
            }}
          >
            {t("status_overview.eyebrow")}
          </div>
          <h2
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(22px, 3vw, 28px)",
              color: "#0D1F3C",
              lineHeight: 1.15,
              marginBottom: 8,
            }}
          >
            {t("status_overview.title")}
          </h2>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              color: "#5A7090",
              lineHeight: 1.6,
              maxWidth: 480,
              margin: "0 auto",
            }}
          >
            {t("status_overview.subtitle")}
          </p>
        </div>

        {/* GROUP 1: SECURED container */}
        <div
          style={{
            background: "rgba(46,204,138,0.06)",
            border: "1px solid rgba(46,204,138,0.15)",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 500,
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 1,
              color: "#2ECC8A",
              marginBottom: 14,
            }}
          >
            <VelopassMark size={12} />
            <span>{t("status_overview.secured_group_label")}</span>
          </div>

          <div className="bs-secured-grid">
            {/* CARD 1: ALL CLEAR */}
            <div style={statusCardStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <CheckCircle2 size={20} color="#2ECC8A" />
                <span style={statusBadgeStyle("#2ECC8A")}>{t("status_cards.all_clear.badge")}</span>
              </div>
              <h3 style={statusTitleStyle}>{t("status_cards.all_clear.title")}</h3>
              <p style={statusBodyStyle}>
                {t("status_cards.all_clear.body")}
              </p>
            </div>

            {/* CARD 2: REPORTED */}
            <div style={statusCardStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <AlertTriangle size={20} color="#F59E0B" />
                <span style={statusBadgeStyle("#F59E0B")}>{t("status_cards.reported.badge")}</span>
              </div>
              <h3 style={statusTitleStyle}>{t("status_cards.reported.title")}</h3>
              <p style={statusBodyStyle}>
                {t("status_cards.reported.body")}
              </p>
            </div>
          </div>
        </div>

        {/* Divider with "of" */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            margin: "32px 0",
          }}
          aria-hidden="true"
        >
          <div style={{ flex: 1, height: 1, background: "rgba(13,31,60,0.1)" }} />
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              color: "#5A7090",
              fontStyle: "italic",
            }}
          >
            {t("status_overview.divider_or")}
          </span>
          <div style={{ flex: 1, height: 1, background: "rgba(13,31,60,0.1)" }} />
        </div>

        {/* GROUP 2: NOT SECURED container */}
        <div
          style={{
            background: "rgba(13,31,60,0.03)",
            border: "0.5px solid rgba(13,31,60,0.1)",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 500,
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 1,
              color: "#5A7090",
              marginBottom: 14,
            }}
          >
            <XCircle size={12} color="#5A7090" strokeWidth={1.8} />
            <span>{t("status_overview.not_secured_group_label")}</span>
          </div>

          {/* CARD 3: NOT REGISTERED */}
          <div style={{ ...statusCardStyle, borderLeft: "4px solid #CBD5E1" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Search size={20} color="#5A7090" />
              <span style={statusBadgeStyle("#F1F5F9")}>{t("status_cards.not_registered.badge")}</span>
            </div>
            <h3 style={statusTitleStyle}>{t("status_cards.not_registered.title")}</h3>
            <p style={statusBodyStyle}>
              {t("status_cards.not_registered.body")}
            </p>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                fontWeight: 500,
                color: "#0D1F3C",
                margin: "16px 0 12px",
              }}
            >
              {t("status_overview.is_this_your_bike")}
            </p>

            {lastMethod === "b" ? (
              <>
                <a
                  href="https://velopass.com/#order-sticker"
                  onClick={() => trackRegisterBikeClick("bikesearch", "status-info-order-frameid")}
                  style={{
                    background: "#2ECC8A",
                    color: "#0D1F3C",
                    padding: "12px 20px",
                    borderRadius: 10,
                    textDecoration: "none",
                    fontSize: 14,
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 500,
                    display: "inline-block",
                    alignSelf: "flex-start",
                    marginTop: 4,
                  }}
                >
                  {t("status_overview.order_frameid_cta")}
                </a>
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 12,
                    color: "#5A7090",
                    lineHeight: 1.6,
                    margin: "8px 0 0",
                  }}
                >
                  {t("status_overview.order_frameid_hint")}
                </p>
              </>
            ) : (
              <>
                <a
                  href={`/${lang}`}
                  onClick={() => trackRegisterBikeClick("bikesearch", "status-info-register-frameid")}
                  style={{
                    background: "#0D1F3C",
                    color: "#FFFFFF",
                    padding: "12px 20px",
                    borderRadius: 10,
                    textDecoration: "none",
                    fontSize: 14,
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 500,
                    display: "inline-block",
                    alignSelf: "flex-start",
                    marginTop: 4,
                  }}
                >
                  {t("status_overview.register_bike_cta")}
                </a>
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 12,
                    color: "#5A7090",
                    lineHeight: 1.6,
                    margin: "8px 0 0",
                  }}
                >
                  {t("status_overview.register_bike_hint")}
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      <Footer />

      <style>{`
        .bs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        @media (max-width: 768px) { .bs-grid { grid-template-columns: 1fr; } }
        .bs-secured-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 768px) { .bs-secured-grid { grid-template-columns: 1fr; } }
        .bs-card {
          background: #fff;
          border: 1px solid rgba(13,31,60,0.1);
          border-radius: 14px;
          padding: 24px;
          display: flex;
          flex-direction: column;
        }
        .bs-card-primary { border-top: 3px solid #2ECC8A; }
        .bs-spin { animation: bs-spin 0.8s linear infinite; }
        @keyframes bs-spin { to { transform: rotate(360deg); } }
      `}</style>

      <QrScanDialog open={scanOpen} onOpenChange={setScanOpen} onResult={handleScanResult} />
    </div>
  );
}

/* ---------- styles ---------- */
const cardTitle: React.CSSProperties = {
  fontFamily: "'Syne', sans-serif",
  fontWeight: 700,
  fontSize: 18,
  color: "#0D1F3C",
  letterSpacing: "-0.3px",
  marginBottom: 6,
};
const cardDesc: React.CSSProperties = {
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 14,
  color: "#5A7090",
  lineHeight: 1.55,
  marginBottom: 16,
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
const statusCardStyle: React.CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid rgba(13,31,60,0.1)",
  borderRadius: 12,
  padding: 20,
  display: "flex",
  flexDirection: "column",
  gap: 10,
};
const statusTitleStyle: React.CSSProperties = {
  fontFamily: "'Syne', sans-serif",
  fontWeight: 700,
  fontSize: 16,
  color: "#0D1F3C",
  margin: 0,
};
const statusBodyStyle: React.CSSProperties = {
  fontFamily: "'DM Sans', sans-serif",
  fontWeight: 400,
  fontSize: 14,
  color: "#5A7090",
  lineHeight: 1.7,
  margin: 0,
};
const statusBadgeStyle = (bg: string): React.CSSProperties => ({
  fontFamily: "'Syne', sans-serif",
  fontWeight: 700,
  fontSize: 11,
  textTransform: "uppercase",
  background: bg,
  color: "#0D1F3C",
  padding: "3px 12px",
  borderRadius: 100,
  letterSpacing: 0.5,
});
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

function BikeDetails({ t, bike }: { t: TFn; bike: BikeCheckResult }) {
  const unknown = t("bike_details.unknown");
  const rows: Array<[string, string]> = [
    [t("bike_details.brand"), bike.brand ?? unknown],
    [t("bike_details.model"), bike.model ?? unknown],
    [t("bike_details.color"), bike.primaryColor ?? unknown],
    [t("bike_details.type"), bike.bikeType ?? unknown],
    [t("bike_details.year"), bike.yearOfCreation ? String(bike.yearOfCreation) : unknown],
  ];
  return (
    <div
      style={{
        marginTop: 4,
        marginBottom: 20,
        background: "rgba(13,31,60,0.03)",
        border: "1px solid rgba(13,31,60,0.08)",
        borderRadius: 10,
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 500,
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: 1,
          color: "#5A7090",
          marginBottom: 10,
        }}
      >
        {t("bike_details.heading")}
      </div>
      <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 16, rowGap: 6, margin: 0, fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: "contents" }}>
            <dt style={{ color: "#5A7090" }}>{k}</dt>
            <dd style={{ margin: 0, color: "#0D1F3C", fontWeight: 500 }}>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function SecuredCard({ t, bike }: { t: TFn; bike: BikeCheckResult }) {
  return (
    <div style={resultCard("#2ECC8A")}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ ...badgeBase, background: "#2ECC8A", color: "#0D1F3C" }}>{t("status_cards.all_clear.badge")}</span>
        <CheckCircle2 color="#2ECC8A" size={24} />
      </div>
      <h3 style={resultTitle}>{t("result.secured_title")}</h3>
      <p style={resultBody}>{t("result.secured_body")}</p>
      <BikeDetails t={t} bike={bike} />
      <a
        href="https://app.velopass.com/dashboard"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "#2ECC8A", fontWeight: 500, textDecoration: "none", fontSize: 14 }}
      >
        {t("result.secured_cta")}
      </a>
    </div>
  );
}

function ReportedCard({ t, bike }: { t: TFn; bike: BikeCheckResult }) {
  return (
    <div style={resultCard("#F59E0B")}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ ...badgeBase, background: "#F59E0B", color: "#0D1F3C" }}>{t("status_cards.reported.badge")}</span>
        <AlertTriangle color="#F59E0B" size={24} style={{ marginLeft: 4 }} />
      </div>
      <h3 style={resultTitle}>{t("result.reported_title")}</h3>
      <p style={resultBody}>{t("result.reported_body")}</p>
      <BikeDetails t={t} bike={bike} />
      <p
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 14,
          color: "#9A3412",
          background: "#FEF3C7",
          border: "1px solid #FDE68A",
          padding: "10px 14px",
          borderRadius: 8,
          margin: "0 0 16px",
          lineHeight: 1.5,
        }}
      >
        {t("police_note")}
      </p>
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
          {t("result.reported_cta_primary")}
        </a>
        <a
          href="https://www.police-on-web.be"
          target="_blank"
          rel="noopener noreferrer"
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
          {t("result.reported_cta_police_web")}
        </a>
      </div>
      <a
        href="https://www.politie.be/nl"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: "#5A7090",
          fontWeight: 500,
          textDecoration: "underline",
          fontSize: 14,
          marginTop: 10,
          display: "inline-block",
        }}
      >
        {t("result.reported_cta_zone_finder")}
      </a>
    </div>
  );
}

function NotRegCard({ t }: { t: TFn }) {
  const lang = useCurrentLang();
  return (
    <div style={resultCard("#CBD5E1")}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ ...badgeBase, background: "#F1F5F9", color: "#0D1F3C" }}>{t("status_cards.not_registered.badge")}</span>
        <Search color="#5A7090" size={24} />
      </div>
      <h3 style={resultTitle}>{t("result.not_registered_title")}</h3>
      <p style={resultBody}>{t("result.not_registered_body")}</p>
      <a
        href={`/${lang}`}
        onClick={() => trackRegisterBikeClick("bikesearch", "search-result-not-registered")}
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
        {t("result.not_registered_cta")}
      </a>
    </div>
  );
}
