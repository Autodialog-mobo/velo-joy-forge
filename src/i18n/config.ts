import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "./locales/en/common.json";
import enHome from "./locales/en/home.json";
import nlCommon from "./locales/nl/common.json";
import nlHome from "./locales/nl/home.json";
import frCommon from "./locales/fr/common.json";
import frHome from "./locales/fr/home.json";
import deCommon from "./locales/de/common.json";
import deHome from "./locales/de/home.json";

export const SUPPORTED_LANGS = ["en", "nl", "fr", "de"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];
export const DEFAULT_LANG: Lang = "en";
export const LANG_COOKIE = "vp_lang";

export const LANG_LABELS: Record<Lang, { label: string; flag: string }> = {
  en: { label: "English", flag: "🇬🇧" },
  nl: { label: "Nederlands", flag: "🇳🇱" },
  fr: { label: "Français", flag: "🇫🇷" },
  de: { label: "Deutsch", flag: "🇩🇪" },
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

const resources = {
  en: { common: enCommon, home: enHome },
  nl: { common: nlCommon, home: nlHome },
  fr: { common: frCommon, home: frHome },
  de: { common: deCommon, home: deHome },
};

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: DEFAULT_LANG,
    fallbackLng: DEFAULT_LANG,
    defaultNS: "common",
    ns: ["common", "home"],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export default i18n;
