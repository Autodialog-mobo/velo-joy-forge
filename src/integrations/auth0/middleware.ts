// createServerFn middleware that requires an Auth0 access token with role b2b_admin.
// Replacement for the Supabase requireSupabaseAuth middleware on all /admin functions.

import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { verifyAdminToken, type Auth0AdminClaims } from "./require-admin";

export const requireAuth0Admin = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const request = getRequest();
    if (!request?.headers) {
      throw new Error("Unauthorized: No request headers available");
    }
    const result = await verifyAdminToken(request.headers.get("authorization"));
    if (!result.ok) {
      // Throw so useServerFn / caller sees a real error. Message is stable/opaque.
      throw new Error(
        result.status === 403 ? "Forbidden: b2b_admin role required"
        : result.status === 503 ? "admin_auth_unavailable"
        : "Unauthorized",
      );
    }
    return next({
      context: {
        userId: result.userId,
        claims: result.claims as Auth0AdminClaims,
      },
    });
  },
);
