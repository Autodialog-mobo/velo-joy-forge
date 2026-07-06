// Server-only: sends the Velopass shop-signup confirmation email + internal notification.

type Lang = "nl" | "fr" | "de" | "en" | "es";

const EMAIL_FROM = "Velopass <go@velopass.com>";
const INTERNAL_TO = "support@velopass.com";
const LOGO_URL = "https://www.velopass.com/email/velopass-logo.png";

const BRAND = {
  ink: "#0D1F3C",
  muted: "#64748B",
  border: "#E2E8F0",
  accent: "#2ECC8A",
  soft: "#F6F9F7",
};

type Copy = {
  subject: string;
  preview: string;
  hi: string;
  intro: string;
  next: string;
  nextBody: string;
  yourDetails: string;
  labels: {
    shop: string;
    vat: string;
    address: string;
    email: string;
    phone: string;
    pos: string;
  };
  footer: string;
};

const COPY: Record<Lang, Copy> = {
  nl: {
    subject: "Bedankt voor je aanmelding bij Velopass Pro",
    preview: "We nemen binnen 2 werkdagen contact met je op.",
    hi: "Hallo",
    intro: "Bedankt om je fietswinkel aan te melden bij Velopass. We hebben je gegevens goed ontvangen.",
    next: "Wat gebeurt er nu?",
    nextBody: "Ons team neemt binnen 2 werkdagen contact met je op om je welkomstpakket met 5 gratis Frame-ID's op te sturen en je onboarding in te plannen.",
    yourDetails: "Je gegevens",
    labels: { shop: "Winkel", vat: "BTW-nummer", address: "Adres", email: "E-mail", phone: "Telefoon", pos: "Kassasysteem" },
    footer: "Vragen? Antwoord gewoon op deze e-mail.",
  },
  fr: {
    subject: "Merci pour votre inscription à Velopass Pro",
    preview: "Nous vous recontactons sous 2 jours ouvrables.",
    hi: "Bonjour",
    intro: "Merci d'avoir inscrit votre magasin de vélos chez Velopass. Nous avons bien reçu vos informations.",
    next: "Et maintenant ?",
    nextBody: "Notre équipe vous contactera sous 2 jours ouvrables pour vous envoyer votre pack de bienvenue avec 5 Frame-ID gratuits et planifier votre onboarding.",
    yourDetails: "Vos informations",
    labels: { shop: "Magasin", vat: "N° TVA", address: "Adresse", email: "E-mail", phone: "Téléphone", pos: "Caisse" },
    footer: "Des questions ? Répondez simplement à cet e-mail.",
  },
  de: {
    subject: "Danke für Ihre Anmeldung bei Velopass Pro",
    preview: "Wir melden uns innerhalb von 2 Werktagen.",
    hi: "Hallo",
    intro: "Danke, dass Sie Ihren Fahrradladen bei Velopass angemeldet haben. Ihre Angaben sind bei uns eingegangen.",
    next: "Wie geht es weiter?",
    nextBody: "Unser Team meldet sich innerhalb von 2 Werktagen bei Ihnen, um Ihr Willkommenspaket mit 5 kostenlosen Frame-IDs zu versenden und das Onboarding zu planen.",
    yourDetails: "Ihre Angaben",
    labels: { shop: "Laden", vat: "USt-Nr.", address: "Adresse", email: "E-Mail", phone: "Telefon", pos: "Kassensystem" },
    footer: "Fragen? Antworten Sie einfach auf diese E-Mail.",
  },
  en: {
    subject: "Thanks for signing up with Velopass Pro",
    preview: "We'll reach out within 2 business days.",
    hi: "Hi",
    intro: "Thanks for signing up your bike shop with Velopass. We've received your details.",
    next: "What's next?",
    nextBody: "Our team will contact you within 2 business days to ship your welcome pack with 5 free Frame-IDs and schedule your onboarding.",
    yourDetails: "Your details",
    labels: { shop: "Shop", vat: "VAT", address: "Address", email: "Email", phone: "Phone", pos: "POS" },
    footer: "Questions? Just reply to this email.",
  },
  es: {
    subject: "Gracias por unirte a Velopass Pro",
    preview: "Te contactaremos en 2 días laborables.",
    hi: "Hola",
    intro: "Gracias por registrar tu tienda de bicis en Velopass. Hemos recibido tus datos.",
    next: "¿Qué sigue?",
    nextBody: "Nuestro equipo te contactará en 2 días laborables para enviarte tu pack de bienvenida con 5 Frame-ID gratis y planificar tu onboarding.",
    yourDetails: "Tus datos",
    labels: { shop: "Tienda", vat: "N° IVA", address: "Dirección", email: "Correo", phone: "Teléfono", pos: "Caja" },
    footer: "¿Preguntas? Responde a este correo.",
  },
};

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export type ShopSignupInput = {
  id: string;
  lang: Lang;
  to: string;
  firstName?: string;
  lastName?: string;
  shopName?: string;
  vat?: string;
  address?: string;
  phone?: string;
  posSystem?: string;
  posOther?: string;
};

