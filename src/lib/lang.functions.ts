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
  try {
    const req = getRequest();
    const cookieHeader = req.headers.get("cookie") ?? "";
    const match = cookieHeader.match(new RegExp(`(?:^|; )${LANG_COOKIE}=([a-z]{2})`));
    if (match && isLang(match[1])) return match[1];
    return pickLangFromAcceptLanguage(req.headers.get("accept-language"));
  } catch {
    return DEFAULT_LANG;
  }
});
