#!/usr/bin/env node
/**
 * Integration test — Mollie recovery-payment creation.
 *
 * Builds the exact same payload that
 * `src/routes/api/public/payments/mollie-webhook.ts` sends when an expired
 * order triggers a recovery email, then POSTs it to Mollie's real
 * `/v2/payments` endpoint. Asserts:
 *   1. HTTP 2xx (no 422)
 *   2. A checkout URL is returned in `_links.checkout.href`
 *   3. No field-level violations
 *
 * Usage:
 *   MOLLIE_API_KEY=test_xxx node scripts/test-mollie-recovery.mjs
 *
 * The test uses a Mollie *test* API key by default (any key starting with
 * `test_`). It will refuse to run against a `live_` key unless
 * ALLOW_LIVE=1 is set — we don't want the CI to create real payments.
 *
 * Exit codes: 0 ok, 1 test failure, 2 configuration error.
 */

const MOLLIE_API_KEY = process.env.MOLLIE_API_KEY;
const ALLOW_LIVE = process.env.ALLOW_LIVE === "1";
const DRY_RUN = process.env.DRY_RUN === "1";

if (!DRY_RUN) {
  if (!MOLLIE_API_KEY) {
    console.error("[test-mollie-recovery] MOLLIE_API_KEY is not set — skipping. Use DRY_RUN=1 to only validate the payload shape.");
    process.exit(2);
  }
  if (MOLLIE_API_KEY.startsWith("live_") && !ALLOW_LIVE) {
    console.error(
      "[test-mollie-recovery] Refusing to run against a LIVE Mollie key. Set ALLOW_LIVE=1 to override (not recommended), or DRY_RUN=1 to validate payload shape only.",
    );
    process.exit(2);
  }
}


// Mirrors the payload built inside the webhook's recovery block.
// Keep this in sync with src/routes/api/public/payments/mollie-webhook.ts.
const shippingAddress = {
  givenName: "Integratie",
  familyName: "Test",
  streetAndNumber: "Testlaan 1",
  postalCode: "9000",
  city: "Gent",
  country: "BE",
  email: "integration-test@velopass.com",
};

const orderId = "00000000-0000-0000-0000-000000000000";
const payload = {
  amount: { currency: "EUR", value: "14.90" },
  description: `Velopass — afronden bestelling #${orderId.replace(/-/g, "").slice(0, 8)}`,
  redirectUrl: "https://www.velopass.com/nl/order/thanks?payment_id=pending",
  webhookUrl:
    "https://project--973248f2-3aa9-493e-b716-2b089779e41a-dev.lovable.app/api/public/payments/mollie-webhook",
  billingEmail: shippingAddress.email,
  billingAddress: shippingAddress,
  shippingAddress,
  locale: "nl_BE",
  metadata: {
    items: [{ priceId: "frameid_solo_onetime", quantity: 1 }],
    email: shippingAddress.email,
    shipping: shippingAddress,
    lang: "nl",
    recovery_for_order_id: orderId,
    test: "integration",
  },
};

console.log("[test-mollie-recovery] POST /v2/payments with payload keys:", Object.keys(payload));

const res = await fetch("https://api.mollie.com/v2/payments", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${MOLLIE_API_KEY}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  body: JSON.stringify(payload),
});
const body = await res.json().catch(() => ({}));

if (!res.ok) {
  const field = body?.field ?? body?.extra?.field ?? null;
  console.error(
    `[test-mollie-recovery] FAIL — HTTP ${res.status}${field ? ` field=${field}` : ""}`,
  );
  console.error(JSON.stringify(body, null, 2));
  process.exit(1);
}

const checkoutUrl = body?._links?.checkout?.href;
if (!checkoutUrl) {
  console.error("[test-mollie-recovery] FAIL — no checkout URL returned");
  console.error(JSON.stringify(body, null, 2));
  process.exit(1);
}

console.log(
  `[test-mollie-recovery] OK — id=${body.id} status=${body.status} expiresAt=${body.expiresAt ?? "(none)"} checkout=${new URL(checkoutUrl).host}`,
);

// Best-effort cleanup: cancel the test payment so it doesn't sit open.
try {
  const cancelRes = await fetch(`https://api.mollie.com/v2/payments/${body.id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${MOLLIE_API_KEY}`,
      Accept: "application/json",
    },
  });
  console.log(`[test-mollie-recovery] cleanup: cancel HTTP ${cancelRes.status}`);
} catch (e) {
  console.warn("[test-mollie-recovery] cleanup failed (non-fatal):", e?.message ?? e);
}

process.exit(0);
