// Server-only: sends the Velopass "finish your order" recovery email via Resend.
// Triggered when a Mollie payment expires without ever being paid.

type Lang = "nl" | "fr" | "de" | "en";

const EMAIL_FROM = "Velopass <go@velopass.com>";

const BRAND = {
  bg: "#ffffff",
  ink: "#0D1F3C",
  muted: "#64748B",
  border: "#E2E8F0",
  accent: "#2ECC8A",
  soft: "#F6F9F7",
};

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
};

type Strings = {
  subject: string;
  preview: string;
  hi: string;
  intro: string;
  noWorries: string;
  cta: string;
  items: string;
  qty: string;
  amount: string;
  subtotal: string;
  shipping: string;
  total: string;
  orderRef: string;
  validUntil: string;
  footer: string;
};

const COPY: Record<Lang, Strings> = {
  nl: {
    subject: "Je bestelling afronden bij Velopass",
    preview: "Je was er bijna — rond je bestelling af wanneer het je uitkomt.",
    hi: "Hallo",
    intro: "Je begon een bestelling bij Velopass maar de betaling werd niet afgerond.",
    noWorries: "Geen probleem — rond hem af wanneer het je uitkomt.",
    cta: "Bestelling afronden",
    items: "Je bestelling",
    qty: "Aantal",
    amount: "Bedrag",
    subtotal: "Subtotaal",
    shipping: "Verzending",
    total: "Totaal",
    orderRef: "Bestelnummer",
    validUntil: "Deze betaallink is geldig tot {{date}}.",
    footer: "Vragen? Antwoord gewoon op deze mail.",
  },
  fr: {
    subject: "Finalise ta commande chez Velopass",
    preview: "Tu y étais presque — finalise ta commande quand tu veux.",
    hi: "Bonjour",
    intro: "Tu as commencé une commande chez Velopass mais le paiement n'a pas été finalisé.",
    noWorries: "Pas de souci — finalise-la quand tu veux.",
    cta: "Finaliser la commande",
    items: "Ta commande",
    qty: "Quantité",
    amount: "Montant",
    subtotal: "Sous-total",
    shipping: "Livraison",
    total: "Total",
    orderRef: "Numéro de commande",
    validUntil: "Ce lien de paiement est valable jusqu'au {{date}}.",
    footer: "Des questions ? Réponds simplement à ce message.",
  },
  de: {
    subject: "Schließe deine Bestellung bei Velopass ab",
    preview: "Du warst fast da — schließe deine Bestellung ab, wann es dir passt.",
    hi: "Hallo",
    intro: "Du hast eine Bestellung bei Velopass begonnen, aber die Zahlung wurde nicht abgeschlossen.",
    noWorries: "Kein Problem — schließe sie ab, wann es dir passt.",
    cta: "Bestellung abschließen",
    items: "Deine Bestellung",
    qty: "Anzahl",
    amount: "Betrag",
    subtotal: "Zwischensumme",
    shipping: "Versand",
    total: "Gesamt",
    orderRef: "Bestellnummer",
    validUntil: "Dieser Zahlungslink ist gültig bis zum {{date}}.",
    footer: "Fragen? Antworte einfach auf diese E-Mail.",
  },
  en: {
    subject: "Finish your Velopass order",
    preview: "You were almost there — finish your order whenever it suits you.",
    hi: "Hi",
    intro: "You started an order with Velopass but the payment wasn't completed.",
    noWorries: "No worries — finish it whenever it suits you.",
    cta: "Finish my order",
    items: "Your order",
    qty: "Qty",
    amount: "Amount",
    subtotal: "Subtotal",
    shipping: "Shipping",
    total: "Total",
    orderRef: "Order number",
    validUntil: "This payment link is valid until {{date}}.",
    footer: "Questions? Just reply to this email.",
  },
};

const DATE_LOCALES: Record<Lang, string> = {
  nl: "nl-NL",
  fr: "fr-FR",
  de: "de-DE",
  en: "en-GB",
};

