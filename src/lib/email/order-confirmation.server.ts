// Server-only: sends the Velopass order confirmation email via Resend.
// Domain velopass.com is verified — sender uses the branded address.

type Lang = "nl" | "fr" | "de" | "en" | "es";

const EMAIL_FROM = "Velopass <go@velopass.com>";

const BRAND = {
  bg: "#ffffff",
  ink: "#0D1F3C", // Velopass navy
  muted: "#64748B",
  border: "#E2E8F0",
  accent: "#2ECC8A", // Velopass green
  soft: "#F6F9F7",
};

// Hosted PNG logomark on the production domain. Gmail blocks data: URIs and
// does not render SVG in email, so we reference an absolute https URL to a PNG.
const LOGO_URL = "https://www.velopass.com/email/velopass-logo.png";

const BUNDLE_LABELS: Record<Lang, Record<string, string>> = {
  nl: {
    frameid_solo_onetime: "Velopass Frame-ID Solo",
    frameid_duo_onetime: "Velopass Frame-ID Duo",
    frameid_family_onetime: "Velopass Frame-ID Familie",
  },
  fr: {
    frameid_solo_onetime: "Velopass Frame-ID Solo",
    frameid_duo_onetime: "Velopass Frame-ID Duo",
    frameid_family_onetime: "Velopass Frame-ID Family",
  },
  de: {
    frameid_solo_onetime: "Velopass Frame-ID Solo",
    frameid_duo_onetime: "Velopass Frame-ID Duo",
    frameid_family_onetime: "Velopass Frame-ID Family",
  },
  en: {
    frameid_solo_onetime: "Velopass Frame-ID Solo",
    frameid_duo_onetime: "Velopass Frame-ID Duo",
    frameid_family_onetime: "Velopass Frame-ID Family",
  },
  es: {
    frameid_solo_onetime: "Velopass Frame-ID Solo",
    frameid_duo_onetime: "Velopass Frame-ID Duo",
    frameid_family_onetime: "Velopass Frame-ID Family",
  },
};

type Strings = {
  subject: (orderRef: string) => string;
  preview: string;
  hi: string;
  thanks: string;
  orderRef: string;
  items: string;
  qty: string;
  amount: string;
  subtotal: string;
  shipping: string;
  total: string;
  whereofVat: (vat: string) => string;
  shipTo: string;
  whatsNext: string;
  whatsNextBody: string;
  footer: string;
};

