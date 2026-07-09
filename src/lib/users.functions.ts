import { createServerFn } from "@tanstack/react-start";
import { requireAuth0Admin } from "@/integrations/auth0/middleware";

export type AppRole = "admin" | "staff";

// Admin access is granted automatically by the Auth0 Post-Login Action
// (any verified @velopass.com email → b2b_admin claim). There is no per-user
// role assignment to write to, so no invite/update/remove server functions
// exist. Legacy Supabase-based helpers were removed with that logic.

export const getMyRoles = createServerFn({ method: "POST" })
  .middleware([requireAuth0Admin])
  .handler(async ({ context }) => {
    const claims = (context as any).claims ?? {};
    return {
      roles: ["admin"] as string[],
      email: claims.email ?? null,
      sub: (context as any).userId as string,
    };
  });
