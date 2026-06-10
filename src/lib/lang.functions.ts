import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import {
  DEFAULT_LANG,
  LANG_COOKIE,
  isLang,
  pickLangFromAcceptLanguage,
  type Lang,
} from "@/i18n/config";

/**
 * Detect the preferred language for the visitor.
 * Priority: vp_lang cookie > Accept-Language header > DEFAULT_LANG.
 * Runs on the server (used in root redirect's beforeLoad).
 */
export const detectLang = createServerFn({ method: "GET" }).handler(async (): Promise<Lang> => {
  const req = getRequest();
  const cookieHeader = req.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`(?:^|; )${LANG_COOKIE}=([a-z]{2})`));
  if (match && isLang(match[1])) return match[1];
  const accept = req.headers.get("accept-language");
  const picked = pickLangFromAcceptLanguage(accept);
  return picked ?? DEFAULT_LANG;
});

/**
 * Persist the visitor's language choice in a cookie (30 days).
 * Called by the language switcher.
 */
export const setLangCookie = createServerFn({ method: "POST" })
  .inputValidator((input: { lang: string }) => {
    if (!isLang(input.lang)) throw new Error("Invalid lang");
    return { lang: input.lang as Lang };
  })
  .handler(async ({ data }) => {
    const maxAge = 60 * 60 * 24 * 30; // 30 days
    const cookie = `${LANG_COOKIE}=${data.lang}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
    return new Response(null, {
      status: 204,
      headers: { "set-cookie": cookie },
    });
  });
