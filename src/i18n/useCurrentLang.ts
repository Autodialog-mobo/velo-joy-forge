import { useParams } from "@tanstack/react-router";
import { DEFAULT_LANG, isLang, type Lang } from "@/i18n/config";

/**
 * Read the current `$lang` URL param from anywhere in the React tree.
 * Falls back to DEFAULT_LANG when used outside the /$lang layout
 * (e.g. on /auth or admin routes) so shared components can render
 * stable, type-safe links without crashing.
 */
export function useCurrentLang(): Lang {
  const params = useParams({ strict: false }) as { lang?: string } | undefined;
  const candidate = params?.lang;
  return isLang(candidate) ? candidate : DEFAULT_LANG;
}
