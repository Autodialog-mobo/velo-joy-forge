import { createServerFn } from "@tanstack/react-start";

// Public (unauthenticated) endpoint that records one experiment impression.
// Non-critical: any failure is swallowed so it can never affect the page or
// the checkout. Safe to call before the DB migration lands — a missing table
// just means the insert silently fails.

const VARIANTS = new Set(["A", "B"]);
const KEY_RE = /^[a-z0-9_]{1,64}$/;
const VID_RE = /^[A-Za-z0-9_-]{1,64}$/;

export const logImpression = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { experiment: string; variant: string; visitorId: string }) => {
      if (!d || !KEY_RE.test(d.experiment)) throw new Error("invalid experiment");
      if (!VARIANTS.has(d.variant)) throw new Error("invalid variant");
      if (!VID_RE.test(d.visitorId)) throw new Error("invalid visitorId");
      return d;
    },
  )
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const environment = process.env.MOLLIE_API_KEY?.startsWith("live_") ? "live" : "sandbox";
      await (supabaseAdmin as any).from("experiment_impressions").insert({
        experiment: data.experiment,
        variant: data.variant,
        visitor_id: data.visitorId,
        environment,
      });
    } catch (e) {
      // Best-effort only — never surface to the caller.
      console.error("logImpression failed:", e instanceof Error ? e.message : e);
    }
    return { ok: true };
  });
