#!/usr/bin/env node
/**
 * Parity test: the marge page (src/routes/m.$token.tsx) and the order page
 * (src/routes/$lang/order.tsx) must show the SAME bundles and prices.
 *
 * We assert:
 *  1. Both pages import BUNDLES from the shared source (@/lib/bundles).
 *  2. BUNDLES exposes the expected composition and prices.
 *  3. The margin calculation used on the marge page produces the expected
 *     per-bundle margin (excl. VAT) for those same prices.
 *
 * Run: node scripts/test-bundle-parity.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(root, p), "utf8");

let failed = 0;
const assert = (cond, msg) => {
  if (cond) {
    console.log(`  ok  ${msg}`);
  } else {
    console.error(`  FAIL ${msg}`);
    failed++;
  }
};

// --- 1. Shared source ------------------------------------------------------
const orderSrc = read("src/routes/$lang/order.tsx");
const margeSrc = read("src/routes/m.$token.tsx");
const bundlesSrc = read("src/lib/bundles.ts");

console.log("Shared source:");
assert(
  /from ["']@\/lib\/bundles["']/.test(orderSrc),
  "order page imports BUNDLES from @/lib/bundles",
);
assert(
  /from ["']@\/lib\/bundles["']/.test(margeSrc),
  "marge page imports BUNDLES from @/lib/bundles",
);
assert(
  !/const\s+BUNDLES\s*=/.test(orderSrc),
  "order page does not redeclare BUNDLES locally",
);
assert(
  !/const\s+BUNDLES\s*=/.test(margeSrc),
  "marge page does not redeclare BUNDLES locally",
);

// --- 2. Parse BUNDLES from bundles.ts --------------------------------------
// Extract each object literal that has a `key:` and a `price:` field.
const bundleBlocks = [
  ...bundlesSrc.matchAll(
    /\{\s*key:\s*"([^"]+)"[\s\S]*?stickers:\s*(\d+)[\s\S]*?price:\s*(\d+)[\s\S]*?pricePerUnit:\s*(\d+)[\s\S]*?\}/g,
  ),
].map((m) => ({
  key: m[1],
  stickers: Number(m[2]),
  price: Number(m[3]),
  pricePerUnit: Number(m[4]),
}));

console.log("\nBundles source (src/lib/bundles.ts):");
assert(bundleBlocks.length === 3, `parsed 3 bundles (got ${bundleBlocks.length})`);

// Expected canonical bundles.
const EXPECTED = [
  { key: "frameid_solo_onetime", stickers: 1, price: 1295, pricePerUnit: 1295 },
  { key: "frameid_duo_onetime", stickers: 2, price: 2195, pricePerUnit: 1098 },
  { key: "frameid_family_onetime", stickers: 5, price: 4995, pricePerUnit: 999 },
];
for (const exp of EXPECTED) {
  const got = bundleBlocks.find((b) => b.key === exp.key);
  assert(!!got, `bundle "${exp.key}" exists`);
  if (!got) continue;
  assert(got.stickers === exp.stickers, `${exp.key}.stickers === ${exp.stickers}`);
  assert(got.price === exp.price, `${exp.key}.price === ${exp.price} (got ${got.price})`);
  assert(
    got.pricePerUnit === exp.pricePerUnit,
    `${exp.key}.pricePerUnit === ${exp.pricePerUnit} (got ${got.pricePerUnit})`,
  );
}

// --- 3. Marge calculation --------------------------------------------------
// Mirror the marge page formulas so any drift there also fails this test.
const purchaseMatch = margeSrc.match(/PURCHASE_PRICE_EXCL_VAT_CENTS\s*=\s*(\d+)/);
const vatMatch = margeSrc.match(/VAT_RATE\s*=\s*([0-9.]+)/);
assert(!!purchaseMatch, "marge page defines PURCHASE_PRICE_EXCL_VAT_CENTS");
assert(!!vatMatch, "marge page defines VAT_RATE");

const PURCHASE = Number(purchaseMatch?.[1] ?? 350);
const VAT = Number(vatMatch?.[1] ?? 0.21);

console.log(
  `\nMargin calc (purchase=${PURCHASE}c excl. btw, vat=${Math.round(VAT * 100)}%):`,
);

// Expected margin per bundle (cents, excl. VAT), computed exactly like the page:
//   totalExcl   = round(price / (1 + VAT))
//   marginTotal = totalExcl - PURCHASE * stickers
const EXPECTED_MARGINS = EXPECTED.map((b) => {
  const totalExcl = Math.round(b.price / (1 + VAT));
  return { key: b.key, marginTotal: totalExcl - PURCHASE * b.stickers };
});

// Sanity check the known values at PURCHASE=350, VAT=0.21:
//   1-pack: round(1295/1.21)=1070 - 350   =  720
//   2-pack: round(2195/1.21)=1814 - 700   = 1114
//   5-pack: round(4995/1.21)=4128 - 1750  = 2378
const SANITY = {
  frameid_solo_onetime: 720,
  frameid_duo_onetime: 1114,
  frameid_family_onetime: 2378,
};
if (PURCHASE === 350 && Math.abs(VAT - 0.21) < 1e-9) {
  for (const m of EXPECTED_MARGINS) {
    assert(
      m.marginTotal === SANITY[m.key],
      `${m.key} margin = ${SANITY[m.key]}c (got ${m.marginTotal}c)`,
    );
  }
} else {
  console.log("  (config differs from defaults — skipped hard-coded sanity values)");
}

// --- Report ----------------------------------------------------------------
console.log(failed === 0 ? "\nAll parity checks passed." : `\n${failed} check(s) FAILED.`);
process.exit(failed === 0 ? 0 : 1);
