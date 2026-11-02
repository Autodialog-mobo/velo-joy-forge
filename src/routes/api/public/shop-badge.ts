import { createFileRoute } from "@tanstack/react-router";

// Server-side proxy for the Cyclist API co-branding lookup (avoids CORS).
// Public, read-only, cosmetic: returns only the shop's public name + logo URL.
const PROD = "https://cyclistapi.prod.velopass.com";
const STAGING = "https://cyclistapi.pre-prod.velopass.dev";
const cache = new Map<string, { at: number; body: unknown }>();
const CACHE_MS = 10 * 60 * 1000;

export const Route = createFileRoute("/api/public/shop-badge")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const shop = (url.searchParams.get("shop") ?? "").trim().toLowerCase();
        if (!/^[a-z0-9]{1,64}$/.test(shop)) return Response.json(null, { status: 400 });
        const host = url.hostname;
        const isProd = /(^|\.)velopass\.com$/.test(host) || host === "velo-joy-forge.lovable.app";
        const base = isProd ? PROD : STAGING;
        const key = `${base}|${shop}`;
        const hit = cache.get(key);
        if (hit && Date.now() - hit.at < CACHE_MS) return Response.json(hit.body);
        let body: { name: string; logoUrl?: string } | null = null;
        try {
          const res = await fetch(`${base}/api/co-branding?shopPublicId=${encodeURIComponent(shop)}`, {
            signal: AbortSignal.timeout(3000),
          });
          if (res.ok) {
            const d = (await res.json()) as { partnerName?: string; logoId?: string | null };
            const name = typeof d.partnerName === "string" ? d.partnerName.trim() : "";
            if (name) {
              body = { name };
              if (d.logoId && /^[0-9a-f-]{8,64}$/i.test(d.logoId)) {
                body.logoUrl = `${base}/api/assets/${d.logoId}/resolution/0`;
              }
            }
          }
        } catch {
          body = null;
        }
        cache.set(key, { at: Date.now(), body });
        return Response.json(body, { headers: { "Cache-Control": "public, max-age=600" } });
      },
    },
  },
});
