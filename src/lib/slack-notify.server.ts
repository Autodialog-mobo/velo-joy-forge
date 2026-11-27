// Posts a new shop signup to Slack via an Incoming Webhook (SLACK_WEBHOOK_URL).
// Never throws: a Slack failure must not break the signup.
export type SlackSignup = {
  id: string;
  shopName: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  address?: string;
  country?: string;
  vat?: string;
  posSystem?: string;
  posOther?: string;
  lang: string;
};

export async function notifySlackShopSignup(s: SlackSignup): Promise<boolean> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return false;
  const contact = [s.firstName, s.lastName].filter(Boolean).join(" ") || "—";
  const pos = s.posSystem === "other" && s.posOther ? `Other: ${s.posOther}` : s.posSystem || "—";
  const field = (label: string, v?: string) => ({ type: "mrkdwn", text: `*${label}*\n${v || "—"}` });
  const body = {
    text: `Nieuwe winkelaanmelding: ${s.shopName}`,
    blocks: [
      { type: "header", text: { type: "plain_text", text: `🚲 Nieuwe winkelaanmelding: ${s.shopName}`.slice(0, 150) } },
      {
        type: "section",
        fields: [
          field("Contact", contact),
          field("E-mail", s.email),
          field("Telefoon", s.phone),
          field("Btw", s.vat),
          field("Adres", [s.address, s.country].filter(Boolean).join(", ")),
          field("Kassasysteem", pos),
          field("Taal", s.lang.toUpperCase()),
        ],
      },
      {
        type: "actions",
        elements: [{ type: "button", text: { type: "plain_text", text: "Bekijk in beheer" }, url: "https://www.velopass.com/admin-shop-signups" }],
      },
    ],
  };
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) console.error(`[slack] webhook failed [${res.status}]: ${await res.text()}`);
    return res.ok;
  } catch (err) {
    console.error("[slack] webhook threw", err);
    return false;
  }
}
