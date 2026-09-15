// Server-only client for the Velopass B2B orders app (consumer / D2C intake).
// Do not import from client modules.

const AUTH0_TOKEN_URL = "https://velopass.eu.auth0.com/oauth/token";
const AUDIENCE = "https://api.b2b-orders";

/** Base URL of the Velopass B2B orders API; override with a secret if needed. */
function baseUrl(): string {
  return (process.env["VELOPASS_B2B_BASE_URL"] || "https://api.velopass.pro/v1").replace(/\/$/, "");
}

export type CatalogBundle = {
  bundle: "solo" | "duo" | "family";
  frame_id_count: 1 | 2 | 5;
  sku: string;
  unit_price: number;
};

export type Catalog = {
  schema_version: string;
  currency: string;
  catalog_version: string;
  bundles: CatalogBundle[];
};

let tokenCache: { token: string; expiresAt: number } | null = null;
let catalogCache: { catalog: Catalog; expiresAt: number } | null = null;

export function b2bCredentials(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env["VELOPASS_B2B_CLIENT_ID"];
  const clientSecret = process.env["VELOPASS_B2B_CLIENT_SECRET"];
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export async function getB2BToken(force = false): Promise<string> {
  const now = Date.now();
  if (!force && tokenCache && tokenCache.expiresAt > now) return tokenCache.token;

  const creds = b2bCredentials();
  if (!creds) throw new Error("B2B credentials ontbreken (VELOPASS_B2B_CLIENT_ID / _SECRET)");

  const res = await fetch(AUTH0_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      audience: AUDIENCE,
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Auth0 token failed (${res.status}): ${text.slice(0, 300)}`);
  const json = JSON.parse(text) as { access_token: string; expires_in: number };
  tokenCache = {
    token: json.access_token,
    // refresh 5 minutes before expiry
    expiresAt: now + Math.max((json.expires_in ?? 3600) - 300, 60) * 1000,
  };
  return tokenCache.token;
}

async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  let token = await getB2BToken();
  const doCall = (t: string) =>
    fetch(`${baseUrl()}${path}`, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        "Content-Type": "application/json",
        Authorization: `Bearer ${t}`,
      },
    });
  let res = await doCall(token);
  if (res.status === 401) {
    token = await getB2BToken(true);
    res = await doCall(token);
  }
  return res;
}

export async function fetchCatalog(force = false): Promise<Catalog> {
  const now = Date.now();
  if (!force && catalogCache && catalogCache.expiresAt > now) return catalogCache.catalog;
  const res = await authedFetch("/consumer-orders/catalog", { method: "GET" });
  const text = await res.text();
  if (!res.ok) throw new Error(`Catalog fetch failed (${res.status}): ${text.slice(0, 300)}`);
  const catalog = JSON.parse(text) as Catalog;
  catalogCache = { catalog, expiresAt: now + 5 * 60 * 1000 };
  return catalog;
}

export type PostOrderResult =
  | {
      ok: true;
      status: number;
      velopassOrderId: string;
      priceFlag: string | null;
    }
  | {
      ok: false;
      status: number;
      permanent: boolean; // 400 = do not retry as-is
      error: string;
    };

export async function postConsumerOrder(payload: unknown): Promise<PostOrderResult> {
  let res: Response;
  try {
    res = await authedFetch("/consumer-orders", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (e: any) {
    return { ok: false, status: 0, permanent: false, error: e?.message ?? "network error" };
  }

  const text = await res.text();
  if (res.status === 200 || res.status === 201) {
    try {
      const body = JSON.parse(text) as { velopass_order_id: string; price_flag?: string };
      return {
        ok: true,
        status: res.status,
        velopassOrderId: body.velopass_order_id,
        priceFlag: body.price_flag ?? null,
      };
    } catch {
      return { ok: false, status: res.status, permanent: true, error: "onleesbaar antwoord" };
    }
  }

  return {
    ok: false,
    status: res.status,
    permanent: res.status === 400 || res.status === 403,
    error: `${res.status}: ${text.slice(0, 500)}`,
  };
}
