import assert from "node:assert/strict";
import { normalizeShopId, captureShopFromSearch, readStoredShopId, TTL_MS } from "../src/lib/shop-attribution.ts";
import { buildConsumerOrderPayload } from "../src/lib/b2b/build-payload.server.ts";

function mem() {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) };
}

// Normalise: trim + lowercase; invalid ignored.
assert.equal(normalizeShopId("  VeloCafeLiege4821 "), "velocafeliege4821");
assert.equal(normalizeShopId("velo-cafe"), null);
assert.equal(normalizeShopId("a".repeat(65)), null);
assert.equal(normalizeShopId(""), null);

// 30 days, last click wins.
const s = mem();
const t0 = 1_000_000;
captureShopFromSearch("?shopID=shopone", t0, s);
assert.equal(readStoredShopId(t0 + TTL_MS - 1, s), "shopone");
captureShopFromSearch("?shopID=SHOPTWO", t0 + 1, s);
assert.equal(readStoredShopId(t0 + 2, s), "shoptwo");
assert.equal(readStoredShopId(t0 + 1 + TTL_MS + 1, s), null);
assert.equal(TTL_MS, 30 * 24 * 60 * 60 * 1000);

// Invalid value does not replace a valid stored one.
captureShopFromSearch("?shopID=shopthree", t0, s);
captureShopFromSearch("?shopID=bad_id!", t0 + 5, s);
assert.equal(readStoredShopId(t0 + 6, s), "shopthree");

// Storage failure: memory fallback.
const broken = { getItem() { throw new Error("x"); }, setItem() { throw new Error("x"); }, removeItem() { throw new Error("x"); } };
captureShopFromSearch("?shopID=memshop", t0, broken);
assert.equal(readStoredShopId(t0 + 1, broken), "memshop");

// Payload: present when set, omitted otherwise.
const order = { id: "o1", customer_email: "a@b.c", lang: "nl", shipping_country: "BE", amount_total: 1295, amount_shipping: 195 };
const lines = [{ bundle_key: "frameid_solo_onetime", quantity: 1, unit_price_cents: 1100 }];
assert.equal(buildConsumerOrderPayload({ ...order, affiliate_shop_public_id: "shopone" }, lines, {}).affiliateShopPublicId, "shopone");
assert.equal("affiliateShopPublicId" in buildConsumerOrderPayload(order, lines, {}), false);

console.log("Shop attribution rules passed.");
