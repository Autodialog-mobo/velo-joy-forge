import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import { useTranslation } from "react-i18next";
import { useCurrentLang } from "@/i18n/useCurrentLang";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { QrCode, Hash, Barcode, CheckCircle2, AlertTriangle, Search, Loader2, ArrowUpRight, ArrowRight, XCircle, Copy, Check, User, Menu, X } from "lucide-react";
import { VelopassMark } from "@/components/VelopassMark";
import { QrScanDialog } from "@/components/QrScanDialog";
import { Footer } from "@/components/Footer";
import { LangSwitcher } from "@/components/LangSwitcher";
import { trackRegisterBikeClick } from "@/lib/analytics";
import { buildLocalizedHead } from "@/i18n/seo";
import { isLang } from "@/i18n/config";
import { checkBike, checkBikeByFrame, type BikeCheckResult } from "@/lib/bike-check.functions";
import BIKE_BRANDS from "@/data/bike-brands.json";
import { searchBrands, resolveCanonicalBrand } from "@/lib/brand-search";
import nlBikeCheck from "@/i18n/locales/nl/bike-check.json";
import enBikeCheck from "@/i18n/locales/en/bike-check.json";
import frBikeCheck from "@/i18n/locales/fr/bike-check.json";
import deBikeCheck from "@/i18n/locales/de/bike-check.json";
import velopassStickerAsset from "@/assets/velopass-sticker.png.asset.json";
import frameNumberAsset from "@/assets/frame-number.png.asset.json";

// Cloudflare Turnstile site key — real production key.
const TURNSTILE_SITE_KEY = "0x4AAAAAADkaXNe7SmFnETSM";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
      reset: (id?: string) => void;
      execute: (id?: string, opts?: Record<string, unknown>) => void;
      getResponse: (id?: string) => string | undefined;
    };
  }
}

export interface TurnstileHandle {
  /** Reset the widget and resolve with a fresh single-use token. */
  getFreshToken: () => Promise<string>;
}

// Detect preview/dev hosts where Turnstile sitekey isn't whitelisted.
// The server-side handler already skips captcha verification on these hosts,
// so we skip the widget entirely on the client to avoid error 110200.
function isPreviewHost(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname.toLowerCase();
  return (
    h === "localhost" ||
    h.startsWith("127.") ||
    h.includes("id-preview--") ||
    h.endsWith(".lovableproject.com") ||
    h.endsWith("-dev.lovable.app")
  );
}

// Single shared, invisible Turnstile widget in manual `execute` mode.
// Tokens are single-use and tied to a single siteverify call — we reset before
// every submission to avoid replaying a consumed token (which fails with
// `captcha_failed` on a second submit without a page refresh).
const TurnstileWidget = forwardRef<TurnstileHandle, { siteKey: string }>(function TurnstileWidget(
  { siteKey },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const pendingRef = useRef<{ resolve: (t: string) => void; reject: (e: Error) => void } | null>(null);
  const readyRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (isPreviewHost()) return;
    let cancelled = false;

    readyRef.current = new Promise<void>((resolve) => {
      const render = () => {
        if (cancelled || !window.turnstile || !containerRef.current || widgetIdRef.current) {
          if (widgetIdRef.current) resolve();
          return;
        }
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          size: "invisible",
          execution: "execute",
          callback: (token: string) => {
            pendingRef.current?.resolve(token);
            pendingRef.current = null;
          },
          "error-callback": () => {
            pendingRef.current?.reject(new Error("captcha_failed"));
            pendingRef.current = null;
          },
          "expired-callback": () => {
            if (widgetIdRef.current && window.turnstile) {
              try { window.turnstile.reset(widgetIdRef.current); } catch { /* ignore */ }
            }
          },
        });
        resolve();
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
    });
    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch { /* ignore */ }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey]);

  useImperativeHandle(ref, () => ({
    getFreshToken: async () => {
      if (isPreviewHost()) return "";
      await readyRef.current;

      if (!window.turnstile || !widgetIdRef.current) throw new Error("captcha_failed");
      // Always reset first so we never reuse a consumed token.
      try { window.turnstile.reset(widgetIdRef.current); } catch { /* ignore */ }
      return new Promise<string>((resolve, reject) => {
        pendingRef.current = { resolve, reject };
        try {
          window.turnstile!.execute(widgetIdRef.current!);
        } catch (e) {
          pendingRef.current = null;
          reject(e instanceof Error ? e : new Error("captcha_failed"));
        }
        // Safety timeout (15s) so the UI never hangs on a silent failure.
        setTimeout(() => {
          if (pendingRef.current) {
            pendingRef.current.reject(new Error("captcha_failed"));
            pendingRef.current = null;
          }
        }, 15_000);
      });
    },
  }), []);

  return <div ref={containerRef} />;
});


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
      onPaste={(e) => {
        // Forward paste from wrapper (when context menu targets the slot spans) into the hidden input.
        const text = e.clipboardData?.getData("text") ?? "";
        if (!text) return;
        e.preventDefault();
        inputRef.current?.focus();
        onChange(sanitize(text).slice(0, maxLength));
      }}
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
        onPaste={(e) => {
          const text = e.clipboardData?.getData("text") ?? "";
          if (!text) return;
          e.preventDefault();
          onChange(sanitize(text).slice(0, maxLength));
        }}
        onFocus={(e) => { setFocused(true); e.target.select(); }}
        onBlur={() => setFocused(false)}
        placeholder={showSlots ? undefined : placeholder}
        maxLength={maxLength}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          height: "100%",
          cursor: "text",
          // Keep input visible to the OS (no opacity:0) so the mobile paste
          // callout attaches, but make text/caret/background transparent so
          // the slot UI shows through.
          color: "transparent",
          caretColor: "transparent",
          WebkitTextFillColor: "transparent",
          background: "transparent",
          border: "none",
          outline: "none",
          padding: 0,
          margin: 0,
          font: "inherit",
          zIndex: 2,
        }}
      />

      {showSlots ? (
        <div style={{ display: "flex", width: "100%", gap: 4, pointerEvents: "none" }}>
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
        <span style={{ color: "#9CA3AF", fontSize: 15, fontFamily: "'DM Sans', sans-serif", pointerEvents: "none" }}>
          {placeholder}
        </span>
      )}

    </div>
  );
}

