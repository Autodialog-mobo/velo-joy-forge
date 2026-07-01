import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { sendShopSignupEmails } from "@/lib/email/shop-signup.server";

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

const SignupSchema = z.object({
  vat: z.string().trim().max(32).optional().or(z.literal("")),
  firstName: z.string().trim().max(80).optional().or(z.literal("")),
  lastName: z.string().trim().max(80).optional().or(z.literal("")),
  shopName: z.string().trim().min(1, "shop_name_required").max(160),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  email: z.string().trim().email("email_invalid").max(255),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  posSystem: z.string().trim().max(40).optional().or(z.literal("")),
  posOther: z.string().trim().max(120).optional().or(z.literal("")),
  lang: z.enum(["nl", "fr", "de", "en", "es"]).optional(),
  // simple honeypot; any value silently accepted as success
  website: z.string().max(2000).optional(),
});

export const Route = createFileRoute("/api/public/shop-signup")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ ok: false, error: "invalid_json" }, 400);
        }
        const parsed = SignupSchema.safeParse(raw);
        if (!parsed.success) {
          return json({ ok: false, error: "invalid_input", details: parsed.error.flatten() }, 400);
        }
        const data = parsed.data;
        // Honeypot: silently accept
        if (data.website) return json({ ok: true });

        const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for") ?? null;
        const ua = request.headers.get("user-agent") ?? null;
        const lang = data.lang ?? "nl";

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const insertRes = await (supabaseAdmin.from("shop_signups") as any)
          .insert({
            vat: data.vat || null,
            first_name: data.firstName || null,
            last_name: data.lastName || null,
            shop_name: data.shopName,
            address: data.address || null,
            email: data.email,
            phone: data.phone || null,
            pos_system: data.posSystem || null,
            pos_other: data.posOther || null,
            lang,
            ip,
            user_agent: ua,
          })
          .select("id")
          .single();

        if (insertRes.error || !insertRes.data) {
          console.error("[shop-signup] insert failed", insertRes.error);
          return json({ ok: false, error: "db_error" }, 500);
        }

        const signupId = insertRes.data.id as string;

        const emailRes = await sendShopSignupEmails({
          id: signupId,
          lang,
          to: data.email,
          firstName: data.firstName || undefined,
          lastName: data.lastName || undefined,
          shopName: data.shopName,
          vat: data.vat || undefined,
          address: data.address || undefined,
          phone: data.phone || undefined,
          posSystem: data.posSystem || undefined,
          posOther: data.posOther || undefined,
        });

        if (emailRes.ok) {
          await (supabaseAdmin.from("shop_signups") as any)
            .update({ confirmation_email_sent_at: new Date().toISOString() })
            .eq("id", signupId);
        }

        // Return ok even if the confirmation email failed — the signup is stored.
        return json({ ok: true, id: signupId, emailSent: emailRes.ok });
      },
    },
  },
});
