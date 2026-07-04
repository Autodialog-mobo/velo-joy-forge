import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import shopsData from "@/data/shops.json";
import { dedupeShopsByAddress, type DedupeShop } from "@/lib/dedupe-shops";

type RawShop = DedupeShop & { status: string; country: string };

export default defineTool({
  name: "count_shops",
  title: "Count Velopass partner shops",
  description:
    "Returns the current number of active Velopass partner bike shops. Optionally break the count down per country.",
  inputSchema: {
    byCountry: z.boolean().optional().describe("If true, also return a per-country breakdown."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ byCountry }) => {
    const shops = dedupeShopsByAddress(shopsData as RawShop[]) as RawShop[];
    const total = shops.length;
    const perCountry: Record<string, number> = {};
    if (byCountry) {
      for (const s of shops) {
        const k = (s.country || "??").toUpperCase();
        perCountry[k] = (perCountry[k] ?? 0) + 1;
      }
    }
    return {
      content: [{ type: "text", text: `${total} active Velopass partner shops.` }],
      structuredContent: byCountry ? { total, perCountry } : { total },
    };
  },
});
