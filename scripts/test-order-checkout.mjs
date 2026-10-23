import assert from "node:assert/strict";
import { isOnlineCheckoutAllowed } from "../src/lib/order-checkout.ts";

assert.equal(isOnlineCheckoutAllowed("FR"), false, "France must not allow online checkout");
for (const country of ["BE", "NL", "LU", "DE"]) {
  assert.equal(isOnlineCheckoutAllowed(country), true, `${country} checkout must remain available`);
}
console.log("Order checkout country rules passed (FR blocked; BE/NL/LU/DE unchanged).");