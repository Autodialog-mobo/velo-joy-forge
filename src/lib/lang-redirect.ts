import { isLang, LANG_COOKIE, pickLangFromAcceptLanguage } from "@/i18n/config";

// Paths without a language prefix that redirect (302) to the visitor's language, keeping the query string.
const LANGLESS_PATHS: Record<string, string> = { "/order": "/order", "/order/thanks": "/order/thanks" };

export function langlessRedirectTarget(url: URL, cookieHeader: string | null, acceptLanguage: string | null): string | null {
  const path = LANGLESS_PATHS[url.pathname.replace(/\/+$/, "") || "/"];
  if (!path) return null;
  const m = (cookieHeader ?? "").match(new RegExp(`(?:^|; )${LANG_COOKIE}=([a-z]{2})`));
  const lang = m && isLang(m[1]) ? m[1] : pickLangFromAcceptLanguage(acceptLanguage);
  return `/${lang}${path}${url.search}`;
}
