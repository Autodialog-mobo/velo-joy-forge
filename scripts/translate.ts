#!/usr/bin/env bun
/**
 * DeepL translation script for Velopass i18n bundles.
 *
 * Usage:
 *   bun run translate:fr
 *   bun run translate:de
 *   bun run translate:all
 *
 * Behavior:
 *   - Source of truth = src/i18n/locales/en/*.json
 *   - For each target locale, loads the existing file, walks the EN file
 *     recursively (objects + arrays), and translates ONLY:
 *       a) keys missing in the target, OR
 *       b) keys whose value is identical to EN AND the target file has
 *          "_translated": false at the top level.
 *   - Preserves key order and nested structure.
 *   - Never flips _translated to true (manual review).
 *   - Never touches NL.
 *
 * Requires: DEEPL_API_KEY env var (DeepL Pro).
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = resolve(__dirname, "../src/i18n/locales");
const SOURCE = "en";

const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
// Free-tier keys end with ":fx" and must hit api-free.deepl.com.
const DEEPL_ENDPOINT =
  DEEPL_API_KEY && DEEPL_API_KEY.endsWith(":fx")
    ? "https://api-free.deepl.com/v2/translate"
    : "https://api.deepl.com/v2/translate";

// Terms that must never be translated.
const PRESERVE_TERMS = [
  "Velopass",
  "Frame-ID",
  "VP-FID-1",
  "VP-FID-2",
  "VP-FID-5",
  "Bancontact",
  "iDEAL",
  "Mollie",
  "Cyclis",
  "KBC",
  "Joule",
  "Cycle Valley",
  "Hert Lease",
  "Granville",
  "Specter",
  "Thompson",
  "UrbanBiker",
  "Bike43",
  "Flebi",
  "Oxford",
  "VAB",
  "Upway",
  "Police-on-web",
  "MyBike",
  "FNUCI",
  "DigiD",
  "itsme",
  "Every bike. A customer for life.",
];

type LangConfig = {
  target: string; // DeepL target lang code
  formality?: "less" | "default" | "more" | "prefer_less" | "prefer_more";
};

const LANG_CONFIG: Record<string, LangConfig> = {
  // FR: vous-form is the correct register for the French market — keep formality at default
  // so re-runs don't drift to tutoiement.
  fr: { target: "FR", formality: "default" },
  // DE: du-form is the market standard in the German cycling domain — use formality=less
  // so re-runs stay consistent and don't drift to Sie.
  de: { target: "DE", formality: "less" },
};

type Stats = { translated: number; skipped: number; preserved: number };

// Sort the preserve terms longest-first so substrings don't shadow longer matches.
const SORTED_PRESERVE = [...PRESERVE_TERMS].sort((a, b) => b.length - a.length);

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const PRESERVE_RE = new RegExp(
  "(" + SORTED_PRESERVE.map(escapeRegex).join("|") + ")",
  "g",
);
// i18next-style placeholders: {{name}} (and {{ name, format }}).
const PLACEHOLDER_RE = /\{\{[^}]+\}\}/g;

function wrapForDeepL(input: string, stats: Stats): string {
  // Wrap placeholders first (so they get an <x> too, fully ignored by DeepL).
  let out = input.replace(PLACEHOLDER_RE, (m) => {
    stats.preserved++;
    return `<x>${m}</x>`;
  });
  out = out.replace(PRESERVE_RE, (m) => {
    stats.preserved++;
    return `<x>${m}</x>`;
  });
  return out;
}

function unwrapFromDeepL(input: string): string {
  // DeepL with tag_handling=xml + ignore_tags=x returns <x>...</x> untouched.
  return input.replace(/<x>([\s\S]*?)<\/x>/g, "$1");
}

async function deeplTranslate(
  texts: string[],
  cfg: LangConfig,
): Promise<string[]> {
  if (texts.length === 0) return [];
  if (!DEEPL_API_KEY) {
    throw new Error("DEEPL_API_KEY is not set in the environment.");
  }

  const body = new URLSearchParams();
  for (const t of texts) body.append("text", t);
  body.append("target_lang", cfg.target);
  body.append("source_lang", "EN");
  body.append("tag_handling", "xml");
  body.append("ignore_tags", "x");
  body.append("preserve_formatting", "1");
  if (cfg.formality) body.append("formality", cfg.formality);

  const res = await fetch(DEEPL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`DeepL API ${res.status}: ${errText}`);
  }
  const data = (await res.json()) as { translations: { text: string }[] };
  return data.translations.map((t) => t.text);
}

// Batch translation across one file to limit API calls.
type Job = { path: (string | number)[]; text: string };

function collectJobs(
  enNode: unknown,
  targetNode: unknown,
  needsRetranslate: boolean,
  force: boolean,
  trail: (string | number)[],
  jobs: Job[],
  stats: Stats,
): void {
  // Skip meta keys at any level — only top-level _translated matters,
  // but other underscore-prefixed keys are conventionally meta too.
  if (Array.isArray(enNode)) {
    const tArr = Array.isArray(targetNode) ? targetNode : [];
    for (let i = 0; i < enNode.length; i++) {
      collectJobs(enNode[i], tArr[i], needsRetranslate, force, [...trail, i], jobs, stats);
    }
    return;
  }
  if (enNode && typeof enNode === "object") {
    const tObj =
      targetNode && typeof targetNode === "object" && !Array.isArray(targetNode)
        ? (targetNode as Record<string, unknown>)
        : {};
    for (const [k, v] of Object.entries(enNode)) {
      if (k.startsWith("_")) continue; // skip meta like _translated
      collectJobs(v, tObj[k], needsRetranslate, force, [...trail, k], jobs, stats);
    }
    return;
  }
  if (typeof enNode !== "string") return;

  // Decide if this leaf needs translation.
  const missing = targetNode === undefined;
  const equalsEn = typeof targetNode === "string" && targetNode === enNode;
  if (force || missing || (equalsEn && needsRetranslate)) {
    jobs.push({ path: trail, text: enNode });
  } else {
    stats.skipped++;
  }
}

function setAtPath(
  root: Record<string, unknown> | unknown[],
  path: (string | number)[],
  value: string,
): void {
  let node: any = root;
  for (let i = 0; i < path.length - 1; i++) {
    const seg = path[i];
    const next = path[i + 1];
    if (node[seg] === undefined || node[seg] === null) {
      node[seg] = typeof next === "number" ? [] : {};
    }
    node = node[seg];
  }
  node[path[path.length - 1]] = value;
}

// Rebuild target object using EN key order, keeping existing translations,
// and applying newly translated leaves.
function rebuildWithEnOrder(
  enNode: unknown,
  targetNode: unknown,
  translations: Map<string, string>,
  trail: (string | number)[],
): unknown {
  if (Array.isArray(enNode)) {
    const tArr = Array.isArray(targetNode) ? targetNode : [];
    return enNode.map((v, i) =>
      rebuildWithEnOrder(v, tArr[i], translations, [...trail, i]),
    );
  }
  if (enNode && typeof enNode === "object") {
    const tObj =
      targetNode && typeof targetNode === "object" && !Array.isArray(targetNode)
        ? (targetNode as Record<string, unknown>)
        : {};
    const out: Record<string, unknown> = {};
    // Preserve top-level _translated flag if present.
    if (trail.length === 0 && "_translated" in tObj) {
      out._translated = tObj._translated;
    }
    for (const [k, v] of Object.entries(enNode)) {
      if (k.startsWith("_")) continue;
      out[k] = rebuildWithEnOrder(v, tObj[k], translations, [...trail, k]);
    }
    return out;
  }
  if (typeof enNode === "string") {
    const key = trail.join("\u0001");
    if (translations.has(key)) return translations.get(key)!;
    if (typeof targetNode === "string") return targetNode;
    return enNode; // fallback (shouldn't normally happen)
  }
  return enNode;
}

async function translateFile(
  filename: string,
  lang: string,
  cfg: LangConfig,
  force: boolean,
): Promise<Stats> {
  const enPath = join(LOCALES_DIR, SOURCE, filename);
  const targetDir = join(LOCALES_DIR, lang);
  const targetPath = join(targetDir, filename);

  const en = JSON.parse(readFileSync(enPath, "utf8"));
  let target: any = {};
  try {
    target = JSON.parse(readFileSync(targetPath, "utf8"));
  } catch {
    target = { _translated: false };
  }
  const needsRetranslate = target?._translated === false;

  const stats: Stats = { translated: 0, skipped: 0, preserved: 0 };
  const jobs: Job[] = [];
  collectJobs(en, target, needsRetranslate, force, [], jobs, stats);

  if (jobs.length === 0) {
    console.log(
      `  · ${filename}: nothing to translate (skipped=${stats.skipped})`,
    );
    return stats;
  }

  // Wrap, send in batches of 50 (DeepL allows up to 50 texts per request).
  const BATCH = 50;
  const wrapped = jobs.map((j) => wrapForDeepL(j.text, stats));
  const translatedTexts: string[] = [];
  for (let i = 0; i < wrapped.length; i += BATCH) {
    const slice = wrapped.slice(i, i + BATCH);
    const out = await deeplTranslate(slice, cfg);
    translatedTexts.push(...out.map(unwrapFromDeepL));
  }

  const translations = new Map<string, string>();
  jobs.forEach((j, i) => {
    translations.set(j.path.join("\u0001"), translatedTexts[i]);
  });
  stats.translated = jobs.length;

  const rebuilt = rebuildWithEnOrder(en, target, translations, []);
  writeFileSync(targetPath, JSON.stringify(rebuilt, null, 2) + "\n", "utf8");

  console.log(
    `  ✓ ${filename}: translated=${stats.translated}, skipped=${stats.skipped}, preserved=${stats.preserved}`,
  );
  return stats;
}

async function translateLang(lang: string): Promise<void> {
  const cfg = LANG_CONFIG[lang];
  if (!cfg) throw new Error(`Unsupported target language: ${lang}`);
  console.log(`\n→ Translating to ${lang.toUpperCase()} (DeepL ${cfg.target}, formality=${cfg.formality ?? "default"})`);

  const files = readdirSync(join(LOCALES_DIR, SOURCE)).filter((f) =>
    f.endsWith(".json"),
  );
  const totals: Stats = { translated: 0, skipped: 0, preserved: 0 };
  for (const f of files) {
    const s = await translateFile(f, lang, cfg);
    totals.translated += s.translated;
    totals.skipped += s.skipped;
    totals.preserved += s.preserved;
  }
  console.log(
    `\n[${lang}] totals — translated=${totals.translated}, skipped=${totals.skipped}, preserved=${totals.preserved}`,
  );
}

async function main(): Promise<void> {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage: bun run translate:<fr|de|all>");
    process.exit(1);
  }
  const langs = arg === "all" ? Object.keys(LANG_CONFIG) : [arg];
  for (const l of langs) await translateLang(l);
  console.log("\nDone. _translated flags left at false — flip manually after native review.");
}

main().catch((e) => {
  console.error("translate.ts failed:", e);
  process.exit(1);
});