const COPY: Record<Lang, Strings> = {
  nl: {
    subject: (ref) => `Bedankt voor je bestelling — Velopass #${ref}`,
    preview: "We hebben je bestelling goed ontvangen.",
    hi: "Hallo",
    thanks: "Bedankt voor je bestelling! We hebben je betaling goed ontvangen en verwerken je Frame-ID's nu.",
    orderRef: "Bestelnummer",
    items: "Bestelde items",
    qty: "Aantal",
    amount: "Bedrag",
    subtotal: "Subtotaal",
    shipping: "Verzending",
    total: "Totaal",
    whereofVat: (vat) => `incl. ${vat} BTW`,
    shipTo: "Verzendadres",
    whatsNext: "Wat nu?",
    whatsNextBody: "Je Frame-ID's worden binnen 2 werkdagen verzonden. Je krijgt geen aparte verzendmail — verwacht ze gewoon in de bus.",
    footer: "Vragen? Antwoord gewoon op deze mail.",
  },
  fr: {
    subject: (ref) => `Merci pour ta commande — Velopass #${ref}`,
    preview: "Nous avons bien reçu ta commande.",
    hi: "Bonjour",
    thanks: "Merci pour ta commande ! Nous avons bien reçu ton paiement et préparons tes Frame-ID.",
    orderRef: "Numéro de commande",
    items: "Articles commandés",
    qty: "Quantité",
    amount: "Montant",
    subtotal: "Sous-total",
    shipping: "Livraison",
    total: "Total",
    whereofVat: (vat) => `dont ${vat} de TVA`,
    shipTo: "Adresse de livraison",
    whatsNext: "Et maintenant ?",
    whatsNextBody: "Tes Frame-ID seront expédiés sous 2 jours ouvrables. Pas de mail d'expédition séparé — surveille ta boîte aux lettres.",
    footer: "Des questions ? Réponds simplement à ce message.",
  },
  de: {
    subject: (ref) => `Danke für deine Bestellung — Velopass #${ref}`,
    preview: "Wir haben deine Bestellung erhalten.",
    hi: "Hallo",
    thanks: "Danke für deine Bestellung! Wir haben deine Zahlung erhalten und bereiten deine Frame-IDs vor.",
    orderRef: "Bestellnummer",
    items: "Bestellte Artikel",
    qty: "Anzahl",
    amount: "Betrag",
    subtotal: "Zwischensumme",
    shipping: "Versand",
    total: "Gesamt",
    whereofVat: (vat) => `inkl. ${vat} MwSt.`,
    shipTo: "Lieferadresse",
    whatsNext: "Wie geht's weiter?",
    whatsNextBody: "Deine Frame-IDs werden innerhalb von 2 Werktagen versandt. Es gibt keine separate Versandmail — achte einfach auf deinen Briefkasten.",
    footer: "Fragen? Antworte einfach auf diese E-Mail.",
  },
  en: {
    subject: (ref) => `Thanks for your order — Velopass #${ref}`,
    preview: "We've received your order.",
    hi: "Hi",
    thanks: "Thanks for your order! We've received your payment and are preparing your Frame-IDs.",
    orderRef: "Order number",
    items: "Items",
    qty: "Qty",
    amount: "Amount",
    subtotal: "Subtotal",
    shipping: "Shipping",
    total: "Total",
    whereofVat: (vat) => `incl. ${vat} VAT`,
    shipTo: "Shipping address",
    whatsNext: "What's next?",
    whatsNextBody: "Your Frame-IDs will ship within 2 business days. There's no separate shipping email — just watch your mailbox.",
    footer: "Questions? Just reply to this email.",
  },
  es: {
    subject: (ref) => `Gracias por tu pedido — Velopass #${ref}`,
    preview: "Hemos recibido tu pedido.",
    hi: "Hola",
    thanks: "¡Gracias por tu pedido! Hemos recibido tu pago y estamos preparando tus Frame-ID.",
    orderRef: "Número de pedido",
    items: "Artículos",
    qty: "Cant.",
    amount: "Importe",
    subtotal: "Subtotal",
    shipping: "Envío",
    total: "Total",
    whereofVat: (vat) => `incl. ${vat} IVA`,
    shipTo: "Dirección de envío",
    whatsNext: "¿Y ahora?",
    whatsNextBody: "Tus Frame-ID se enviarán en un plazo de 2 días laborables. No hay un correo de envío aparte — solo revisa tu buzón.",
    footer: "¿Preguntas? Responde a este correo.",
  },
};

function pickLang(raw: string | null | undefined): Lang {
  if (raw === "nl" || raw === "fr" || raw === "de" || raw === "en" || raw === "es") return raw;
  return "nl";
}

