import i18n from "i18next";
import { initReactI18next } from "react-i18next";

export const SUPPORTED_LANGS = ["en", "nl", "fr", "de", "es"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];
export const DEFAULT_LANG: Lang = "en";
export const LANG_COOKIE = "vp_lang";

export const LANG_LABELS: Record<Lang, { label: string; flag: string }> = {
  en: { label: "English", flag: "🇬🇧" },
  nl: { label: "Nederlands", flag: "🇳🇱" },
  fr: { label: "Français", flag: "🇫🇷" },
  de: { label: "Deutsch", flag: "🇩🇪" },
  es: { label: "Español", flag: "🇪🇸" },
};

export function isLang(value: unknown): value is Lang {
  return typeof value === "string" && (SUPPORTED_LANGS as readonly string[]).includes(value);
}

/**
 * Pick the best language from an Accept-Language header.
 * Falls back to DEFAULT_LANG when no supported match is found.
 */
export function pickLangFromAcceptLanguage(header: string | null | undefined): Lang {
  if (!header) return DEFAULT_LANG;
  const parts = header
    .split(",")
    .map((p) => {
      const [tag, q] = p.trim().split(";q=");
      return { tag: tag.toLowerCase(), q: q ? parseFloat(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { tag } of parts) {
    const base = tag.split("-")[0];
    if (isLang(base)) return base;
  }
  return DEFAULT_LANG;
}

/**
 * Auto-discover all JSON locale bundles via Vite's import.meta.glob.
 * Path shape: ./locales/<lang>/<namespace>.json
 * This avoids a manual import block — adding a new bundle is just
 * dropping the file in the right folder.
 */
const bundleModules = import.meta.glob("./locales/*/*.json", {
  eager: true,
}) as Record<string, { default: Record<string, unknown> }>;

type ResourceMap = Record<string, Record<string, Record<string, unknown>>>;
const resources: ResourceMap = {};
const untranslatedBundles: Record<string, string[]> = {};

for (const [path, mod] of Object.entries(bundleModules)) {
  const match = path.match(/\.\/locales\/([^/]+)\/([^/]+)\.json$/);
  if (!match) continue;
  const [, lang, ns] = match;
  if (!isLang(lang)) continue;
  const data = (mod.default ?? {}) as Record<string, unknown>;
  resources[lang] ??= {};
  resources[lang][ns] = data;
  if (data._translated === false) {
    untranslatedBundles[lang] ??= [];
    untranslatedBundles[lang].push(ns);
  }
}

export const ALL_NAMESPACES = Array.from(
  new Set(Object.values(resources).flatMap((r) => Object.keys(r))),
).sort();

if (import.meta.env?.DEV && typeof window !== "undefined") {
  for (const [lang, list] of Object.entries(untranslatedBundles)) {
    if (list.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `[i18n] ${list.length} bundle(s) untranslated for "${lang}": ${list.join(", ")}`,
      );
    }
  }
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: resources as never,
    lng: DEFAULT_LANG,
    fallbackLng: DEFAULT_LANG,
    defaultNS: "common",
    ns: ALL_NAMESPACES,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export default i18n;
