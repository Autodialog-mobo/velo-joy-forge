import { defineMcp, auth } from "@lovable.dev/mcp-js";
import searchShops from "./tools/search-shops";
import countShops from "./tools/count-shops";

// Managed Cloud Auth OAuth issuer — direct Supabase auth URL (not the .lovable.cloud proxy).
const OAUTH_ISSUER = "https://dlcjwyfrjfcyyagzjmdi.supabase.co/auth/v1";

export default defineMcp({
  name: "velopass-mcp",
  title: "Velopass MCP",
  version: "0.1.0",
  instructions:
    "Tools for the Velopass bike-registration app. Use `search_shops` to find partner bike shops by name, city, country, or brand, and `count_shops` to get the total number of active partner shops (optionally per country).",
  tools: [searchShops, countShops],
  auth: auth.oauth.issuer({
    issuer: OAUTH_ISSUER,
    // Supabase mints project-wide `aud: "authenticated"` tokens for signed-in users.
    acceptedAudiences: "authenticated",
    resourceName: "Velopass MCP",
  }),
});