function formatEUR(cents: number, lang: Lang): string {
  const value = (cents / 100).toFixed(2);
  if (lang === "en") return `€${value}`;
  return `€${value.replace(".", ",")}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type OrderConfirmationInput = {
  to: string;
  lang: string | null | undefined;
  orderId: string; // uuid; we use first 8 chars as reference
  items: Array<{ bundleKey: string; quantity: number; unitPriceCents: number }>;
  amountSubtotalCents: number;
  amountShippingCents: number;
  amountTotalCents: number;
  amountVatCents: number;
  shipping: {
    name: string;
    line1: string;
    postalCode: string;
    city: string;
    country: string;
  };
};

function renderHtml(input: OrderConfirmationInput, lang: Lang): string {
  const t = COPY[lang];
  const labels = BUNDLE_LABELS[lang];
  const ref = input.orderId.replace(/-/g, "").slice(0, 8);

  const itemRows = input.items
    .map((i) => {
      const name = escapeHtml(labels[i.bundleKey] ?? i.bundleKey);
      const lineTotal = formatEUR(i.unitPriceCents * i.quantity, lang);
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid ${BRAND.border};font-size:14px;color:${BRAND.ink};">${name}</td>
          <td style="padding:10px 12px;border-bottom:1px solid ${BRAND.border};font-size:14px;color:${BRAND.ink};text-align:center;">${i.quantity}</td>
          <td style="padding:10px 12px;border-bottom:1px solid ${BRAND.border};font-size:14px;color:${BRAND.ink};text-align:right;">${lineTotal}</td>
        </tr>`;
    })
    .join("");

  const totalStr = formatEUR(input.amountTotalCents, lang);
  const vatStr = formatEUR(input.amountVatCents, lang);
  const subtotalStr = formatEUR(input.amountSubtotalCents, lang);
  const shippingStr = formatEUR(input.amountShippingCents, lang);

  const ship = input.shipping;
  const shipBlock = `
    ${escapeHtml(ship.name)}<br/>
    ${escapeHtml(ship.line1)}<br/>
    ${escapeHtml(ship.postalCode)} ${escapeHtml(ship.city)}<br/>
    ${escapeHtml(ship.country)}
  `;

  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(t.subject(ref))}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.soft};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${BRAND.ink};">
  <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${escapeHtml(t.preview)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.soft};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:${BRAND.bg};border:1px solid ${BRAND.border};border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:22px 28px;background:${BRAND.ink};border-bottom:3px solid ${BRAND.accent};">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                <td style="vertical-align:middle;padding-right:12px;line-height:0;">
                  <img src="${LOGO_URL}" width="36" height="36" alt="Velopass" style="display:block;border:0;outline:none;text-decoration:none;" />
                </td>
                <td style="vertical-align:middle;font-family:'Syne','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">
                  velopass
                </td>
              </tr></table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:${BRAND.ink};">${escapeHtml(t.hi)} ${escapeHtml(ship.name.split(" ")[0] ?? "")},</h1>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:${BRAND.ink};">${escapeHtml(t.thanks)}</p>
              <p style="margin:0 0 24px;font-size:14px;color:${BRAND.muted};">${escapeHtml(t.orderRef)}: <strong style="color:${BRAND.ink};font-family:'SFMono-Regular',Menlo,Consolas,monospace;">#${ref}</strong></p>

              <h2 style="margin:0 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:0.06em;color:${BRAND.muted};">${escapeHtml(t.items)}</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border:1px solid ${BRAND.border};border-radius:8px;overflow:hidden;">
                <thead>
                  <tr style="background:${BRAND.soft};">
                    <th align="left" style="padding:10px 12px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:${BRAND.muted};border-bottom:1px solid ${BRAND.border};">${escapeHtml(t.items)}</th>
                    <th align="center" style="padding:10px 12px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:${BRAND.muted};border-bottom:1px solid ${BRAND.border};">${escapeHtml(t.qty)}</th>
                    <th align="right" style="padding:10px 12px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:${BRAND.muted};border-bottom:1px solid ${BRAND.border};">${escapeHtml(t.amount)}</th>
                  </tr>
                </thead>
                <tbody>${itemRows}</tbody>
                <tfoot>
                  <tr>
                    <td colspan="2" style="padding:10px 12px;font-size:14px;color:${BRAND.muted};text-align:right;">${escapeHtml(t.subtotal)}</td>
                    <td style="padding:10px 12px;font-size:14px;color:${BRAND.ink};text-align:right;">${subtotalStr}</td>
                  </tr>
                  <tr>
                    <td colspan="2" style="padding:6px 12px;font-size:14px;color:${BRAND.muted};text-align:right;">${escapeHtml(t.shipping)}</td>
                    <td style="padding:6px 12px;font-size:14px;color:${BRAND.ink};text-align:right;">${shippingStr}</td>
                  </tr>
                  <tr>
                    <td colspan="2" style="padding:14px 12px;font-size:15px;font-weight:700;color:${BRAND.ink};text-align:right;border-top:1px solid ${BRAND.border};">${escapeHtml(t.total)}</td>
                    <td style="padding:14px 12px;font-size:15px;font-weight:700;color:${BRAND.ink};text-align:right;border-top:1px solid ${BRAND.border};">
                      ${totalStr}
                      <div style="font-size:11px;font-weight:400;color:${BRAND.muted};margin-top:2px;">(${escapeHtml(t.whereofVat(vatStr))})</div>
                    </td>
                  </tr>
                </tfoot>
              </table>

              <h2 style="margin:28px 0 8px;font-size:14px;text-transform:uppercase;letter-spacing:0.06em;color:${BRAND.muted};">${escapeHtml(t.shipTo)}</h2>
              <p style="margin:0;padding:14px 16px;background:${BRAND.soft};border:1px solid ${BRAND.border};border-radius:8px;font-size:14px;line-height:1.5;color:${BRAND.ink};">${shipBlock}</p>

              <h2 style="margin:28px 0 8px;font-size:14px;text-transform:uppercase;letter-spacing:0.06em;color:${BRAND.muted};">${escapeHtml(t.whatsNext)}</h2>
              <p style="margin:0;font-size:14px;line-height:1.55;color:${BRAND.ink};">${escapeHtml(t.whatsNextBody)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px;background:${BRAND.soft};border-top:1px solid ${BRAND.border};font-size:12px;color:${BRAND.muted};text-align:center;">
              ${escapeHtml(t.footer)}<br/>
              <span style="color:${BRAND.muted};">Velopass · velopass.com</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendOrderConfirmationEmail(input: OrderConfirmationInput): Promise<{ ok: true; id?: string } | { ok: false; error: string }> {
  const startedAt = Date.now();
  const logPrefix = `[order-email order=${input.orderId.slice(0, 8)}]`;
  const log = (level: "info" | "warn" | "error", msg: string, extra?: Record<string, unknown>) => {
    const line = `${logPrefix} ${msg}`;
    if (level === "error") console.error(line, extra ?? "");
    else if (level === "warn") console.warn(line, extra ?? "");
    else console.log(line, extra ?? "");
  };

  const writeLog = async (row: {
    status: string;
    resend_id?: string | null;
    http_status?: number | null;
    error_message?: string | null;
    metadata?: Record<string, unknown>;
  }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await (supabaseAdmin.from("email_send_log") as any).insert({
        template: "order_confirmation",
        order_id: input.orderId,
        recipient: input.to ?? null,
        status: row.status,
        resend_id: row.resend_id ?? null,
        http_status: row.http_status ?? null,
        error_message: row.error_message ?? null,
        duration_ms: Date.now() - startedAt,
        metadata: row.metadata ?? null,
      });
    } catch (e) {
      console.error(`${logPrefix} email_send_log insert failed:`, e);
    }
  };

  log("info", "send started", { to: input.to, lang: input.lang, items: input.items.length, total: input.amountTotalCents });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    log("error", "RESEND_API_KEY not configured");
    await writeLog({ status: "config_error", error_message: "RESEND_API_KEY not configured" });
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }
  if (!input.to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.to)) {
    log("error", "invalid recipient", { to: input.to });
    await writeLog({ status: "invalid_recipient", error_message: `Invalid recipient: ${input.to}` });
    return { ok: false, error: "Invalid recipient email" };
  }

  const lang = pickLang(input.lang);
  const t = COPY[lang];
  const ref = input.orderId.replace(/-/g, "").slice(0, 8);
  const html = renderHtml(input, lang);
  const subject = t.subject(ref);

  const lovableKey = process.env.LOVABLE_API_KEY;
  if (!lovableKey) {
    log("error", "LOVABLE_API_KEY not configured");
    await writeLog({ status: "config_error", error_message: "LOVABLE_API_KEY not configured" });
    return { ok: false, error: "LOVABLE_API_KEY not configured" };
  }

  log("info", "calling Resend gateway", { from: EMAIL_FROM, subject, htmlBytes: html.length });

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
        to: [input.to],
        subject,
        html,
      }),
    });
    const body = await res.json().catch(() => ({}));
    const resendId = (body as any)?.id ?? null;

    if (!res.ok) {
      const errorMsg = (body as any)?.message || (body as any)?.error || `Resend HTTP ${res.status}`;
      log("error", "Resend gateway returned error", { httpStatus: res.status, body });
      await writeLog({
        status: "gateway_error",
        http_status: res.status,
        error_message: String(errorMsg).slice(0, 1000),
        metadata: { from: EMAIL_FROM, subject, body },
      });
      return { ok: false, error: errorMsg };
    }

    log("info", "Resend accepted email", { httpStatus: res.status, resendId });
    await writeLog({
      status: "sent",
      http_status: res.status,
      resend_id: resendId,
      metadata: { from: EMAIL_FROM, subject },
    });
    return { ok: true, id: resendId ?? undefined };
  } catch (e: any) {
    const msg = e?.message ? String(e.message) : "Resend request failed";
    log("error", "Resend request threw", { error: msg, stack: e?.stack });
    await writeLog({ status: "exception", error_message: msg.slice(0, 1000) });
    return { ok: false, error: msg };
  }
}
