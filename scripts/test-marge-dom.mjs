#!/usr/bin/env node
/**
 * DOM parity test for the margetoelichting page.
 *
 * Loads /m/<TOKEN> in a headless browser and asserts that the per-bundle
 * margin values, price labels, and framing text rendered in the DOM match
 * exactly what our margin calculation script produces from src/lib/bundles.ts
 * and the constants in src/routes/m.$token.tsx.
 *
 * Requires a running dev server on http://localhost:8080.
 * Run: node scripts/test-marge-dom.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(root, p), "utf8");

const margeSrc = read("src/routes/m.$token.tsx");
const bundlesSrc = read("src/lib/bundles.ts");

const TOKEN = margeSrc.match(/const TOKEN = "([^"]+)"/)[1];
const PURCHASE = Number(margeSrc.match(/PURCHASE_PRICE_EXCL_VAT_CENTS\s*=\s*(\d+)/)[1]);
const VAT = Number(margeSrc.match(/VAT_RATE\s*=\s*([0-9.]+)/)[1]);

const BUNDLES = [
  ...bundlesSrc.matchAll(
    /\{\s*key:\s*"([^"]+)"[\s\S]*?stickers:\s*(\d+)[\s\S]*?price:\s*(\d+)/g,
  ),
].map((m) => ({ key: m[1], stickers: Number(m[2]), price: Number(m[3]) }));

const EXPECTED_FRAMING =
  "De marge op de Frame-ID is mooi meegenomen. Maar de echte winst zit in de klant die terugkomt — voor alles wat daarna volgt.";

const eur = (cents) =>
  new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);

const expected = BUNDLES.map((b) => {
  const priceExcl = Math.round(b.price / (1 + VAT));
  const marginTotal = priceExcl - PURCHASE * b.stickers;
  const marginPerUnit = Math.round(marginTotal / b.stickers);
  const pct = Math.round((marginTotal / priceExcl) * 100);
  return { ...b, priceExcl, marginTotal, marginPerUnit, pct };
});

let failed = 0;
const assert = (cond, msg) => {
  if (cond) console.log(`  ok  ${msg}`);
  else { console.error(`  FAIL ${msg}`); failed++; }
};
const eq = (a, b, msg) => assert(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);

const url = `http://localhost:8080/m/${TOKEN}`;
console.log(`Loading ${url}`);

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const resp = await page.goto(url, { waitUntil: "networkidle" });
  assert(resp?.ok(), `page responded 2xx (got ${resp?.status()})`);

  await page.waitForSelector('[data-testid="bundle-card"]');

  const cards = await page.$$eval('[data-testid="bundle-card"]', (els) =>
    els.map((el) => ({
      key: el.getAttribute("data-bundle-key"),
      stickers: Number(el.getAttribute("data-stickers")),
      marginCents: Number(el.getAttribute("data-margin-cents")),
      marginPerUnitCents: Number(el.getAttribute("data-margin-per-unit-cents")),
      priceInclCents: Number(el.getAttribute("data-price-incl-cents")),
      priceExclCents: Number(el.getAttribute("data-price-excl-cents")),
      pct: Number(el.getAttribute("data-pct")),
      marginText: el.querySelector('[data-testid="margin-value"]')?.textContent?.trim(),
      pctText: el.querySelector('[data-testid="margin-pct"]')?.textContent?.trim(),
      perUnitText: el.querySelector('[data-testid="margin-per-unit"]')?.textContent?.trim(),
      priceInclText: el.querySelector('[data-testid="price-incl"]')?.textContent?.trim(),
      priceExclText: el.querySelector('[data-testid="price-excl"]')?.textContent?.trim(),
    })),
  );

  eq(cards.length, expected.length, "rendered card count");

  for (const exp of expected) {
    const got = cards.find((c) => c.key === exp.key);
    assert(!!got, `card rendered for ${exp.key}`);
    if (!got) continue;
    console.log(`\n[${exp.key}]`);
    eq(got.stickers, exp.stickers, "data-stickers");
    eq(got.priceInclCents, exp.price, "data-price-incl-cents");
    eq(got.priceExclCents, exp.priceExcl, "data-price-excl-cents");
    eq(got.marginCents, exp.marginTotal, "data-margin-cents");
    eq(got.marginPerUnitCents, exp.marginPerUnit, "data-margin-per-unit-cents");
    eq(got.pct, exp.pct, "data-pct");
    eq(got.priceInclText, eur(exp.price), "price-incl label");
    eq(got.priceExclText, eur(exp.priceExcl), "price-excl label");
    eq(got.marginText, eur(exp.marginTotal), "margin label");
    eq(got.pctText, `${exp.pct}% van verkoopprijs excl. btw`, "margin-pct label");
    eq(got.perUnitText, `${eur(exp.marginPerUnit)} marge / Frame-ID`, "per-unit label");
  }

  const framing = (await page.textContent('[data-testid="framing"]'))?.trim();
  console.log("\n[framing]");
  eq(framing, EXPECTED_FRAMING, "framing text");
} finally {
  await browser.close();
}

console.log(failed === 0 ? "\nAll DOM parity checks passed." : `\n${failed} check(s) FAILED.`);
process.exit(failed === 0 ? 0 : 1);
