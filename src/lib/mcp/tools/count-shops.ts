import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getActiveShops } from "@/lib/active-shop-count";

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
    const shops = getActiveShops();
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
