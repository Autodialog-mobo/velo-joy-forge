// Server-only audit log helper. Do not import from client modules.
import { getRequest } from "@tanstack/react-start/server";

export type AuditEntry = {
  action: string;
  route?: string | null;
  target_type?: string | null;
  target_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

function actorEmailFromClaims(claims: any): string | null {
  return (
    claims?.email ||
    claims?.user_metadata?.email ||
    null
  );
}

export async function writeAudit(
  context: { userId?: string; claims?: any },
  entry: AuditEntry,
) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let ip: string | null = null;
    let user_agent: string | null = null;
    let route: string | null = entry.route ?? null;
    try {
      const req = getRequest();
      if (req?.headers) {
        ip =
          req.headers.get("cf-connecting-ip") ||
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          null;
        user_agent = req.headers.get("user-agent");
        if (!route) {
          const referer = req.headers.get("referer");
          if (referer) {
            try {
              route = new URL(referer).pathname;
            } catch {}
          }
        }
      }
    } catch {}

    await (supabaseAdmin as any).from("admin_audit_log").insert({
      user_id: context.userId ?? null,
      actor_email: actorEmailFromClaims(context.claims),
      action: entry.action,
      route,
      target_type: entry.target_type ?? null,
      target_id: entry.target_id ?? null,
      metadata: entry.metadata ?? null,
      ip,
      user_agent,
    });
  } catch (e) {
    console.error("writeAudit failed:", e);
  }
}
