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
  country: z.string().trim().max(120).optional().or(z.literal("")),
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
        const reqId = `ss_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
        const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for") ?? null;
        const ua = request.headers.get("user-agent") ?? null;
        console.log(`[shop-signup ${reqId}] incoming`, { ip, ua });

        let raw: unknown;
        try {
          raw = await request.json();
        } catch (err) {
          console.warn(`[shop-signup ${reqId}] invalid_json`, err);
          return json({ ok: false, error: "invalid_json", reqId }, 400);
        }
        const parsed = SignupSchema.safeParse(raw);
        if (!parsed.success) {
          const details = parsed.error.flatten();
          console.warn(`[shop-signup ${reqId}] invalid_input`, JSON.stringify(details));
          return json({ ok: false, error: "invalid_input", details, reqId }, 400);
        }
        const data = parsed.data;
        // Honeypot: silently accept
        if (data.website) {
          console.warn(`[shop-signup ${reqId}] honeypot_triggered`, { ip, ua, email: data.email });
          return json({ ok: true });
        }

        const lang = data.lang ?? "nl";
        console.log(`[shop-signup ${reqId}] validated`, {
          email: data.email,
          shopName: data.shopName,
          vat: data.vat || null,
          lang,
        });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const insertRes = await (supabaseAdmin.from("shop_signups") as any)
          .insert({
            vat: data.vat || null,
            first_name: data.firstName || null,
            last_name: data.lastName || null,
            shop_name: data.shopName,
            address: data.address || null,
            country: data.country || null,
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
          const e = insertRes.error;
          console.error(`[shop-signup ${reqId}] insert_failed`, {
            code: e?.code,
            message: e?.message,
            details: e?.details,
            hint: e?.hint,
          });
          const isRls =
            e?.code === "42501" ||
            /row-level security|permission denied/i.test(e?.message ?? "");
          return json(
            {
              ok: false,
              error: isRls ? "rls_denied" : "db_error",
              reqId,
              ...(process.env.NODE_ENV !== "production"
                ? { debug: { code: e?.code, message: e?.message, hint: e?.hint } }
                : {}),
            },
            500,
          );
        }

        const signupId = insertRes.data.id as string;
        console.log(`[shop-signup ${reqId}] inserted`, { signupId });

        let emailRes: { ok: boolean; error?: unknown } = { ok: false };
        try {
          emailRes = await sendShopSignupEmails({
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
        } catch (err) {
          console.error(`[shop-signup ${reqId}] email_threw`, err);
          emailRes = { ok: false, error: err };
        }

        const nowIso = new Date().toISOString();
        if (emailRes.ok) {
          console.log(`[shop-signup ${reqId}] email_sent`);
          const updRes = await (supabaseAdmin.from("shop_signups") as any)
            .update({
              confirmation_email_sent_at: nowIso,
              confirmation_email_attempted_at: nowIso,
              confirmation_email_error: null,
            })
            .eq("id", signupId);
          if (updRes.error) {
            console.error(`[shop-signup ${reqId}] email_flag_update_failed`, updRes.error);
          }
        } else {
          const errMsg =
            typeof emailRes.error === "string"
              ? emailRes.error
              : (emailRes.error as any)?.message ?? JSON.stringify(emailRes.error ?? {});
          console.error(`[shop-signup ${reqId}] email_failed`, errMsg);
          const updRes = await (supabaseAdmin.from("shop_signups") as any)
            .update({
              confirmation_email_attempted_at: nowIso,
              confirmation_email_error: errMsg.slice(0, 2000),
            })
            .eq("id", signupId);
          if (updRes.error) {
            console.error(`[shop-signup ${reqId}] email_error_update_failed`, updRes.error);
          }
        }

        // Return ok even if the confirmation email failed — the signup is stored.
        return json({ ok: true, id: signupId, emailSent: emailRes.ok, reqId });
      },
    },
  },
});