function pickLang(v?: string): Lang {
  return v === "fr" || v === "de" || v === "en" || v === "es" ? v : "nl";
}

function row(label: string, value?: string) {
  if (!value) return "";
  return `<tr>
    <td style="padding:6px 0;color:${BRAND.muted};font:400 13px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;width:130px;vertical-align:top;">${esc(label)}</td>
    <td style="padding:6px 0;color:${BRAND.ink};font:500 14px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${esc(value)}</td>
  </tr>`;
}

function renderCustomerHtml(input: ShopSignupInput, t: Copy): string {
  const posLabel = input.posSystem === "other" ? input.posOther : input.posSystem;
  const greetName = [input.firstName, input.lastName].filter(Boolean).join(" ") || input.shopName || "";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(t.subject)}</title></head>
<body style="margin:0;padding:0;background:#ffffff;">
  <div style="display:none;max-height:0;overflow:hidden;">${esc(t.preview)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr><td style="padding:0 0 24px 0;"><img src="${LOGO_URL}" alt="Velopass" width="40" height="40" style="display:block;border:0;"></td></tr>
        <tr><td style="padding:0 0 8px 0;color:${BRAND.ink};font:600 22px/1.3 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${esc(t.hi)}${greetName ? " " + esc(greetName) : ""},</td></tr>
        <tr><td style="padding:0 0 20px 0;color:${BRAND.ink};font:400 15px/1.55 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${esc(t.intro)}</td></tr>
        <tr><td style="padding:16px 20px;background:${BRAND.soft};border:1px solid ${BRAND.border};border-radius:10px;">
          <div style="color:${BRAND.ink};font:600 15px/1.3 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin-bottom:6px;">${esc(t.next)}</div>
          <div style="color:${BRAND.ink};font:400 14px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${esc(t.nextBody)}</div>
        </td></tr>
        <tr><td style="padding:24px 0 8px 0;color:${BRAND.ink};font:600 14px/1.3 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;text-transform:uppercase;letter-spacing:.5px;">${esc(t.yourDetails)}</td></tr>
        <tr><td style="padding:0 0 24px 0;border-top:1px solid ${BRAND.border};">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${row(t.labels.shop, input.shopName)}
            ${row(t.labels.vat, input.vat)}
            ${row(t.labels.address, input.address)}
            ${row(t.labels.email, input.to)}
            ${row(t.labels.phone, input.phone)}
            ${row(t.labels.pos, posLabel)}
          </table>
        </td></tr>
        <tr><td style="padding:16px 0;border-top:1px solid ${BRAND.border};color:${BRAND.muted};font:400 13px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          ${esc(t.footer)}<br><span>Velopass · velopass.com</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function renderInternalHtml(input: ShopSignupInput): string {
  const posLabel = input.posSystem === "other" ? `Other: ${input.posOther ?? ""}` : (input.posSystem ?? "");
  const rows: [string, string | undefined][] = [
    ["Shop", input.shopName],
    ["Contact", [input.firstName, input.lastName].filter(Boolean).join(" ")],
    ["Email", input.to],
    ["Phone", input.phone],
    ["VAT", input.vat],
    ["Address", input.address],
    ["POS", posLabel],
    ["Language", input.lang],
    ["Signup ID", input.id],
  ];
  return `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:${BRAND.ink};">
  <h2 style="margin:0 0 12px 0;">New shop signup</h2>
  <table cellpadding="6" cellspacing="0" style="border-collapse:collapse;">
    ${rows.map(([k, v]) => `<tr><td style="color:${BRAND.muted};">${esc(k)}</td><td>${esc(v ?? "")}</td></tr>`).join("")}
  </table>
</body></html>`;
}