function ExampleCopy({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy?: (v: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const ta = document.createElement("textarea");
        ta.value = value;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      onCopy?.(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      onCopy?.(value);
    }
  };
  return (
    <p
      style={{
        marginTop: 8,
        marginBottom: 0,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 13,
        color: "#5A7090",
      }}
    >
      <span>{label}:</span>
      <span
        style={{
          fontFamily: "'DM Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
          fontWeight: 500,
          color: "#0D1F3C",
          background: "#F1F5F9",
          padding: "2px 6px",
          borderRadius: 6,
          letterSpacing: 0.4,
        }}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={`${label}: ${value}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          background: "transparent",
          border: "none",
          padding: 2,
          margin: 0,
          cursor: "pointer",
          color: copied ? "#16A34A" : "#5A7090",
          lineHeight: 0,
        }}
      >
        {copied ? <Check size={14} strokeWidth={2.2} /> : <Copy size={14} strokeWidth={2} />}
      </button>
    </p>
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

const ERROR_HINTS: Record<string, string> = {
  rate_limited: "Te veel pogingen — probeer over een minuut opnieuw.",
  captcha_failed: "Captcha-verificatie mislukt. Herlaad de pagina en probeer opnieuw.",
  server_misconfigured: "Server is niet correct geconfigureerd (ontbrekende API-sleutel).",
  brand_required: "Merk is verplicht.",
  frame_required: "Framenummer is verplicht.",
  code_required: "Velopass-code is verplicht.",
};

function formatBikeCheckError(e: unknown, t: TFn): string {
  const raw =
    e instanceof Error
      ? e.message
      : typeof e === "string"
        ? e
        : (e as { message?: string })?.message ?? "";
  if (!raw) return t("errors.generic");
  const key = raw.trim();
  if (ERROR_HINTS[key]) return `${t("errors.generic")} (${key}: ${ERROR_HINTS[key]})`;
  const upstream = key.match(/^upstream_error_(\d+)$/);
  if (upstream) {
    const status = upstream[1];
    return `${t("errors.generic")} (upstream HTTP ${status} — externe Velopass-API is niet bereikbaar)`;
  }
  return `${t("errors.generic")} (${key})`;
}

function BikeSearchPage() {
  const lang = useCurrentLang();
  const { t } = useTranslation(["bike-check", "common"]);
  const { t: tGuides } = useTranslation("guides");
  const runCheckBike = useServerFn(checkBike);
  const runCheckByFrame = useServerFn(checkBikeByFrame);

  const [codeA, setCodeA] = useState("");
  const [brand, setBrand] = useState("");
  const [frame, setFrame] = useState("");
  const turnstileRef = useRef<TurnstileHandle>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanFrameOpen, setScanFrameOpen] = useState(false);
  const frameInputRef = useRef<HTMLInputElement>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [brandFocused, setBrandFocused] = useState(false);
  const [brandQuery, setBrandQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(-1);

  // Debounce filter (~120ms) — enough to keep input snappy on ~940 items.
  useEffect(() => {
    const id = setTimeout(() => setBrandQuery(brand), 120);
    return () => clearTimeout(id);
  }, [brand]);

  const brandSuggestions = (() => {
    const q = brandQuery.trim();
    if (!q) return [] as string[];
    return searchBrands(q, 10).map((s) => s.name);
  })();
  // +1 extra slot for the "Merk niet in de lijst / onbekend" option.
  const optionCount = brandSuggestions.length + 1;
  const UNKNOWN_VALUE = "Onbekend";

  useEffect(() => {
    setActiveIdx(-1);
  }, [brandQuery]);

  // Silence unused import warning — BIKE_BRANDS is referenced via brand-search.
  void BIKE_BRANDS;

  const sanitizeCode = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
  const findVelopassCode = (raw: string) => {
    const value = raw.trim();
    const codes: string[] = [];
    const add = (candidate: string | null | undefined) => {
      if (!candidate) return;
      const variants = new Set([candidate]);
      try { variants.add(decodeURIComponent(candidate)); } catch { /* keep original */ }
      for (const variant of variants) {
        const clean = variant.toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (clean.length === 10) codes.push(clean);
        for (const part of variant.split(/[^A-Za-z0-9]+/)) {
          const token = part.toUpperCase();
          if (/^[A-Z0-9]{10}$/.test(token)) codes.push(token);
        }
      }
    };

    const parseUrl = (input: string) => {
      try { return new URL(input); } catch { /* try without scheme below */ }
      try { return new URL(`https://${input}`); } catch { return null; }
    };

    const url = parseUrl(value);
    if (url) {
      const preferredParams = ["stickercode", "sticker_code", "code", "velopasscode", "frameid", "frame_id", "id"];
      for (const key of preferredParams) add(url.searchParams.get(key));
      if (codes[0]) return codes[0];

      url.searchParams.forEach((paramValue) => add(paramValue));
      if (codes[0]) return codes[0];

      const pathParts = [...url.pathname.split("/"), url.hash.replace(/^#/, "")].filter(Boolean).reverse();
      for (const part of pathParts) add(part);
      return codes[0] ?? "";
    }

    add(value);
    return codes[0] ?? sanitizeCode(value);
  };
  const sanitizeAlnum = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, "");

  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);
  const [result, setResult] = useState<BikeCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastMethod, setLastMethod] = useState<"a" | "b" | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  // Shared submit-lock: blocks both forms while Turnstile + server call are in flight.
  const submitLockRef = useRef(false);

  // Spotlight: na een (scan- of form-)submit dimmen we de rest van de
  // pagina en lichten het resultaatpaneel even op. Werkt identiek op
  // mobiel én desktop: backdrop is position:fixed, het resultaat zit op
  // z-index 60 (onder de nav op 250, boven de dim op 50). Dismiss zodra
  // de gebruiker interageert (klik, scroll, toetsenbord) of na 6s — zo
  // wordt het op desktop niet weggeflitst voordat het oog het opmerkt.
  const [spotlight, setSpotlight] = useState(false);
  useEffect(() => {
    if (!(result || error)) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
    setSpotlight(true);
    const dismiss = () => setSpotlight(false);
    const tid = setTimeout(dismiss, 6000);
    // Pas listeners toe ná de scroll-animatie, anders dismisst onze eigen
    // smooth-scroll het direct via het 'scroll' event.
    const lid = setTimeout(() => {
      window.addEventListener("pointerdown", dismiss, { once: true });
      window.addEventListener("keydown", dismiss, { once: true });
      window.addEventListener("wheel", dismiss, { once: true, passive: true });
      window.addEventListener("touchmove", dismiss, { once: true, passive: true });
    }, 800);
    return () => {
      clearTimeout(tid);
      clearTimeout(lid);
      window.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("keydown", dismiss);
      window.removeEventListener("wheel", dismiss);
      window.removeEventListener("touchmove", dismiss);
    };
  }, [result, error]);

  const runCheck = async (code: string) => {
    const clean = sanitizeCode(code);
    if (!clean || submitLockRef.current) return;
    submitLockRef.current = true;
    setError(null);
    setResult(null);
    setLoadingA(true);
    setLastMethod("a");
    try {
      // Always fetch a fresh, single-use Turnstile token immediately before
      // calling the server fn (tokens become invalid after one siteverify).
      const turnstileToken = await turnstileRef.current!.getFreshToken();
      const res = await runCheckBike({ data: { code: clean, turnstileToken, lang } });
      setResult(res);
    } catch (e) {
      console.error("[bike-check] code lookup failed", e);
      setError(formatBikeCheckError(e, t));
    } finally {
      setLoadingA(false);
      submitLockRef.current = false;
    }
  };

  const submitA = async (e: React.FormEvent) => {
    e.preventDefault();
    await runCheck(codeA);
  };

  const handleScanResult = (raw: string) => {
    const clean = findVelopassCode(raw);
    setCodeA(clean);
    if (clean.length === 10) void runCheck(clean);
  };

  const handleFrameScanResult = (raw: string) => {
    // Frame-nummer barcodes bevatten doorgaans alfanumerieke tekens (vaak
    // ook spaties of dashes). Strip alles dat geen [A-Z0-9] is. We zoeken
    // NIET automatisch — de gebruiker controleert het resultaat eerst,
    // want barcodes worden af en toe verkeerd gelezen.
    const cleaned = sanitizeAlnum(raw);
    if (!cleaned) return;
    setFrame(cleaned);
    // Focus + select zodat de gebruiker direct kan corrigeren als nodig.
    setTimeout(() => {
      const el = frameInputRef.current;
      if (el) {
        el.focus();
        try { el.setSelectionRange(0, el.value.length); } catch { /* no-op */ }
      }
    }, 60);
  };


  const submitB = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current) return;
    const cleanBrand = resolveCanonicalBrand(brand);
    const cleanFrame = sanitizeAlnum(frame);
    if (!cleanBrand || !cleanFrame) return;
    submitLockRef.current = true;
    setError(null);
    setResult(null);
    setLoadingB(true);
    setLastMethod("b");
    try {
      const turnstileToken = await turnstileRef.current!.getFreshToken();
      const res = await runCheckByFrame({
        data: { brand: cleanBrand, frameNumber: cleanFrame, turnstileToken, lang },
      });
      setResult(res);
    } catch (e) {
      console.error("[bike-check] frame lookup failed", e);
      setError(formatBikeCheckError(e, t));
    } finally {
      setLoadingB(false);
      submitLockRef.current = false;
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
        <ul id="primary-navigation" className={`nav-links${navOpen ? " open" : ""}`} onClick={() => setNavOpen(false)}>
          <li><a href={`/${lang}#wat-je-krijgt`}>{t("nav.what_you_get")}</a></li>
          <li><a href={`/${lang}#already-have-one`}>{t("nav.already_have_one")}</a></li>
          <li><a href={`/${lang}#order-sticker`}>{t("nav.order_sticker")}</a></li>
          <li><a href={`/${lang}#community`}>{t("nav.community")}</a></li>
          <li><Link to="/$lang/bike-check" params={{ lang }} search={{ lng: "nl-nl" }}>{t("nav.bike_check")}</Link></li>
          <li><Link to="/$lang/contact" params={{ lang }} search={{ type: "rider" }}>{t("common:nav.contact")}</Link></li>
          <li><Link to="/$lang/shop" params={{ lang }} style={{ color: "var(--green-mid)", display: "inline-flex", alignItems: "center", gap: 6 }}><ArrowUpRight size={15} strokeWidth={2.2} />{t("nav.for_professionals")}</Link></li>
        </ul>
        <div className="nav-actions" style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <LangSwitcher currentLang={lang} tone="light" />
          <a href="https://app.velopass.com" className="btn-login">
            <User size={14} strokeWidth={1.8} aria-hidden="true" />
            {t("nav.login")}
          </a>
          <button
            type="button"
            className="nav-toggle" aria-controls="primary-navigation" aria-haspopup="true"
            aria-label={t("nav.menu_label")}
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
            {navOpen ? (
              <X size={22} strokeWidth={2} aria-hidden="true" />
            ) : (
              <Menu size={22} strokeWidth={2} aria-hidden="true" />
            )}
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

            <figure style={refImgFigure}>

              <img
                src={velopassStickerAsset.url}
                alt={t("method_a.image_alt")}
                style={refImg}
                loading="lazy"
              />
              <figcaption style={refImgCaption}>{t("method_a.image_caption")}</figcaption>
            </figure>

            {/* PRIMARY ACTION: QR scan */}
            <button
              type="button"
              onClick={() => setScanOpen(true)}
              style={{
                marginTop: 4,
                width: "100%",
                background: "#0D1F3C",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "16px 20px",
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: 15,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "0 6px 18px rgba(13,31,60,0.16)",
              }}
            >
              <QrCode size={18} strokeWidth={2} /> {t("method_a.scan_cta")}
            </button>

            {/* SECONDARY FALLBACK: manual code entry */}
            <div
              aria-hidden="true"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                margin: "18px 0 14px",
                color: "#94A3B8",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: 0.6,
              }}
            >
              <span style={{ flex: 1, height: 1, background: "rgba(13,31,60,0.1)" }} />
              <span>{t("method_a.manual_fallback", { defaultValue: "of voer de code handmatig in" })}</span>
              <span style={{ flex: 1, height: 1, background: "rgba(13,31,60,0.1)" }} />
            </div>

            

            <SlotCodeInput
              id="bs-code"
              value={codeA}
              onChange={setCodeA}
              placeholder="UC9K4D3NCJ"
              maxLength={10}
              sanitize={sanitizeCode}
            />
            <ExampleCopy
              label={t("method_a.example_inline", { defaultValue: "10 tekens · voorbeeld" })}
              value="UC9K4D3NCJ"
              onCopy={(v) => setCodeA(sanitizeCode(v))}
            />


            {/* Turnstile widget is rendered once for the whole page (below). */}





            <button
              type="submit"
              disabled={loadingA || loadingB || !codeA}
              style={{
                ...navyBtn(loadingA || loadingB || !codeA),
                marginTop: 14,
                width: "100%",
                background: loadingA || loadingB || !codeA ? "#94A3B8" : "transparent",
                color: loadingA || loadingB || !codeA ? "#fff" : "#0D1F3C",
                border: loadingA || loadingB || !codeA ? "none" : "1.5px solid rgba(13,31,60,0.2)",
                fontWeight: 500,
                fontSize: 14,
              }}
            >
              {loadingA ? (
                <>
                  <Loader2 size={16} className="bs-spin" /> {t("method_a.loading")}
                </>
              ) : loadingB ? (
                <>
                  <Loader2 size={16} className="bs-spin" />
                </>
              ) : (
                t("method_b.check")
              )}
            </button>

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
                role="combobox"
                aria-expanded={brandFocused && optionCount > 0}
                aria-autocomplete="list"
                aria-controls="bs-brand-listbox"
                aria-activedescendant={activeIdx >= 0 ? `bs-brand-opt-${activeIdx}` : undefined}
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                onPaste={(e) => {
                  const text = e.clipboardData?.getData("text") ?? "";
                  if (!text) return;
                  e.preventDefault();
                  setBrand(text.replace(/\s+/g, " ").trim());
                  setBrandFocused(true);
                }}
                onFocus={() => setBrandFocused(true)}

                onBlur={() => setTimeout(() => {
                  setBrandFocused(false);
                  // Normalize to canonical on blur if the typed value is an alias or accent variant.
                  const canon = resolveCanonicalBrand(brand);
                  if (canon && canon !== brand && brand.trim()) setBrand(canon);
                }, 120)}
                onKeyDown={(e) => {
                  if (!brandFocused || optionCount === 0) return;
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActiveIdx((i) => (i + 1) % optionCount);
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActiveIdx((i) => (i <= 0 ? optionCount - 1 : i - 1));
                  } else if (e.key === "Enter") {
                    if (activeIdx >= 0) {
                      e.preventDefault();
                      if (activeIdx < brandSuggestions.length) {
                        setBrand(brandSuggestions[activeIdx]);
                      } else {
                        setBrand(UNKNOWN_VALUE);
                      }
                      setBrandFocused(false);
                    }
                  } else if (e.key === "Escape") {
                    setBrandFocused(false);
                  }
                }}
                placeholder={t("method_b.brand_placeholder")}
                style={inputStyle}
              />
              {brandFocused && optionCount > 0 && (
                <ul
                  id="bs-brand-listbox"
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
                    maxHeight: 320,
                    overflowY: "auto",
                  }}
                >
                  {brandSuggestions.map((b, i) => (
                    <li key={b} id={`bs-brand-opt-${i}`} role="option" aria-selected={activeIdx === i}>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setBrand(b);
                          setBrandFocused(false);
                        }}
                        onMouseEnter={() => setActiveIdx(i)}
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          padding: "8px 10px",
                          border: "none",
                          background: activeIdx === i ? "#f1f5f9" : "transparent",
                          borderRadius: 6,
                          cursor: "pointer",
                          fontSize: 15,
                          color: "#0F172A",
                        }}
                      >
                        {b}
                      </button>
                    </li>
                  ))}
                  <li
                    id={`bs-brand-opt-${brandSuggestions.length}`}
                    role="option"
                    aria-selected={activeIdx === brandSuggestions.length}
                    style={{
                      borderTop: brandSuggestions.length > 0 ? "1px solid #e2e8f0" : undefined,
                      marginTop: brandSuggestions.length > 0 ? 4 : 0,
                      paddingTop: brandSuggestions.length > 0 ? 4 : 0,
                    }}
                  >
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setBrand(UNKNOWN_VALUE);
                        setBrandFocused(false);
                      }}
                      onMouseEnter={() => setActiveIdx(brandSuggestions.length)}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "8px 10px",
                        border: "none",
                        background: activeIdx === brandSuggestions.length ? "#f1f5f9" : "transparent",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: 14,
                        color: "#5A7090",
                        fontStyle: "italic",
                      }}
                    >
                      Merk niet in de lijst / onbekend
                    </button>
                  </li>
                </ul>
              )}
            </div>

            <label style={{ ...labelStyle, marginTop: 18 }} htmlFor="bs-frame-scan">{t("method_b.frame_number")}</label>

            <figure style={refImgFigure}>
              <img
                src={frameNumberAsset.url}
                alt={t("method_b.image_alt")}
                style={refImg}
                loading="lazy"
              />
              <figcaption style={refImgCaption}>{t("method_b.image_caption")}</figcaption>
            </figure>

            {/* PRIMARY ACTION: barcode scan voor het framenummer */}
            <button
              id="bs-frame-scan"
              type="button"
              onClick={() => setScanFrameOpen(true)}
              style={{
                marginTop: 14,
                width: "100%",
                background: "#0D1F3C",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "14px 20px",
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: 15,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "0 6px 18px rgba(13,31,60,0.16)",
              }}
            >
              <Barcode size={18} strokeWidth={2} />
              {t("method_b.scan_cta", { defaultValue: "Scan de barcode" })}
            </button>

            {/* SECONDARY FALLBACK: handmatige invoer van het framenummer */}
            <div
              aria-hidden="true"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                margin: "18px 0 12px",
                color: "#94A3B8",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: 0.6,
              }}
            >
              <span style={{ flex: 1, height: 1, background: "rgba(13,31,60,0.1)" }} />
              <span>{t("method_b.scan_or_manual", { defaultValue: "of voer het framenummer handmatig in" })}</span>
              <span style={{ flex: 1, height: 1, background: "rgba(13,31,60,0.1)" }} />
            </div>

            
            <input
              ref={frameInputRef}
              id="bs-frame"
              type="text"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              value={frame}
              onChange={(e) => setFrame(sanitizeAlnum(e.target.value))}
              onPaste={(e) => {
                const text = e.clipboardData?.getData("text") ?? "";
                if (!text) return;
                e.preventDefault();
                setFrame(sanitizeAlnum(text));
              }}
              placeholder="WTU212C0774E"
              style={inputStyle}
            />
            <p
              style={{
                marginTop: 6,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                color: "#94A3B8",
                lineHeight: 1.4,
              }}
            >
              {t("method_b.frame_hint", { defaultValue: "Alfanumeriek, bijv. WTU212C0774E" })}
            </p>

            <button
              type="submit"
              disabled={loadingA || loadingB || !brand || !frame.trim()}
              style={navyBtn(loadingA || loadingB || !brand || !frame.trim())}
            >
              {loadingB ? (
                <>
                  <Loader2 size={16} className="bs-spin" /> {t("method_b.loading")}
                </>
              ) : loadingA ? (
                <>
                  <Loader2 size={16} className="bs-spin" />
                </>
              ) : (
                t("method_b.check")
              )}
            </button>
          </form>
        </div>

        {/* Single shared invisible Turnstile widget for both forms.
            Tokens are fetched on-demand per submit via the imperative ref,
            so each submission gets a fresh single-use token. */}
        <TurnstileWidget ref={turnstileRef} siteKey={TURNSTILE_SITE_KEY} />


        {/* ERROR + RESULT scroll target.
            scrollMarginTop houdt de top vrij van de sticky nav (mobiel + desktop),
            zodat scrollIntoView({block:"start"}) NOOIT het bovenste stuk van het
            resultaat onder de nav verbergt. zIndex + transition geven het paneel
            extra prominentie zodra `spotlight` aanstaat. */}
        <div
          ref={resultRef}
          style={{
            scrollMarginTop: "calc(env(safe-area-inset-top, 0px) + 96px)",
            position: "relative",
            zIndex: spotlight ? 60 : "auto",
            transition: "transform 240ms ease, filter 240ms ease",
            transform: spotlight && (result || error) ? "translateY(-2px)" : "none",
            filter: spotlight && (result || error)
              ? "drop-shadow(0 24px 48px rgba(13,31,60,0.28))"
              : "none",
          }}
        >
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
        </div>

        {/* Spotlight backdrop: dimt de rest van de pagina kort na een
            scan/submit zodat het oog naar het resultaat getrokken wordt.
            Tap of 3s timer dismisst het. pointer-events alleen tijdens dim. */}
        {spotlight && (result || error) && (() => {
          const status = result?.found
            ? result.status === "ALL_CLEAR"
              ? "secured"
              : result.status === "REPORTED"
                ? "reported"
                : "neutral"
            : result
              ? "not_registered"
              : "neutral";
          const tint =
            status === "secured"
              ? "rgba(46,204,138,0.55)"
              : status === "reported"
                ? "rgba(245,158,11,0.55)"
                : status === "not_registered"
                  ? "rgba(100,116,139,0.55)"
                  : "rgba(13,31,60,0.55)";
          return (
            <div
              onClick={() => setSpotlight(false)}
              aria-hidden="true"
              style={{
                position: "fixed",
                inset: 0,
                background: tint,
                backdropFilter: "blur(2px)",
                zIndex: 50,
                animation: "vp-bc-fade 240ms ease both",
                cursor: "pointer",
                transition: "background 240ms ease",
              }}
            />
          );
        })()}

        <style>{`@keyframes vp-bc-fade{from{opacity:0}to{opacity:1}}`}</style>
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
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#0D1F3C",
                  margin: "16px 0 12px",
                }}
              >
                {t("outcomes.reported_cta")}
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

      <section
        style={{
          maxWidth: 900,
          margin: "40px auto 0",
          padding: "0 6vw 64px",
        }}
      >
        <Link
          to="/$lang/guides/buying-second-hand"
          params={{ lang }}
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            padding: "18px 22px",
            borderRadius: 14,
            background: "color-mix(in srgb, var(--green) 8%, transparent)",
            border: "1px solid color-mix(in srgb, var(--green) 25%, transparent)",
            textDecoration: "none",
            color: "var(--navy)",
          }}
        >
          <div style={{ flex: "1 1 280px" }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "1.2px",
                textTransform: "uppercase",
                color: "var(--green)",
                margin: "0 0 4px",
              }}
            >
              {tGuides("buying_second_hand.eyebrow")}
            </p>
            <p
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: 18,
                fontWeight: 700,
                margin: 0,
                letterSpacing: "-0.3px",
              }}
            >
              {tGuides("buying_second_hand.title")}
            </p>
          </div>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--green)",
              whiteSpace: "nowrap",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {tGuides("buying_second_hand.cta_primary")}
            <ArrowRight size={15} strokeWidth={2} />
          </span>
        </Link>
      </section>

      <Footer />


      <style>{`
        .bs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        @media (max-width: 768px) { .bs-grid { grid-template-columns: 1fr; gap: 16px; } }
        .bs-secured-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 768px) { .bs-secured-grid { grid-template-columns: 1fr; } }
        .bs-card {
          background: #fff;
          border: 1px solid rgba(13,31,60,0.1);
          border-radius: 14px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        @media (max-width: 480px) {
          .bs-card { padding: 18px; border-radius: 12px; }
        }
        .bs-card-primary { border-top: 3px solid #2ECC8A; }
        .bs-spin { animation: bs-spin 0.8s linear infinite; }
        @keyframes bs-spin { to { transform: rotate(360deg); } }
      `}</style>


      <QrScanDialog open={scanOpen} onOpenChange={setScanOpen} onResult={handleScanResult} />
      <QrScanDialog
        open={scanFrameOpen}
        onOpenChange={setScanFrameOpen}
        onResult={handleFrameScanResult}
        scanMode="frame"
        labels={{
          title: t("method_b.scan_dialog_title", { defaultValue: "Scan de barcode op het frame" }),
          description: t("method_b.scan_dialog_desc", {
            defaultValue: "Richt je camera op de barcode-sticker met het framenummer op het frame van je fiets.",
          }),
        }}
      />
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
const refImgFigure: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  margin: "0 0 18px",
  padding: 10,
  background: "rgba(13,31,60,0.03)",
  border: "1px solid rgba(13,31,60,0.08)",
  borderRadius: 12,
  flexWrap: "wrap",
};
const refImg: React.CSSProperties = {
  width: 96,
  height: 96,
  objectFit: "cover",
  borderRadius: 8,
  flexShrink: 0,
  background: "#0D1F3C",
};
const refImgCaption: React.CSSProperties = {
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 13,
  color: "#5A7090",
  lineHeight: 1.45,
  flex: "1 1 140px",
  minWidth: 0,
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

type Country = "BE" | "NL" | "FR" | "DE";

const COUNTRY_CONFIGS: Record<Country, {
  primaryHref: string;
  primaryKey: string;
  secondary?: { kind: "link" | "text"; href?: string; key: string };
  noteKey: string;
}> = {
  BE: {
    primaryHref: "https://www.police-on-web.be",
    primaryKey: "result.reported_be_primary",
    secondary: { kind: "link", href: "https://www.politie.be/nl", key: "result.reported_be_secondary" },
    noteKey: "police_note_be",
  },
  NL: {
    primaryHref: "https://www.politie.nl/aangifte-of-melding-doen",
    primaryKey: "result.reported_nl_primary",
    secondary: { kind: "text", key: "result.reported_nl_note" },
    noteKey: "police_note_nl",
  },
  FR: {
    primaryHref: "https://www.pre-plainte-en-ligne.gouv.fr",
    primaryKey: "result.reported_fr_primary",
    noteKey: "police_note_fr",
  },
  DE: {
    primaryHref: "https://www.polizei.de/Polizei/DE/Einrichtungen/Onlinewache/onlinewache_node.html",
    primaryKey: "result.reported_de_primary",
    noteKey: "police_note_de",
  },
};

const COUNTRY_LABELS: Record<Country, string> = {
  BE: "België",
  NL: "Nederland",
  FR: "France",
  DE: "Deutschland",
};

function ReportedCard({ t, bike }: { t: TFn; bike: BikeCheckResult }) {
  const serverCountry = (bike.country ?? "BE") as Country;
  const [country, setCountry] = useState<Country>(serverCountry);
  const [showPicker, setShowPicker] = useState(false);

  const cfg = COUNTRY_CONFIGS[country];

  const outlinedBtn = {
    background: "transparent",
    color: "#0D1F3C",
    border: "1.5px solid #0D1F3C",
    padding: "12px 20px",
    borderRadius: 10,
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 500,
    fontFamily: "'DM Sans', sans-serif",
    display: "inline-block",
  } as const;

  return (
    <div style={resultCard("#F59E0B")}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ ...badgeBase, background: "#F59E0B", color: "#0D1F3C" }}>{t("status_cards.reported.badge")}</span>
        <AlertTriangle color="#F59E0B" size={24} style={{ marginLeft: 4 }} />
      </div>
      <h3 style={resultTitle}>{t("result.reported_title")}</h3>
      <p style={resultBody}>{t("result.reported_body")}</p>
      <BikeDetails t={t} bike={bike} />

      {/* Owner contact — primary, warm */}
      {bike.lostReportUrl && (
        <>
          <div style={{ marginBottom: 20 }}>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                color: "#5A7090",
                lineHeight: 1.6,
                margin: "0 0 10px",
              }}
            >
              {t("result.contact_owner_note")}
            </p>
            <a
              href={bike.lostReportUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: "#0D1F3C",
                color: "#fff",
                padding: "12px 20px",
                borderRadius: 10,
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 500,
                fontFamily: "'DM Sans', sans-serif",
                display: "inline-block",
              }}
            >
              {t("result.contact_owner")}
            </a>
          </div>
          <div style={{ height: 1, background: "rgba(13,31,60,0.1)", margin: "0 0 20px" }} />
        </>
      )}

      {/* Police referral — secondary, formal */}
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
        {t(cfg.noteKey)}
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <a href={cfg.primaryHref} target="_blank" rel="noopener" style={outlinedBtn}>
          {t(cfg.primaryKey)}
        </a>
      </div>
      {cfg.secondary && (
        cfg.secondary.kind === "link" ? (
          <a
            href={cfg.secondary.href}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#5A7090", fontWeight: 500, textDecoration: "underline", fontSize: 14, marginTop: 10, display: "inline-block", fontFamily: "'DM Sans', sans-serif" }}
          >
            {t(cfg.secondary.key)}
          </a>
        ) : (
          <span style={{ color: "#5A7090", fontWeight: 500, fontSize: 14, marginTop: 10, display: "inline-block", fontFamily: "'DM Sans', sans-serif" }}>
            {t(cfg.secondary.key)}
          </span>
        )
      )}
      <div style={{ marginTop: 16, fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>
        {!showPicker ? (
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            style={{
              background: "transparent",
              border: "none",
              padding: 0,
              color: "#5A7090",
              textDecoration: "underline",
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
            }}
          >
            {t("result.switch_country")}
          </button>
        ) : (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <label htmlFor="bs-country" style={{ color: "#5A7090" }}>{t("result.country_label")}</label>
            <select
              id="bs-country"
              value={country}
              onChange={(e) => setCountry(e.target.value as Country)}
              style={{
                background: "#fff",
                border: "1px solid rgba(13,31,60,0.2)",
                borderRadius: 8,
                padding: "6px 10px",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                color: "#0D1F3C",
              }}
            >
              {(Object.keys(COUNTRY_CONFIGS) as Country[]).map((c) => (
                <option key={c} value={c}>{COUNTRY_LABELS[c]}</option>
              ))}
            </select>
          </div>
        )}
      </div>
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
