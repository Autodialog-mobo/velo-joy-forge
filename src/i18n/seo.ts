import { SUPPORTED_LANGS, isLang, DEFAULT_LANG, type Lang } from "./config";

export const SITE_URL = "https://velopass.com";

export type MetaEntry =
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string };

export type LinkEntry = {
  rel: string;
  href: string;
  hrefLang?: string;
};

export interface LocalizedHeadOptions {
  /** Path segment after the language prefix, no leading slash. Empty string = home. */
  path: string;
  /** Current language from route params (any unknown value falls back to DEFAULT_LANG). */
  lang: unknown;
  /** Page title (already localized). */
  title: string;
  /** Meta description (already localized). */
  description: string;
  /** Optional og:title override; defaults to `title`. */
  ogTitle?: string;
  /** Optional og:description override; defaults to `description`. */
  ogDescription?: string;
  /** Defaults to "website". */
  ogType?: "website" | "article" | "product";
  /**
   * When true: emit noindex,nofollow and SKIP canonical + hreflang.
   * Noindex pages should not advertise alternates.
   */
  noindex?: boolean;
  /** Extra meta tags appended after the defaults. */
  extraMeta?: MetaEntry[];
  /** Extra link tags appended after canonical + hreflang. */
  extraLinks?: LinkEntry[];
}

/**
 * Build a consistent head() block for any /$lang/* route.
 * Centralizes canonical + hreflang so all 14 routes stay in sync —
 * adding a new language (IT, ES, …) is a one-line change in SUPPORTED_LANGS.
 */
export function buildLocalizedHead(opts: LocalizedHeadOptions): {
  meta: MetaEntry[];
  links: LinkEntry[];
} {
  const lang: Lang = isLang(opts.lang) ? opts.lang : DEFAULT_LANG;
  const cleanPath = opts.path.replace(/^\/+|\/+$/g, "");
  const suffix = cleanPath ? `/${cleanPath}` : "";
  const canonical = `${SITE_URL}/${lang}${suffix}`;

  const ogTitle = opts.ogTitle ?? opts.title;
  const ogDescription = opts.ogDescription ?? opts.description;
  const ogType = opts.ogType ?? "website";

  const meta: MetaEntry[] = [
    { title: opts.title },
    { name: "description", content: opts.description },
    { property: "og:title", content: ogTitle },
    { property: "og:description", content: ogDescription },
    { property: "og:url", content: canonical },
    { property: "og:type", content: ogType },
  ];

  if (opts.noindex) {
    meta.push({ name: "robots", content: "noindex,nofollow" });
  }

  if (opts.extraMeta) meta.push(...opts.extraMeta);

  const links: LinkEntry[] = [];

  // Noindex pages: no canonical, no hreflang (we don't want them in the alternate cluster).
  if (!opts.noindex) {
    links.push({ rel: "canonical", href: canonical });
    for (const l of SUPPORTED_LANGS) {
      links.push({
        rel: "alternate",
        hrefLang: l,
        href: `${SITE_URL}/${l}${suffix}`,
      });
    }
    links.push({
      rel: "alternate",
      hrefLang: "x-default",
      href: `${SITE_URL}/${DEFAULT_LANG}${suffix}`,
    });
  }

  if (opts.extraLinks) links.push(...opts.extraLinks);

  return { meta, links };
}
