import { createFileRoute } from "@tanstack/react-router";

// Same-origin proxy for the active bike brands, so the browser never hits the
// cross-origin bikesearch API directly (avoids CORS). Adds a short in-memory
// server cache plus a Cache-Control header; the client caches per session too.

const BRANDS_API = "https://bikesearchapi.prod.velopass.com/api/brands";
const TTL_MS = 60 * 60 * 1000; // 1 hour

let cache: { at: number; body: string } | null = null;

export const Route = createFileRoute("/api/public/brands")({
  server: {
    handlers: {
      GET: async () => {
        const headers = {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=3600",
        };
        try {
          if (cache && Date.now() - cache.at < TTL_MS) {
            return new Response(cache.body, { status: 200, headers });
          }
          const upstream = await fetch(BRANDS_API, { headers: { Accept: "application/json" } });
          if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);
          const text = await upstream.text();
          // Validate it parses as a non-empty array before caching.
          const parsed = JSON.parse(text);
          if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("empty upstream");
          cache = { at: Date.now(), body: text };
          return new Response(text, { status: 200, headers });
        } catch (e) {
          // Serve stale cache if we have one; otherwise signal unavailable.
          if (cache) return new Response(cache.body, { status: 200, headers });
          console.error("brands proxy failed:", e instanceof Error ? e.message : e);
          return new Response(JSON.stringify({ error: "brands_unavailable" }), {
            status: 502,
            headers,
          });
        }
      },
    },
  },
});
