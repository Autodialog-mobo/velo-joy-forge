import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://velopass.com";

interface SitemapEntry {
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

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const urls = ENTRIES.map(
          (e) =>
            `  <url>\n    <loc>${BASE_URL}${e.path}</loc>${e.changefreq ? `\n    <changefreq>${e.changefreq}</changefreq>` : ""}${e.priority ? `\n    <priority>${e.priority}</priority>` : ""}\n  </url>`,
        ).join("\n");
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
