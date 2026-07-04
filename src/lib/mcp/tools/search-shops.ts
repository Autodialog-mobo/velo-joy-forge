import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getActiveShops } from "@/lib/active-shop-count";

export default defineTool({
  name: "search_shops",
  title: "Search Velopass shops",
  description:
    "Search the public Velopass partner shop list. Filter by free-text query (matches name, address, city), country code (BE, FR, NL, LU, DE, ...), or brand. Returns up to `limit` shops (default 20, max 100) and the total match count.",
  inputSchema: {
    query: z.string().trim().optional().describe("Free-text match against shop name, address or city."),
    country: z.string().length(2).optional().describe("ISO country code, e.g. FR, BE, NL."),
    brand: z.string().trim().optional().describe("Brand name the shop sells (case-insensitive)."),
    limit: z.number().int().min(1).max(100).optional().describe("Max shops to return (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ query, country, brand, limit }) => {
    const q = query?.toLowerCase();
    const c = country?.toUpperCase();
    const b = brand?.toLowerCase();
    const max = limit ?? 20;

    const all = getActiveShops();
    const matches = all.filter((s) => {
      if (c && s.country?.toUpperCase() !== c) return false;
      if (b && !(s.brands ?? []).some((x) => x.toLowerCase() === b)) return false;
      if (q) {
        const hay = `${s.name} ${s.address} ${s.city}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const items = matches.slice(0, max).map((s) => ({
      name: s.name,
      address: s.address,
      city: s.city,
      country: s.country,
      brands: s.brands ?? [],
      lat: s.lat,
      lng: s.lng,
    }));

    return {
      content: [
        {
          type: "text",
          text: `Found ${matches.length} shop(s) (returning ${items.length}).`,
        },
      ],
      structuredContent: { total: matches.length, returned: items.length, shops: items },
    };
  },
});
