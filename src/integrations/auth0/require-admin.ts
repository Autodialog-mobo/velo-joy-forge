// Server-only Auth0 JWT verification for admin routes.
// Port of supabase/functions/mollie/index.ts:requireAdmin from b2b-order-flow.
// Uses jose (NPM, Worker-compatible) instead of the Deno esm.sh build.

import { jwtVerify, createRemoteJWKSet, type JWTPayload } from "jose";

export const ROLE_CLAIM = "https://velopass.com/role";
export const ADMIN_ROLE = "b2b_admin";

let cachedJwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let cachedForDomain: string | null = null;

function getJwks(domain: string) {
  if (cachedJwks && cachedForDomain === domain) return cachedJwks;
  cachedJwks = createRemoteJWKSet(new URL(`https://${domain}/.well-known/jwks.json`));
  cachedForDomain = domain;
  return cachedJwks;
}

export type Auth0AdminClaims = JWTPayload & {
  email?: string;
  [key: string]: unknown;
};

export type VerifyAdminResult =
  | { ok: true; userId: string; claims: Auth0AdminClaims }
  | { ok: false; status: 401 | 403 | 503; error: string };

/**
 * Verify an incoming Authorization: Bearer <auth0 access token> header.
 * Returns the decoded claims if the caller has the b2b_admin role.
 * Never throws — always returns a discriminated result the caller maps to a Response.
 */
export async function verifyAdminToken(authorizationHeader: string | null | undefined): Promise<VerifyAdminResult> {
  const domain = process.env.AUTH0_DOMAIN ?? "";
  const audience = process.env.AUTH0_AUDIENCE ?? "";
  if (!domain || !audience) {
    console.error("[auth0] AUTH0_DOMAIN / AUTH0_AUDIENCE not configured");
    return { ok: false, status: 503, error: "admin_auth_unavailable" };
  }
  const header = authorizationHeader ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return { ok: false, status: 401, error: "unauthorized" };

  try {
    const { payload } = await jwtVerify(token, getJwks(domain), {
      issuer: `https://${domain}/`,
      audience,
    });
    if (payload[ROLE_CLAIM] !== ADMIN_ROLE) {
      return { ok: false, status: 403, error: "forbidden" };
    }
    if (!payload.sub) {
      return { ok: false, status: 401, error: "invalid_token" };
    }
    return { ok: true, userId: payload.sub, claims: payload as Auth0AdminClaims };
  } catch (e) {
    console.warn("[auth0] token verify failed:", (e as Error)?.message);
    return { ok: false, status: 401, error: "unauthorized" };
  }
}
