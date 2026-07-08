// Client-side functionMiddleware: attach the Auth0 access token as a Bearer
// header on every server-function RPC. Runs before every useServerFn call.
// If there is no active Auth0 session (public routes, logged-out users), it
// simply attaches nothing and the request goes through unauthenticated — which
// is fine for public server functions and correctly rejected by requireAuth0Admin.

import { createMiddleware } from "@tanstack/react-start";
import { getAuth0AccessToken } from "./token-store";

export const attachAuth0Token = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const token = await getAuth0AccessToken();
    if (!token) return next();
    return next({
      headers: { Authorization: `Bearer ${token}` },
    });
  },
);