async function sendViaResend(params: { to: string; subject: string; html: string; replyTo?: string }): Promise<{ ok: true; id?: string } | { ok: false; error: string; status?: number }> {
  const apiKey = process.env.RESEND_API_KEY;
  const lovableKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY not configured" };
  if (!lovableKey) return { ok: false, error: "LOVABLE_API_KEY not configured" };
  try {
    const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        ...(params.replyTo ? { reply_to: params.replyTo } : {}),
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (body as any)?.message || (body as any)?.error || `Resend HTTP ${res.status}`;
      return { ok: false, error: String(msg), status: res.status };
    }
    return { ok: true, id: (body as any)?.id };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Resend request failed" };
  }
}

async function writeLog(row: {
  template: string;
  recipient: string;
  status: string;
  http_status?: number | null;
  resend_id?: string | null;
  error_message?: string | null;
  duration_ms?: number | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin.from("email_send_log") as any).insert({
      template: row.template,
      order_id: null,
      recipient: row.recipient,
      status: row.status,
      resend_id: row.resend_id ?? null,
      http_status: row.http_status ?? null,
      error_message: row.error_message ?? null,
      duration_ms: row.duration_ms ?? null,
      metadata: row.metadata ?? null,
    });
  } catch (e) {
    console.error("[shop-signup-email] email_send_log insert failed:", e);
  }
}

export async function sendShopSignupEmails(input: ShopSignupInput): Promise<{ ok: boolean; error?: string }> {
  const startedAt = Date.now();
  const lang = pickLang(input.lang);
  const t = COPY[lang];

  // 1. Customer confirmation
  const customerHtml = renderCustomerHtml(input, t);
  const customer = await sendViaResend({ to: input.to, subject: t.subject, html: customerHtml, replyTo: INTERNAL_TO });
  await writeLog({
    template: "shop_signup_confirmation",
    recipient: input.to,
    status: customer.ok ? "sent" : "gateway_error",
    http_status: customer.ok ? 200 : (customer as any).status ?? null,
    resend_id: customer.ok ? customer.id ?? null : null,
    error_message: customer.ok ? null : (customer as any).error,
    duration_ms: Date.now() - startedAt,
    metadata: { signup_id: input.id, lang },
  });

  // 2. Internal notification
  const internal = await sendViaResend({
    to: INTERNAL_TO,
    subject: `New shop signup: ${input.shopName ?? input.to}`,
    html: renderInternalHtml(input),
    replyTo: input.to,
  });
  await writeLog({
    template: "shop_signup_internal",
    recipient: INTERNAL_TO,
    status: internal.ok ? "sent" : "gateway_error",
    http_status: internal.ok ? 200 : (internal as any).status ?? null,
    resend_id: internal.ok ? internal.id ?? null : null,
    error_message: internal.ok ? null : (internal as any).error,
    duration_ms: Date.now() - startedAt,
    metadata: { signup_id: input.id },
  });

  if (!customer.ok) return { ok: false, error: customer.error };
  return { ok: true };
}
