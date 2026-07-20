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

// Client-side mirror of the server-side CODE_PATTERNS registry.
// Kept in sync with src/lib/bike-check.functions.ts. Used for silent
// format confirmation while typing and for the "unknown format" hint on
// submit — the actual authoritative match happens server-side.
const CODE_PATTERNS: RegExp[] = [
  /^[A-Z0-9]{10}$/, // Velopass + FNUCI (FR) share the 10-char alphanumeric shape
];
function matchesAnyCodePattern(code: string): boolean {
  return CODE_PATTERNS.some((p) => p.test(code));
}

/**
 * QR-content URL registry. Each accredited operator's QR points at their
 * own domain; the domain identifies the operator, so no parallel search is
 * needed. Extraction returns the identifier only — the URL itself is NEVER
 * opened, followed, or shown to the user. QR stickers on bikes are physically
 * accessible and could be overplakt with a malicious QR (phishing).
 *
 * Add a new operator = one entry here + one server-side registry entry.
 */
type QrUrlPattern = { source: string; match: RegExp; group: number };
const QR_URL_PATTERNS: QrUrlPattern[] = [
  { source: "Velopass", match: /^https?:\/\/(?:www\.)?velopass\.com\/m\/([A-Za-z0-9_-]+)/i, group: 1 },
];

// Hosts we treat as "known Velopass QR" — any 10-char alphanumeric token found
// anywhere in the URL (path, query, hash) is accepted as a Velopass code.
// Real production stickers point at app.velopass.com/… with the code embedded
// in various shapes; we don't want to hard-code every path variant.
const VELOPASS_HOSTS = /(?:^|\.)velopass\.com$/i;

/**
 * Extract a bike identifier from raw QR content.
 * - Returns a normalized (uppercase, alnum) code when the QR is a known
 *   operator URL or a bare code that matches a client-side pattern.
 * - Returns null when the QR is neither — the caller renders a soft hint.
 * NEVER navigates to or opens the scanned URL.
 */
function extractCodeFromQr(raw: string): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;

  for (const p of QR_URL_PATTERNS) {
    const m = value.match(p.match);
    if (m && m[p.group]) {
      const clean = m[p.group].toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (clean.length >= 6) return clean;
    }
  }

  // Any URL on a Velopass-owned host: pull the first 10-char alnum token
  // out of the path / query / hash. The URL itself is never followed.
  const parseUrl = (input: string): URL | null => {
    try { return new URL(input); } catch { /* try below */ }
    try { return new URL(`https://${input}`); } catch { return null; }
  };
  const url = parseUrl(value);
  if (url && VELOPASS_HOSTS.test(url.hostname)) {
    const haystacks: string[] = [];
    url.searchParams.forEach((v) => haystacks.push(v));
    haystacks.push(url.pathname, url.hash);
    for (const h of haystacks) {
      try { haystacks.push(decodeURIComponent(h)); } catch { /* ignore */ }
    }
    for (const h of haystacks) {
      for (const part of h.split(/[^A-Za-z0-9]+/)) {
        const token = part.toUpperCase();
        if (/^[A-Z0-9]{10}$/.test(token)) return token;
      }
    }
  }

  // Bare code (no URL) — accept anything the client-side pattern registry
  // recognises so unknown-length codes still route through the normal flow.
  const bare = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (bare && matchesAnyCodePattern(bare)) return bare;

  return null;
}


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
  const { t } = useTranslation("bike-check");
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
  const copyLabel = copied
    ? t("method_a.example_copied", { defaultValue: "Voorbeeldcode gekopieerd" })
    : t("method_a.example_copy_aria", { defaultValue: "Kopieer voorbeeldcode {{value}}", value });
  return (
    <p
      role="note"
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
        aria-label={copyLabel}
        title={copyLabel}
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
        {copied ? <Check size={14} strokeWidth={2.2} aria-hidden="true" /> : <Copy size={14} strokeWidth={2} aria-hidden="true" />}
        <span style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 }}>
          {copyLabel}
        </span>
      </button>
    </p>
  );
}

