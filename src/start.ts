import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachAuth0Token } from "@/integrations/auth0/attach-token";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Auth0 is the sole session source for /admin. We intentionally do NOT
// re-add the generated attachSupabaseAuth middleware — its call to
// supabase.auth.getSession() would attach a stale/absent Supabase JWT
// that requireAuth0Admin would reject.
export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth, attachAuth0Token],
  requestMiddleware: [errorMiddleware],
}));
