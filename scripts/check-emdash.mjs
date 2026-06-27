#!/usr/bin/env node
/**
 * Em-dash density check for homepage i18n strings.
 *
 * Em-dashes (—) read as an AI-writing pattern when overused. We keep a
 * small budget per locale so a few intentional uses (hero apposition,
 * core-benefit emphasis) stay possible while regressions get flagged.
 *
 * Limit is enforced per src/i18n/locales/<locale>/home.json file.
 * Bump MAX_EMDASHES intentionally if copy genuinely needs more — don't
 * raise it silently to make CI pass.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = resolve(__dirname, "../src/i18n/locales");
const LOCALES = ["nl", "en", "fr", "de", "es"];
const FILE = "home.json";
const MAX_EMDASHES = 8;
const EMDASH = "—";

function collectStrings(node, out = []) {
  if (typeof node === "string") {
    out.push(node);
  } else if (Array.isArray(node)) {
    for (const v of node) collectStrings(v, out);
  } else if (node && typeof node === "object") {
    for (const v of Object.values(node)) collectStrings(v, out);
  }
  return out;
}

const errors = [];
const summary = [];

for (const locale of LOCALES) {
  const path = join(LOCALES_DIR, locale, FILE);
  const data = JSON.parse(readFileSync(path, "utf8"));
  const strings = collectStrings(data);
  let count = 0;
  const hits = [];
  for (const s of strings) {
    const n = (s.match(/—/g) || []).length;
    if (n > 0) {
      count += n;
      hits.push({ n, s });
    }
  }
  summary.push(`  ${locale}/${FILE}: ${count} em-dash(es) (limit ${MAX_EMDASHES})`);
  if (count > MAX_EMDASHES) {
    errors.push(
      `[${locale}] ${FILE}: ${count} em-dashes exceeds limit of ${MAX_EMDASHES}.\n` +
        hits.map((h) => `      (${h.n}) ${JSON.stringify(h.s)}`).join("\n"),
    );
  }
}

console.log("Em-dash density check:");
for (const line of summary) console.log(line);

if (errors.length) {
  console.error(`\n✗ Em-dash check failed:\n`);
  for (const e of errors) console.error("  - " + e);
  console.error(
    `\nReduce em-dash (${EMDASH}) usage by replacing with full stops, colons, or commas. ` +
      `If the additional dashes are genuinely needed, raise MAX_EMDASHES in scripts/check-emdash.mjs deliberately.\n`,
  );
  process.exit(1);
}

console.log(`\n✓ Em-dash check passed for ${LOCALES.join(", ")}`);
