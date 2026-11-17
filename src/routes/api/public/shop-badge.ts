import { createFileRoute } from "@tanstack/react-router";
import { fetchBranding, type Branding } from "@/lib/shop-branding.server";

// Public, read-only, cosmetic proxy: returns only a shop's public name, city and logo URL. The API key stays server-side.
const cache = new Map<string, { at: number; body: Branding | null }>();
const CACHE_MS = 10 * 60 * 1000;

export const Route = createFileRoute("/api/public/shop-badge")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const shop = (new URL(request.url).searchParams.get("shop") ?? "").trim().toLowerCase();
        if (!/^[a-z0-9]{1,64}$/.test(shop)) return Response.json(null, { status: 400 });
        const hit = cache.get(shop);
        if (hit && Date.now() - hit.at < CACHE_MS) return Response.json(hit.body);
        const key = process.env.VELOPASS_BRANDING_API_KEY_LIVE;
        if (!key) return Response.json(null);
        let body: Branding | null = null;
        try { body = await fetchBranding(shop, key); } catch { body = null; }
        cache.set(shop, { at: Date.now(), body });
        return Response.json(body, { headers: { "Cache-Control": "public, max-age=600" } });
      },
    },
  },
});
