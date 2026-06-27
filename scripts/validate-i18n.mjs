#!/usr/bin/env node
/**
 * i18n validation & coverage check.
 *
 * Always fails on:
 *   - missing namespace / missing key
 *   - empty string value
 *   - value that looks like an un-replaced key path (e.g. "paths.shop.tag")
 *
 * Coverage checks (treated as ERRORS in --strict / CI_STRICT_I18N=1,
 * otherwise WARNINGS so day-to-day dev keeps working):
 *   - namespace has `_translated: false` meta flag
 *   - non-reference value is byte-identical to the reference locale
 *     (likely an untranslated fallback that was copy-pasted)
 *
 * Prints a per-locale coverage table at the end.
 *
 * Exits non-zero on any ERROR. Run with --strict before publishing.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = resolve(__dirname, "../src/i18n/locales");
const REFERENCE = "nl";
const LOCALES = ["nl", "en", "fr", "de", "es"];

const STRICT =
  process.argv.includes("--strict") ||
  process.env.CI_STRICT_I18N === "1" ||
  process.env.LOVABLE_PUBLISH === "1";

// Strings that intentionally stay identical across locales (brand, codes,
// proper nouns, technical tokens). Skip the fallback-equality heuristic for
// these values.
const ALLOW_IDENTICAL_VALUES = new Set([
  // Brand / technical / single-token
  "Velopass", "Frame-ID", "Frame-ID's", "Mollie", "Resend", "QR", "PDF", "OK", "—", "·",
  "Velopass Pro", "Pro App", "Decal", "Pro tip",
  // Loanwords / English terms used as-is in NL (and often FR/DE/ES too)
  "Community", "Menu", "Contact", "Privacy", "WhatsApp", "Model", "Type",
  "Reminders", "Social media", "Open Velopass", "Via AI (ChatGPT, …)",
  "E-mail", "Email",
  // Country / city / region proper nouns
  "Europa", "Luxemburg", "Gent", "Land",
  // Shared short interjections / brand tagline fragments that match by design
  "Alles", "Automatisch →", "AUTOMATISCH", "1 scan →", "Hallo Velopass,",
  "Frame-ID bestellen",
  // Brand product names (kept verbatim across locales)
  "Velopass Frame-ID Solo", "Velopass Frame-ID Duo",
  "Velopass Pro — Every bike. A customer for life.",
  "Every bike. A customer for life.",
  "Contact — Velopass", "© 2026 Velopass",
  // Proper nouns / institutional badges
  "FNUCI · République Française",
  // Country-localised cross-section CTAs (already in the target country's language)
  "Déposer plainte en ligne →",
  "Anzeige über die Onlinewache →",
  "Check gevondenfietsen.be",
  // Brand-name placeholder list (proper nouns)
  "Trek, Specialized, Gazelle…",
]);

// Keys whose values are legitimately identical to the reference (e.g. shared
// brand tagline slots, country-specific CTAs stored under cross-section keys).
const ALLOW_IDENTICAL_KEY_PATTERNS = [
  /(^|\.)footer\.copy$/,
  /(^|\.)footer\.tagline_pro$/,
  /(^|\.)meta\.title$/,
  /(^|\.)bundles\.frameid_(solo|duo)_onetime$/,
  /(^|\.)fab\.flow/,
  /(^|\.)fnuci_badge$/,
  /_(fr|de|nl|en|es)_primary$/,
  /\.NL\.tip\d+_title$/,
  /(^|\.)method_b\.brand_placeholder$/,
  /(^|\.)country(_[a-z]+)?$/,
  /(^|\.)country_label$/,
  /(^|\.)city_placeholder$/,
  /(^|\.)community\.stat\d+Num$/,
  /(^|\.)hero\.dash\.subtitle$/,
  /(^|\.)hero\.dash\.stat\d+Label$/,
  /(^|\.)hero\.title_line_\d+_em$/,
  /(^|\.)rider\.wa_message_intro$/,
  /(^|\.)rider\.wa_message_email$/,
  /(^|\.)form\.email$/,
  /(^|\.)nav\.(community|menu|menu_label|menuLabel|contact|leasing|order_sticker)$/,
  /(^|\.)footer\.(privacy|contact)$/,
  /(^|\.)section\.support_whatsapp$/,
  /(^|\.)cart\.referral_(social|ai)$/,
  /(^|\.)bundles\.plural_label$/,
  /(^|\.)pro_tip\.label$/,
  /(^|\.)how\.step1\.appLabel$/,
  /(^|\.)fab\.(feat1Title|badgeDecal)$/,
  /(^|\.)bike_details\.(model|type)$/,
  /(^|\.)registerForm\.vat_placeholder$/,
];

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

function isShortToken(v) {
  // Numbers, single chars, URLs, emails — these legitimately repeat across locales.
  if (!v) return true;
  if (v.length <= 2) return true;
  if (/^https?:\/\//i.test(v)) return true;
  if (/^[\w.+-]+@[\w.-]+$/.test(v)) return true;
  if (/^[\d\s.,:/+-]+$/.test(v)) return true;
  return false;
}

const errors = [];
const warnings = [];
const coverage = {}; // locale -> { total, translated, fallback, missing, untranslatedFlag }

const reference = loadNamespaces(REFERENCE);

for (const locale of LOCALES) {
  const data = loadNamespaces(locale);
  const stats = {
    total: 0,
    translated: 0,
    fallback: 0,
    missing: 0,
    empty: 0,
    untranslatedNs: [],
  };

  for (const ns of Object.keys(reference)) {
    if (!data[ns]) {
      errors.push(`[${locale}] missing namespace: ${ns}.json`);
      continue;
    }

    const refFlat = flatten(reference[ns]);
    const curFlat = flatten(data[ns]);

    // `_translated: false` meta flag
    if (data[ns]._translated === false && locale !== REFERENCE) {
      stats.untranslatedNs.push(ns);
      const msg = `[${locale}] ${ns}: namespace marked _translated: false (needs native review)`;
      (STRICT ? errors : warnings).push(msg);
    }

    for (const key of Object.keys(refFlat)) {
      if (key.startsWith("_") || key.includes("._")) continue;
      stats.total += 1;

      if (!(key in curFlat)) {
        errors.push(`[${locale}] ${ns}: missing key "${key}"`);
        stats.missing += 1;
        continue;
      }
      const val = curFlat[key];
      if (typeof val !== "string") {
        stats.translated += 1;
        continue;
      }
      const trimmed = val.trim();
      if (trimmed === "") {
        errors.push(`[${locale}] ${ns}: empty value at "${key}"`);
        stats.empty += 1;
        continue;
      }
      if (PLACEHOLDER_RE.test(trimmed)) {
        errors.push(
          `[${locale}] ${ns}: value at "${key}" looks like an un-replaced key ("${val}")`,
        );
        continue;
      }

      // Fallback heuristic: identical to reference locale.
      if (locale !== REFERENCE) {
        const refVal = refFlat[key];
        const fullKey = `${ns}.${key}`;
        const keyAllowed = ALLOW_IDENTICAL_KEY_PATTERNS.some((re) => re.test(fullKey));
        if (
          typeof refVal === "string" &&
          refVal === val &&
          !ALLOW_IDENTICAL_VALUES.has(trimmed) &&
          !isShortToken(trimmed) &&
          !keyAllowed
        ) {
          stats.fallback += 1;
          const msg = `[${locale}] ${ns}: "${key}" identical to ${REFERENCE} (likely untranslated fallback): "${val}"`;
          (STRICT ? errors : warnings).push(msg);
        } else {
          stats.translated += 1;
        }
      } else {
        stats.translated += 1;
      }
    }

    for (const key of Object.keys(curFlat)) {
      if (key.startsWith("_") || key.includes("._")) continue;
      if (!(key in refFlat)) {
        errors.push(
          `[${locale}] ${ns}: extra key "${key}" not in reference (${REFERENCE})`,
        );
      }
    }
  }

  coverage[locale] = stats;
}

// --- Report ---
console.log("\ni18n coverage report" + (STRICT ? "  [strict]" : "") + ":\n");
const pad = (s, n) => String(s).padEnd(n);
console.log(
  "  " +
    pad("locale", 8) +
    pad("translated", 12) +
    pad("fallback", 10) +
    pad("missing", 9) +
    pad("empty", 7) +
    pad("coverage", 10) +
    "untranslated namespaces",
);
for (const locale of LOCALES) {
  const s = coverage[locale];
  const pct = s.total === 0 ? "—" : ((s.translated / s.total) * 100).toFixed(1) + "%";
  console.log(
    "  " +
      pad(locale, 8) +
      pad(s.translated, 12) +
      pad(s.fallback, 10) +
      pad(s.missing, 9) +
      pad(s.empty, 7) +
      pad(pct, 10) +
      (s.untranslatedNs.join(", ") || "—"),
  );
}
console.log("");

if (warnings.length) {
  console.warn(`⚠ ${warnings.length} i18n warning(s) (run with --strict to fail):`);
  for (const w of warnings.slice(0, 50)) console.warn("  - " + w);
  if (warnings.length > 50) console.warn(`  …and ${warnings.length - 50} more`);
  console.warn("");
}

if (errors.length) {
  console.error(`✗ i18n validation failed (${errors.length} issue(s)):\n`);
  for (const e of errors.slice(0, 100)) console.error("  - " + e);
  if (errors.length > 100) console.error(`  …and ${errors.length - 100} more`);
  console.error("");
  if (!STRICT && errors.every((e) => e.includes("_translated: false") || e.includes("identical to "))) {
    console.error("(All errors are coverage-only — re-run without --strict to bypass.)");
  }
  process.exit(1);
}

console.log(`✓ i18n validation passed for ${LOCALES.join(", ")}`);
