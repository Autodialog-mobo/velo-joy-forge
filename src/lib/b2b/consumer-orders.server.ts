// Server-only client for the Velopass B2B orders app (consumer / D2C intake).
// Do not import from client modules.

const AUTH0_TOKEN_URL = "https://velopass.eu.auth0.com/oauth/token";
const AUDIENCE = "https://api.b2b-orders";

/** Base URL of the Velopass B2B orders API; override with a secret if needed. */
function baseUrl(): string {
  return (
    process.env["VELOPASS_B2B_BASE_URL"] ||
    "https://qdiqklhdmcxnkmglfbrp.supabase.co/functions/v1"
  ).replace(/\/$/, "");
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

export type B2BMode = "live" | "sandbox";

const tokenCache: Record<string, { token: string; expiresAt: number } | null> = {
  live: null,
  sandbox: null,
};
const catalogCache: Record<string, { catalog: Catalog; expiresAt: number } | null> = {
  live: null,
  sandbox: null,
};

export function b2bCredentials(
  mode: B2BMode = "live",
): { clientId: string; clientSecret: string } | null {
  const prefix = mode === "sandbox" ? "VELOPASS_B2B_SANDBOX_" : "VELOPASS_B2B_";
  const clientId = process.env[`${prefix}CLIENT_ID`];
  const clientSecret = process.env[`${prefix}CLIENT_SECRET`];
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export async function getB2BToken(force = false, mode: B2BMode = "live"): Promise<string> {
  const now = Date.now();
  const cached = tokenCache[mode];
  if (!force && cached && cached.expiresAt > now) return cached.token;

  const creds = b2bCredentials(mode);
  if (!creds) throw new Error(`B2B credentials ontbreken voor ${mode}`);

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
  tokenCache[mode] = {
    token: json.access_token,
    // refresh 5 minutes before expiry
    expiresAt: now + Math.max((json.expires_in ?? 3600) - 300, 60) * 1000,
  };
  return json.access_token;
}

async function authedFetch(
  path: string,
  init: RequestInit = {},
  mode: B2BMode = "live",
): Promise<Response> {
  let token = await getB2BToken(false, mode);
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
    token = await getB2BToken(true, mode);
    res = await doCall(token);
  }
  return res;
}

export async function fetchCatalog(force = false, mode: B2BMode = "live"): Promise<Catalog> {
  const now = Date.now();
  const cached = catalogCache[mode];
  if (!force && cached && cached.expiresAt > now) return cached.catalog;
  const res = await authedFetch("/consumer-orders/catalog", { method: "GET" }, mode);
  const text = await res.text();
  if (!res.ok) throw new Error(`Catalog fetch failed (${res.status}): ${text.slice(0, 300)}`);
  const catalog = JSON.parse(text) as Catalog;
  catalogCache[mode] = { catalog, expiresAt: now + 5 * 60 * 1000 };
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
