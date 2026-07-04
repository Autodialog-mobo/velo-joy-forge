import { defineMcp } from "@lovable.dev/mcp-js";
import searchShops from "./tools/search-shops";
import countShops from "./tools/count-shops";

export default defineMcp({
  name: "velopass-mcp",
  title: "Velopass MCP",
  version: "0.1.0",
  instructions:
    "Tools for the Velopass bike-registration app. Use `search_shops` to find partner bike shops by name, city, country, or brand, and `count_shops` to get the total number of active partner shops (optionally per country).",
  tools: [searchShops, countShops],
});