import esBikeCheck from "@/i18n/locales/es/bike-check.json";
const BIKE_CHECK_META = {
  nl: nlBikeCheck.meta,
  en: enBikeCheck.meta,
  fr: frBikeCheck.meta,
  de: deBikeCheck.meta,
  es: esBikeCheck.meta,
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
  // Free-text input: users can type any brand even if not in suggestions.
  const optionCount = brandSuggestions.length;

  useEffect(() => {
    setActiveIdx(-1);
  }, [brandQuery]);

  // Silence unused import warning — BIKE_BRANDS is referenced via brand-search.
  void BIKE_BRANDS;

  const sanitizeCode = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 32);
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
  // How the last lookup was triggered. Drives which "not found" variant
  // we render: QR-scan → NOG NIET GEREGISTREERD (interim proxy for a
  // sticker that was issued but not activated); manual code / brand+frame
  // → NIET GEVONDEN (onbekende code, geen match in registers).
  const [lookupSource, setLookupSource] = useState<"qr" | "manual">("manual");
  const [formatRecognized, setFormatRecognized] = useState(false);
  const [unknownFormat, setUnknownFormat] = useState(false);
  // Which surface triggered the unknown-format hint — controls copy only.
  const [unknownFormatSource, setUnknownFormatSource] = useState<"manual" | "qr">("manual");
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);
  const brandInputRef = useRef<HTMLInputElement>(null);
  const methodBFormRef = useRef<HTMLFormElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  // Shared submit-lock: blocks both forms while Turnstile + server call are in flight.
  const submitLockRef = useRef(false);

  // Debounced silent format confirmation. Mirrors the server-side registry
  // (CODE_PATTERNS in src/lib/bike-check.functions.ts). We intentionally do
  // NOT name the matching operator — the user does not need to know which
  // register issued their code, and a wrong operator name would confuse.
  useEffect(() => {
    const clean = codeA.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!clean) { setFormatRecognized(false); return; }
    const id = setTimeout(() => {
      setFormatRecognized(matchesAnyCodePattern(clean));
    }, 300);
    return () => clearTimeout(id);
  }, [codeA]);

  // Reset the "unknown format" hint as soon as the user edits the field.
  useEffect(() => { setUnknownFormat(false); }, [codeA]);

  // Spotlight: na een handmatige submit dimmen we de rest van de pagina kort
  // en lichten het resultaatpaneel op. Na QR-scan doen we dit bewust niet:
  // de scan moet onmiddellijk "weg" voelen zodra het resultaat binnenkomt.
  const [spotlight, setSpotlight] = useState(false);
  useEffect(() => {
    if (!(result || error)) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
    setSpotlight(lookupSource !== "qr");
    const dismiss = () => setSpotlight(false);
    const tid = setTimeout(dismiss, 1800);
    // Pas listeners toe ná de scroll-animatie, anders dismisst onze eigen
    // smooth-scroll het direct via het 'scroll' event.
    const lid = setTimeout(() => {
      window.addEventListener("pointerdown", dismiss, { once: true });
      window.addEventListener("keydown", dismiss, { once: true });
      window.addEventListener("wheel", dismiss, { once: true, passive: true });
      window.addEventListener("touchmove", dismiss, { once: true, passive: true });
    }, 300);
    return () => {
      clearTimeout(tid);
      clearTimeout(lid);
      window.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("keydown", dismiss);
      window.removeEventListener("wheel", dismiss);
      window.removeEventListener("touchmove", dismiss);
    };
  }, [result, error, lookupSource]);

  // Lightbox: ESC closes the enlarged image view.
  useEffect(() => {
    if (!lightboxImage) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxImage(null);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [lightboxImage]);

  const runCheck = async (code: string, source: "qr" | "manual" = "manual") => {
    const clean = sanitizeCode(code);
    if (!clean || submitLockRef.current) return;
    submitLockRef.current = true;
    setError(null);
    setResult(null);
    setLoadingA(true);
    setLastMethod("a");
    setLookupSource(source);
    try {
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
    const clean = sanitizeCode(codeA);
    // Minimum length guard against empty / nutty queries.
    if (clean.length < 6) return;
    // Soft fallback: don't burn a Velopass/Turnstile call on codes we
    // already know match no known register. Show an informative hint
    // instead — never rendered as an error.
    if (!matchesAnyCodePattern(clean)) {
      setUnknownFormatSource("manual");
      setUnknownFormat(true);
      setError(null);
      setResult(null);
      return;
    }
    setUnknownFormat(false);
    await runCheck(clean, "manual");
  };

  const focusBrandFrame = () => {
    setUnknownFormat(false);
    methodBFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => brandInputRef.current?.focus(), 400);
  };

  const handleScanResult = (raw: string) => {
    // Route QR content through the URL/pattern registry. The scanned URL
    // is NEVER opened or followed — we only extract the identifier and
    // hand it to the same server lookup as manual input.
    const extracted = extractCodeFromQr(raw);
    if (extracted) {
      setUnknownFormat(false);
      setCodeA(extracted);
      void runCheck(extracted, "qr");
      return;
    }
    // Unknown QR — show the soft hint (not an error) and let the user
    // fall back to manual input or brand + frame search.
    setUnknownFormatSource("qr");
    setUnknownFormat(true);
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
    setLookupSource("manual");
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
        <Link to="/$lang" params={{ lang }} className="nav-logo">
          <div className="logo-mark"><VelopassMark /></div>
          <span className="logo-text">velopass</span>
        </Link>
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
      <section style={{ padding: "clamp(72px, 14vw, 88px) clamp(16px, 5vw, 32px) 0", maxWidth: 1080, margin: "0 auto", width: "100%" }}>
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
      <section style={{ padding: "16px clamp(16px, 5vw, 32px)", textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
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
            fontSize: "clamp(26px, 7vw, 42px)",
            lineHeight: 1.15,
            color: "#0D1F3C",
            letterSpacing: "-0.5px",
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
        <p
          style={{
            margin: "12px auto 0",
            maxWidth: 640,
            fontSize: 14,
            color: "rgba(15,23,42,0.7)",
            lineHeight: 1.6,
          }}
        >
          {t("page.no_email_hint", { defaultValue: "" })}
        </p>
      </section>

      {/* METHODS */}
      <section style={{ padding: "12px clamp(16px, 5vw, 32px) 24px", maxWidth: 1080, margin: "0 auto", width: "100%" }}>
        <div className="bs-grid">
          {/* METHOD A */}
          <form onSubmit={submitA} className="bs-card bs-card-primary">
            <div style={{ marginBottom: 14 }}>
              <QrCode size={28} color="#2ECC8A" strokeWidth={1.8} />
            </div>
            <h2 style={cardTitle}>{t("method_a.title")}</h2>
            <p style={{ margin: "-4px 0 6px", fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#5A7090" }}>
              {t("method_a.subtext", { defaultValue: "Velopass of een andere erkende operator" })}
            </p>
            <p style={cardDesc}>{t("method_a.desc")}</p>

            <label style={labelStyle} htmlFor="bs-code">{t("method_a.code_label")}</label>

            <figure style={refImgFigure}>

              <img
                src={velopassStickerAsset.url}
                alt={t("method_a.image_alt")}
                style={{ ...refImg, cursor: "pointer" }}
                loading="lazy"
                onClick={() => setLightboxImage({ src: velopassStickerAsset.url, alt: t("method_a.image_alt") })}
                role="button"
                aria-label={t("method_a.image_enlarge_aria", { defaultValue: "Klik om de afbeelding te vergroten" })}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setLightboxImage({ src: velopassStickerAsset.url, alt: t("method_a.image_alt") }); }}
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
              label={t("method_a.example_inline", { defaultValue: "bijvoorbeeld" })}
              value="UC9K4D3NCJ"
              onCopy={(v) => setCodeA(sanitizeCode(v))}
            />

            {/* Silent format confirmation — appears after ~300ms debounce.
                Deliberately NOT operator-specific: users don't need to
                know which register issued their code. */}
            {formatRecognized && !unknownFormat && (
              <p
                style={{
                  margin: "8px 0 0",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 12,
                  color: "#2ECC8A",
                }}
                aria-live="polite"
              >
                {t("method_a.format_confirmed", { defaultValue: "✓ Herkend als identificatiecode" })}
              </p>
            )}

            {/* Soft fallback when the entered code matches no known
                format at submit-time. Informational styling — not an
                error. Always offers the brand + frame escape hatch. */}
            {unknownFormat && (
              <div
                role="status"
                style={{
                  marginTop: 12,
                  padding: "12px 14px",
                  background: "#F1F5F9",
                  border: "1px solid rgba(13,31,60,0.08)",
                  borderRadius: 10,
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                  color: "#0D1F3C",
                  lineHeight: 1.5,
                }}
              >
                <p style={{ margin: 0 }}>
                  {unknownFormatSource === "qr"
                    ? t("method_a.unknown_qr_hint", {
                        defaultValue:
                          "Deze QR-code herkennen we niet als een fietsidentificatie. Zoek via de code op de sticker of via merk en framenummer.",
                      })
                    : t("method_a.unknown_format_hint", {
                        defaultValue:
                          "Dit codeformaat herkennen we nog niet. Controleer of je de volledige code hebt overgenomen, of zoek via merk en framenummer.",
                      })}
                </p>
                <button
                  type="button"
                  onClick={focusBrandFrame}
                  style={{
                    marginTop: 8,
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    color: "#0D1F3C",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  {t("method_a.switch_to_brand_frame", { defaultValue: "Zoek via merk en framenummer →" })}
                </button>
              </div>
            )}



            {/* Turnstile widget is rendered once for the whole page (below). */}





            {(() => {
              const codeTooShort = codeA.trim().length < 6;
              const btnDisabled = loadingA || loadingB || codeTooShort;
              return (
            <button
              type="submit"
              disabled={btnDisabled}
              style={{
                ...navyBtn(btnDisabled),
                marginTop: 14,
                width: "100%",
                background: btnDisabled ? "#E2E8F0" : "#0D1F3C",
                color: btnDisabled ? "#94A3B8" : "#fff",
                border: "none",
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
              );
            })()}

          </form>

          {/* METHOD B */}
          <form ref={methodBFormRef} onSubmit={submitB} className="bs-card">
            <div style={{ marginBottom: 14 }}>
              <Hash size={28} color="#5A7090" strokeWidth={1.8} />
            </div>
            <h2 style={cardTitle}>{t("method_b.title")}</h2>
            <p style={cardDesc}>{t("method_b.desc")}</p>



            <label style={labelStyle} htmlFor="bs-brand">{t("method_b.brand")}</label>
            <div style={{ position: "relative" }}>
              <input
                ref={brandInputRef}
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
                    if (activeIdx >= 0 && activeIdx < brandSuggestions.length) {
                      e.preventDefault();
                      setBrand(brandSuggestions[activeIdx]);
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
                </ul>
              )}
            </div>

            <label style={{ ...labelStyle, marginTop: 18 }} htmlFor="bs-frame-scan">{t("method_b.frame_number")}</label>

            <figure style={refImgFigure}>
              <img
                src={frameNumberAsset.url}
                alt={t("method_b.image_alt")}
                style={{ ...refImg, cursor: "pointer" }}
                loading="lazy"
                onClick={() => setLightboxImage({ src: frameNumberAsset.url, alt: t("method_b.image_alt") })}
                role="button"
                aria-label={t("method_b.image_enlarge_aria", { defaultValue: "Klik om de afbeelding te vergroten" })}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setLightboxImage({ src: frameNumberAsset.url, alt: t("method_b.image_alt") }); }}
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

        {/* Coverage / trust line — shown once below both search cards. */}
        <p
          style={{
            marginTop: 18,
            marginBottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 12.5,
            color: "#5A7090",
            textAlign: "center",
          }}
        >
          <Search size={13} strokeWidth={2} aria-hidden="true" />
          <span>{t("coverage_note", { defaultValue: "doorzoekt de Europese Velopass-database en gekoppelde nationale registers" })}</span>
        </p>


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
              {!result.found && lookupSource === "qr" && <NotRegCard t={t} />}
              {!result.found && lookupSource !== "qr" && <NotFoundCard t={t} />}
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
          // Tints are decorative status indicators (no text rendered on them),
          // but WCAG 1.4.11 still requires ≥3:1 vs the adjacent page/card
          // surface so the color-coded meaning is perceivable. Effective
          // colors over white reach ~3.3–4.3:1 at these values.
          const tint =
            status === "secured"
              ? "rgba(4,120,87,0.78)" // emerald-700
              : status === "reported"
                ? "rgba(194,65,12,0.78)" // orange-700
                : status === "not_registered"
                  ? "rgba(51,65,85,0.78)" // slate-700
                  : "rgba(15,23,42,0.7)"; // slate-900 fallback
          // Glyph mirrors the status as a non-color cue on the dim overlay,
          // so users with color-vision deficiencies still recognize the
          // outcome from the backdrop alone.
          const Glyph =
            status === "secured"
              ? CheckCircle2
              : status === "reported"
                ? AlertTriangle
                : status === "not_registered"
                  ? Search
                  : null;
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
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                paddingTop: "12vh",
              }}
            >
              {Glyph && (
                <Glyph
                  size={96}
                  color="#ffffff"
                  strokeWidth={1.6}
                  style={{
                    opacity: 0.92,
                    filter: "drop-shadow(0 2px 12px rgba(0,0,0,0.25))",
                  }}
                />
              )}
            </div>
          );
        })()}

        <style>{`@keyframes vp-bc-fade{from{opacity:0}to{opacity:1}}`}</style>
      </section>

      {/* STATUS OVERVIEW */}
      <section style={{ padding: "clamp(32px, 7vw, 48px) clamp(16px, 5vw, 32px)", background: "#F5F3EE" }}>
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
              fontSize: "clamp(20px, 5vw, 28px)",
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
          padding: "0 clamp(16px, 5vw, 32px) clamp(40px, 8vw, 64px)",
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

      {/* Lightbox: enlarge reference images on click */}
      {lightboxImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("common:close", { defaultValue: "Afbeelding sluiten" })}
          onClick={() => setLightboxImage(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(13,31,60,0.92)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            cursor: "pointer",
          }}
        >
          <button
            type="button"
            onClick={() => setLightboxImage(null)}
            aria-label={t("common:close", { defaultValue: "Sluiten" })}
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              background: "rgba(255,255,255,0.12)",
              border: "none",
              borderRadius: 50,
              width: 44,
              height: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#fff",
            }}
          >
            <X size={24} strokeWidth={2.5} />
          </button>
          <img
            src={lightboxImage.src}
            alt={lightboxImage.alt}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 192,
              height: 192,
              objectFit: "contain",
              borderRadius: 12,
              boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
              cursor: "default",
              background: "#0D1F3C",
            }}
          />
        </div>
      )}
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
const foundInBadge: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 12,
  fontWeight: 500,
  color: "#5A7090",
  background: "rgba(13,31,60,0.04)",
  border: "1px solid rgba(13,31,60,0.08)",
  borderRadius: 100,
  padding: "2px 10px",
};
// Border style is a redundant (non-color) status cue: solid = secured,
// dashed = reported/warning, dotted = not registered. Pairs with the
// status icon so users with color-vision deficiencies can still
// distinguish the three outcomes at a glance.
const resultCard = (
  color: string,
  borderStyle: "solid" | "dashed" | "dotted" = "solid",
): React.CSSProperties => ({
  background: "#fff",
  borderRadius: 14,
  border: "1px solid rgba(13,31,60,0.1)",
  borderLeftStyle: borderStyle,
  borderLeftWidth: 6,
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
    <div style={resultCard("#2ECC8A", "solid")}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ ...badgeBase, gap: 6, background: "#2ECC8A", color: "#0D1F3C" }}>
          <CheckCircle2 size={14} strokeWidth={2.5} aria-hidden="true" />
          {t("status_cards.all_clear.badge")}
        </span>
        {bike.source && (
          <span style={foundInBadge}>{t("result.found_in", { source: bike.source, defaultValue: "Gevonden in {{source}}" })}</span>
        )}
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
    <div style={resultCard("#F59E0B", "dashed")}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ ...badgeBase, gap: 6, background: "#F59E0B", color: "#0D1F3C" }}>
          <AlertTriangle size={14} strokeWidth={2.5} aria-hidden="true" />
          {t("status_cards.reported.badge")}
        </span>
        {bike.source && (
          <span style={foundInBadge}>{t("result.found_in", { source: bike.source, defaultValue: "Gevonden in {{source}}" })}</span>
        )}
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
    <div style={resultCard("#CBD5E1", "dotted")}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ ...badgeBase, gap: 6, background: "#F1F5F9", color: "#0D1F3C" }}>
          <Search size={14} strokeWidth={2.5} aria-hidden="true" />
          {t("status_cards.not_registered.badge")}
        </span>
      </div>
      <p style={resultBody}>{t("status_cards.not_registered.body")}</p>
      <p
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 14,
          fontWeight: 500,
          color: "#0D1F3C",
          margin: "8px 0 12px",
        }}
      >
        {t("status_overview.is_this_your_bike")}
      </p>
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
          alignSelf: "flex-start",
        }}
      >
        {t("status_overview.register_bike_cta")}
      </a>
    </div>
  );
}

function NotFoundCard({ t }: { t: TFn }) {
  return (
    <div style={resultCard("#CBD5E1", "dotted")}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ ...badgeBase, gap: 6, background: "#F1F5F9", color: "#0D1F3C" }}>
          <Search size={14} strokeWidth={2.5} aria-hidden="true" />
          {t("status_cards.not_found.badge")}
        </span>
      </div>
      <p style={resultBody}>{t("status_cards.not_found.body")}</p>
    </div>
  );
}
