import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { SUPPORTED_LANGS } from "@/i18n/config";

const BASE_URL = "https://velopass.com";

interface SitemapEntry {
  /** Path WITHOUT a language prefix (e.g. "/order", "/" for home). */
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const ENTRIES: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/order", changefreq: "weekly", priority: "0.9" },
  { path: "/shop", changefreq: "weekly", priority: "0.8" },
  { path: "/bike-check", changefreq: "weekly", priority: "0.8" },
  { path: "/stolen", changefreq: "monthly", priority: "0.7" },
  { path: "/manufacturer", changefreq: "monthly", priority: "0.6" },
  { path: "/insurance", changefreq: "monthly", priority: "0.6" },
  { path: "/leasing", changefreq: "monthly", priority: "0.6" },
  { path: "/assistance", changefreq: "monthly", priority: "0.6" },
  { path: "/pro", changefreq: "monthly", priority: "0.6" },
  { path: "/contact", changefreq: "monthly", priority: "0.5" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
];

function entryUrl(lang: string, path: string): string {
  // Home "/" → /<lang>; other paths → /<lang>/<path>
  return path === "/" ? `${BASE_URL}/${lang}` : `${BASE_URL}/${lang}${path}`;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const urls: string[] = [];
        for (const e of ENTRIES) {
          for (const lang of SUPPORTED_LANGS) {
            const loc = entryUrl(lang, e.path);
            const alternates = SUPPORTED_LANGS
              .map(
                (l) =>
                  `    <xhtml:link rel="alternate" hreflang="${l}" href="${entryUrl(l, e.path)}"/>`,
              )
              .join("\n");
            const xDefault = `    <xhtml:link rel="alternate" hreflang="x-default" href="${entryUrl("en", e.path)}"/>`;
            urls.push(
              `  <url>\n    <loc>${loc}</loc>${
                e.changefreq ? `\n    <changefreq>${e.changefreq}</changefreq>` : ""
              }${e.priority ? `\n    <priority>${e.priority}</priority>` : ""}\n${alternates}\n${xDefault}\n  </url>`,
            );
          }
        }
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join("\n")}\n</urlset>\n`;
        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
