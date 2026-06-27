#!/usr/bin/env node
/**
 * i18n validation: ensures all locales (NL/EN/FR/DE) have the same keys
 * as the reference locale (NL), and no value is empty or looks like an
 * un-replaced placeholder key (e.g. "paths.shop.tag").
 *
 * Exits non-zero on failure so it can gate the build (`prebuild` script).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = resolve(__dirname, "../src/i18n/locales");
const REFERENCE = "nl";
const LOCALES = ["nl", "en", "fr", "de", "es"];

// Matches strings that look like an i18n key path (e.g. "paths.shop.tag",
// "hero.cta_primary"). Heuristic: lowercase dotted segment(s), no spaces,
// no punctuation typical of real copy.
const PLACEHOLDER_RE = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/i;

function flatten(obj, prefix = "") {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flatten(v, key));
    } else {
      out[key] = v;
    }
  }
  return out;
}

function loadNamespaces(locale) {
  const dir = join(LOCALES_DIR, locale);
  if (!statSync(dir).isDirectory()) return {};
  const ns = {};
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    const name = file.replace(/\.json$/, "");
    ns[name] = JSON.parse(readFileSync(join(dir, file), "utf8"));
  }
  return ns;
}

const errors = [];
const reference = loadNamespaces(REFERENCE);

for (const locale of LOCALES) {
  const data = loadNamespaces(locale);
  for (const ns of Object.keys(reference)) {
    if (!data[ns]) {
      errors.push(`[${locale}] missing namespace: ${ns}.json`);
      continue;
    }
    const refFlat = flatten(reference[ns]);
    const curFlat = flatten(data[ns]);

    for (const key of Object.keys(refFlat)) {
      if (key.startsWith("_")) continue; // skip meta flags like _translated
      if (!(key in curFlat)) {
        errors.push(`[${locale}] ${ns}: missing key "${key}"`);
        continue;
      }
      const val = curFlat[key];
      if (typeof val !== "string") continue;
      if (val.trim() === "") {
        errors.push(`[${locale}] ${ns}: empty value at "${key}"`);
      } else if (PLACEHOLDER_RE.test(val.trim())) {
        errors.push(
          `[${locale}] ${ns}: value at "${key}" looks like an un-replaced key ("${val}")`,
        );
      }
    }
    for (const key of Object.keys(curFlat)) {
      if (key.startsWith("_")) continue;
      if (!(key in refFlat)) {
        errors.push(
          `[${locale}] ${ns}: extra key "${key}" not in reference (${REFERENCE})`,
        );
      }
    }
  }
}

if (errors.length) {
  console.error(`\nâœ— i18n validation failed (${errors.length} issue(s)):\n`);
  for (const e of errors) console.error("  - " + e);
  console.error("");
  process.exit(1);
}
console.log(`âœ“ i18n validation passed for ${LOCALES.join(", ")}`);
