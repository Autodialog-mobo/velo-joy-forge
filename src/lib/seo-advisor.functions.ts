import { createServerFn } from "@tanstack/react-start";
import { requireAuth0Admin } from "@/integrations/auth0/middleware";

// Admin-only SEO advisor: fetches the last 28 days of Search Console data for
// www.velopass.com (queries + pages) and asks the AI Gateway for concrete
// improvement suggestions. Search Console is called only from this handler.

const GSC = "https://connector-gateway.lovable.dev/google_search_console";
const TARGET = "https://www.velopass.com/";

export type GscRow = { key: string; clicks: number; impressions: number; ctr: number; position: number };
export type SeoAdvice = {
  siteUrl: string;
  startDate: string;
  endDate: string;
  queries: GscRow[];
  pages: GscRow[];
  advice: string;
  error?: string;
};

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function resolveSite(headers: Record<string, string>) {
  const res = await fetch(`${GSC}/webmasters/v3/sites`, { headers });
  if (!res.ok) throw new Error(`Search Console sites [${res.status}]: ${await res.text()}`);
  const { siteEntry = [] } = (await res.json()) as { siteEntry?: { siteUrl: string; permissionLevel?: string }[] };
  const host = new URL(TARGET).hostname;
  const matches = siteEntry.filter((e) => {
    if (e.permissionLevel === "siteUnverifiedUser") return false;
    if (e.siteUrl.startsWith("sc-domain:")) {
      const d = e.siteUrl.slice(10).toLowerCase();
      return host === d || host.endsWith(`.${d}`);
    }
    return TARGET.startsWith(e.siteUrl);
  });
  const exact = matches.find((m) => m.siteUrl === TARGET);
  const pick = exact ?? matches[0];
  if (!pick) throw new Error("Geen geverifieerde Search Console-eigenschap voor www.velopass.com");
  return pick.siteUrl;
}

async function query(headers: Record<string, string>, siteUrl: string, dimension: "query" | "page", startDate: string, endDate: string) {
  const res = await fetch(`${GSC}/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ startDate, endDate, dimensions: [dimension], rowLimit: 50 }),
  });
  if (!res.ok) throw new Error(`Search Console query [${res.status}]: ${await res.text()}`);
  const json = (await res.json()) as { rows?: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }[] };
  return (json.rows ?? []).map((r) => ({ key: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position }));
}

function table(rows: GscRow[]) {
  return rows
    .map((r) => `${r.key} | ${r.clicks} | ${r.impressions} | ${(r.ctr * 100).toFixed(1)}% | ${r.position.toFixed(1)}`)
    .join("\n");
}

const INSTRUCTIONS = `Je bent een senior SEO-consultant voor velopass.com: een fietsregistratie- en antidiefstalplatform (Frame-ID QR-stickers, gratis bike-check, netwerk van fietswinkels) in BE/NL/FR, met de talen nl, fr, de, en, es onder /{taal}/. In Frankrijk kan men niet online bestellen (alleen via erkende operator/winkel).
Analyseer de Search Console-data en geef concrete, uitvoerbare verbeteringen in het Nederlands, in Markdown:
1. Korte samenvatting (3 zinnen).
2. Snelle winsten: zoekopdrachten/pagina's met veel vertoningen maar lage CTR of positie 5-20; geef per item de pagina, het probleem en een voorgestelde nieuwe title (max 60 tekens) en meta description (max 155 tekens) in de taal van de pagina.
3. Inhoudskansen: ontbrekende pagina's of secties op basis van zoekopdrachten.
4. Technisch/intern linken.
Wees specifiek, verwijs naar echte URL's en cijfers uit de data, verzin geen cijfers. Max 10 acties, gesorteerd op verwachte impact.`;

export const getSeoAdvice = createServerFn({ method: "POST" })
  .middleware([requireAuth0Admin])
  .handler(async (): Promise<SeoAdvice> => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const gscKey = process.env.GOOGLE_SEARCH_CONSOLE_API_KEY;
    const end = new Date(Date.now() - 3 * 86400000);
    const start = new Date(end.getTime() - 27 * 86400000);
    const base: SeoAdvice = { siteUrl: TARGET, startDate: ymd(start), endDate: ymd(end), queries: [], pages: [], advice: "" };
    if (!lovableKey || !gscKey) return { ...base, error: "Search Console of AI is niet geconfigureerd." };

    const headers = { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": gscKey };
    try {
      const siteUrl = await resolveSite(headers);
      const [queries, pages] = await Promise.all([
        query(headers, siteUrl, "query", base.startDate, base.endDate),
        query(headers, siteUrl, "page", base.startDate, base.endDate),
      ]);
      Object.assign(base, { siteUrl, queries, pages });
      if (!queries.length && !pages.length) {
        return { ...base, error: "Search Console heeft nog geen gegevens voor deze periode. Probeer het over een paar dagen opnieuw." };
      }

      const { createOpenAI } = await import("@ai-sdk/openai");
      const { streamText } = await import("ai");
      const provider = createOpenAI({
        baseURL: "https://ai.gateway.lovable.dev/v1",
        apiKey: lovableKey,
        headers: { "Lovable-API-Key": lovableKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      });
      const result = streamText({
        model: provider.responses("openai/gpt-6-astra"),
        maxRetries: 0,
        instructions: INSTRUCTIONS,
        messages: [
          {
            role: "user",
            content: `Periode ${base.startDate} t/m ${base.endDate}, eigenschap ${siteUrl}.\n\nTOP ZOEKOPDRACHTEN (query | klikken | vertoningen | CTR | positie):\n${table(queries)}\n\nTOP PAGINA'S (pagina | klikken | vertoningen | CTR | positie):\n${table(pages)}`,
          },
        ],
        providerOptions: {
          openai: {
            forceReasoning: true,
            reasoningEffort: "medium",
            reasoningSummary: "auto",
            store: false,
            include: ["reasoning.encrypted_content"],
          },
        },
      });
      const advice = await result.text;
      if (!advice.trim()) return { ...base, error: "Het model gaf geen antwoord." };
      return { ...base, advice };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[seo-advisor]", msg);
      const status = (e as { statusCode?: number })?.statusCode;
      const friendly =
        status === 402 ? "Onvoldoende AI-tegoed in de workspace. Vul aan via Settings → Plans & credits."
        : status === 429 ? "Even te veel aanvragen. Probeer het over een minuut opnieuw."
        : msg;
      return { ...base, error: friendly };
    }
  });
