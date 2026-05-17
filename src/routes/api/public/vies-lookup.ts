import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function parseVat(raw: string): { countryCode: string; vatNumber: string } | null {
  const clean = raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (clean.length < 4) return null;
  const cc = clean.slice(0, 2);
  const num = clean.slice(2);
  if (!/^[A-Z]{2}$/.test(cc) || num.length < 2) return null;
  return { countryCode: cc, vatNumber: num };
}

export const Route = createFileRoute("/api/public/vies-lookup")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        let body: { vatNumber?: string };
        try {
          body = await request.json();
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }
        const raw = (body.vatNumber || "").toString();
        if (raw.length > 32) return json({ error: "Input too long" }, 400);
        const parsed = parseVat(raw);
        if (!parsed) return json({ valid: false, error: "Invalid format" }, 200);

        try {
          const upstream = await fetch(
            "https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number",
            {
              method: "POST",
              headers: { "Content-Type": "application/json", Accept: "application/json" },
              body: JSON.stringify(parsed),
              signal: AbortSignal.timeout(8000),
            },
          );
          if (!upstream.ok) {
            return json({ valid: false, error: "VIES unavailable" }, 200);
          }
          const data = (await upstream.json()) as {
            valid?: boolean;
            name?: string;
            address?: string;
            traderName?: string;
            traderAddress?: string;
          };
          const name = (data.name ?? data.traderName ?? "").toString().trim();
          const address = (data.address ?? data.traderAddress ?? "")
            .toString()
            .replace(/\n+/g, ", ")
            .replace(/\s+/g, " ")
            .trim();
          return json({
            valid: !!data.valid,
            name,
            address,
            countryCode: parsed.countryCode,
            vatNumber: parsed.vatNumber,
          });
        } catch {
          return json({ valid: false, error: "VIES unavailable" }, 200);
        }
      },
    },
  },
});