function formatExpiry(iso: string | null | undefined, lang: Lang): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  try {
    return new Intl.DateTimeFormat(DATE_LOCALES[lang], {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

function pickLang(raw: string | null | undefined): Lang {
  if (raw === "nl" || raw === "fr" || raw === "de" || raw === "en") return raw;
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

export type OrderRecoveryInput = {
  to: string;
  lang: string | null | undefined;
  orderId: string;
  checkoutUrl: string;
  items: Array<{ bundleKey: string; quantity: number; unitPriceCents: number }>;
  amountSubtotalCents: number;
  amountShippingCents: number;
  amountTotalCents: number;
  firstName?: string | null;
  expiresAt?: string | null;
};

function renderHtml(input: OrderRecoveryInput, lang: Lang): string {
  const t = COPY[lang];
  const labels = BUNDLE_LABELS[lang];
  const ref = input.orderId.replace(/-/g, "").slice(0, 8);
  const checkoutUrl = escapeHtml(input.checkoutUrl);

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

  const subtotalStr = formatEUR(input.amountSubtotalCents, lang);
  const shippingStr = formatEUR(input.amountShippingCents, lang);
  const totalStr = formatEUR(input.amountTotalCents, lang);
  const firstName = (input.firstName ?? "").trim();
  const expiryFormatted = formatExpiry(input.expiresAt, lang);
  const validUntilHtml = expiryFormatted
    ? `<p style="margin:0 0 24px;font-size:13px;color:${BRAND.muted};">${escapeHtml(
        t.validUntil.replace("{{date}}", expiryFormatted),
      )}</p>`
    : "";

  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(t.subject)}</title>
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
              <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:${BRAND.ink};">${escapeHtml(t.hi)}${firstName ? " " + escapeHtml(firstName) : ""},</h1>
              <p style="margin:0 0 8px;font-size:15px;line-height:1.55;color:${BRAND.ink};">${escapeHtml(t.intro)}</p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:${BRAND.ink};">${escapeHtml(t.noWorries)}</p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
                <tr><td style="border-radius:10px;background:${BRAND.accent};">
                  <a href="${checkoutUrl}" style="display:inline-block;padding:14px 26px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(t.cta)}</a>
                </td></tr>
              </table>

              <p style="margin:0 0 24px;font-size:12px;color:${BRAND.muted};word-break:break-all;">
                <a href="${checkoutUrl}" style="color:${BRAND.muted};">${checkoutUrl}</a>
              </p>

              <h2 style="margin:0 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:0.06em;color:${BRAND.muted};">${escapeHtml(t.items)}</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border:1px solid ${BRAND.border};border-radius:8px;overflow:hidden;">
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
                    <td style="padding:14px 12px;font-size:15px;font-weight:700;color:${BRAND.ink};text-align:right;border-top:1px solid ${BRAND.border};">${totalStr}</td>
                  </tr>
                </tfoot>
              </table>

              <p style="margin:20px 0 0;font-size:13px;color:${BRAND.muted};">${escapeHtml(t.orderRef)}: <strong style="color:${BRAND.ink};font-family:'SFMono-Regular',Menlo,Consolas,monospace;">#${ref}</strong></p>
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

export async function sendOrderRecoveryEmail(
  input: OrderRecoveryInput,
): Promise<{ ok: true; id?: string } | { ok: false; error: string }> {
  const startedAt = Date.now();
  const logPrefix = `[order-recovery order=${input.orderId.slice(0, 8)}]`;
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
        template: "order_recovery",
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

  const lovableKey = process.env.LOVABLE_API_KEY;
  if (!lovableKey) {
    log("error", "LOVABLE_API_KEY not configured");
    await writeLog({ status: "config_error", error_message: "LOVABLE_API_KEY not configured" });
    return { ok: false, error: "LOVABLE_API_KEY not configured" };
  }

  const lang = pickLang(input.lang);
  const t = COPY[lang];
  const html = renderHtml(input, lang);

  log("info", "calling Resend gateway", { from: EMAIL_FROM, subject: t.subject, htmlBytes: html.length });

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
        subject: t.subject,
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
        metadata: { from: EMAIL_FROM, subject: t.subject, body },
      });
      return { ok: false, error: errorMsg };
    }

    log("info", "Resend accepted email", { httpStatus: res.status, resendId });
    await writeLog({
      status: "sent",
      http_status: res.status,
      resend_id: resendId,
      metadata: { from: EMAIL_FROM, subject: t.subject },
    });
    return { ok: true, id: resendId ?? undefined };
  } catch (e: any) {
    const msg = e?.message ? String(e.message) : "Resend request failed";
    log("error", "Resend request threw", { error: msg, stack: e?.stack });
    await writeLog({ status: "exception", error_message: msg.slice(0, 1000) });
    return { ok: false, error: msg };
  }
}
