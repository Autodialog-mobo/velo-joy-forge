#!/usr/bin/env node
/**
 * Regression test: buildLocalizedHead must always receive TRANSLATED title and
 * description on /$lang/* routes (regression from 2026-08-30, where
 * src/routes/$lang/frame-id.tsx passed hardcoded English strings, so every
 * language got an English tab title and an English link-share preview).
 *
 * Asserts:
 *  1. No /$lang route passes a hardcoded string literal as title / description /
 *     ogTitle / ogDescription to buildLocalizedHead.
 *  2. buildLocalizedHead itself propagates title/description into
 *     title, description, og:title, og:description, twitter:title, twitter:description.
 *  3. frame-id.tsx resolves per-language meta for all five locales, and every
 *     locale file has a non-empty, language-specific meta block.
 *
 * Run: node scripts/test-localized-head.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(root, p), "utf8");

let failed = 0;
const assert = (cond, msg) => {
  if (cond) console.log(`  ok  ${msg}`);
  else {
    console.error(`  FAIL ${msg}`);
    failed++;
  }
};

const LANGS = ["nl", "en", "fr", "de", "es"];

// --- 1. No hardcoded copy in any buildLocalizedHead call -------------------
console.log("Localized head arguments:");
const routeDir = "src/routes/$lang";
const routeFiles = readdirSync(resolve(root, routeDir)).filter((f) =>
  f.endsWith(".tsx"),
);
const LITERAL_ARG =
  /\b(title|description|ogTitle|ogDescription)\s*:\s*(["'`])(?!\s*\2)/g;

for (const file of routeFiles) {
  const src = read(`${routeDir}/${file}`);
  if (!src.includes("buildLocalizedHead(")) continue;

  // Isolate each buildLocalizedHead({ ... }) call body.
  const calls = [];
  let idx = src.indexOf("buildLocalizedHead(");
  while (idx !== -1) {
    let depth = 0;
    let end = idx;
    for (let i = src.indexOf("(", idx); i < src.length; i++) {
      if (src[i] === "(") depth++;
      else if (src[i] === ")") {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    calls.push(src.slice(idx, end + 1));
    idx = src.indexOf("buildLocalizedHead(", end);
  }

  for (const call of calls) {
    const literals = [...call.matchAll(LITERAL_ARG)].map((m) => m[1]);
    assert(
      literals.length === 0,
      `${file}: buildLocalizedHead uses translated values${
        literals.length ? ` (hardcoded: ${[...new Set(literals)].join(", ")})` : ""
      }`,
    );
  }
}

// --- 2. buildLocalizedHead propagates the localized copy -------------------
console.log("buildLocalizedHead output:");
const seoSrc = read("src/i18n/seo.ts");
for (const [tag, expr] of [
  ["title", "{ title: opts.title }"],
  ['name: "description"', "content: opts.description"],
  ['property: "og:title"', "content: ogTitle"],
  ['property: "og:description"', "content: ogDescription"],
  ['name: "twitter:title"', "content: ogTitle"],
  ['name: "twitter:description"', "content: ogDescription"],
]) {
  assert(
    seoSrc.includes(expr),
    `seo.ts emits ${tag} from the passed-in localized copy`,
  );
}
assert(
  /const ogTitle = opts\.ogTitle \?\? opts\.title/.test(seoSrc) &&
    /const ogDescription = opts\.ogDescription \?\? opts\.description/.test(seoSrc),
  "seo.ts falls back to the localized title/description for og/twitter",
);

// --- 3. frame-id.tsx: per-language meta ------------------------------------
console.log("frame-id per-language meta:");
const frameIdSrc = read(`${routeDir}/frame-id.tsx`);
for (const lang of LANGS) {
  assert(
    frameIdSrc.includes(`@/i18n/locales/${lang}/frame-id.json`),
    `frame-id.tsx imports the ${lang} meta`,
  );
}
assert(
  /FRAME_ID_META\[\s*lang\s*\]/.test(frameIdSrc),
  "frame-id.tsx selects meta by the validated route language",
);
assert(
  /isLang\(params\.lang\)/.test(frameIdSrc),
  "frame-id.tsx validates params.lang before selecting meta",
);

const titles = new Set();
const descriptions = new Set();
for (const lang of LANGS) {
  const meta = JSON.parse(read(`src/i18n/locales/${lang}/frame-id.json`)).meta;
  assert(
    !!meta && !!meta.title && !!meta.description && !!meta.ogDescription,
    `${lang}/frame-id.json has a complete meta block`,
  );
  titles.add(meta?.title);
  descriptions.add(meta?.description);
}
assert(
  titles.size === LANGS.length,
  "every language has its own frame-id meta.title (no English fallback)",
);
assert(
  descriptions.size === LANGS.length,
  "every language has its own frame-id meta.description (no English fallback)",
);

console.log(
  failed === 0
    ? "\nAll localized-head checks passed."
    : `\n${failed} localized-head check(s) failed.`,
);
process.exit(failed === 0 ? 0 : 1);
