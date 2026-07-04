#!/usr/bin/env node
// Unit tests for dedupeShopsByAddress.
// Rules tested:
//   1. Address normalization (case, spaces, commas, whitespace)
//   2. Duplicate address with brands on one side wins
//   3. Both have brands -> most brands wins
//   4. Neither has brands -> only one kept
//   5. Ties on brand count keep first seen (stable)
//   6. Non-active shops are dropped
//   7. Missing address falls back to lat,lng key
//   8. Real dataset dedupes without errors and is <= raw active count

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Node 22+ strips TS types natively with --experimental-strip-types.
const { dedupeShopsByAddress, normalizeAddress } = await import(
  "../src/lib/dedupe-shops.ts"
);

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    failures.push({ name, error: e });
    console.log(`  ✗ ${name}`);
    console.log(`    ${e.message}`);
  }
}

function eq(actual, expected, msg = "") {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${msg}\n    expected ${b}\n    got      ${a}`);
}

console.log("\ndedupeShopsByAddress\n");

test("normalizes case, whitespace and repeated commas", () => {
  eq(normalizeAddress("  Rue de la Loi  10 ,, Brussels "), "rue de la loi 10,brussels");
});

test("keeps a single shop unchanged", () => {
  const out = dedupeShopsByAddress([
    { id: 1, status: "active", address: "Rue A 1", brands: ["Trek"] },
  ]);
  eq(out.map((s) => s.id), [1]);
});

test("duplicate address: one with brands wins over one without", () => {
  const out = dedupeShopsByAddress([
    { id: "no-brands", status: "active", address: "Rue A 1" },
    { id: "has-brands", status: "active", address: "rue a 1", brands: ["Trek"] },
  ]);
  eq(out.map((s) => s.id), ["has-brands"]);
});

test("duplicate address: both have brands, most brands wins", () => {
  const out = dedupeShopsByAddress([
    { id: "few", status: "active", address: "Rue A 1", brands: ["Trek"] },
    { id: "many", status: "active", address: "Rue A 1", brands: ["Trek", "Giant", "Cube"] },
    { id: "some", status: "active", address: "Rue A 1", brands: ["Trek", "Giant"] },
  ]);
  eq(out.map((s) => s.id), ["many"]);
});

test("neither has brands: only one kept (first seen)", () => {
  const out = dedupeShopsByAddress([
    { id: "first", status: "active", address: "Rue A 1" },
    { id: "second", status: "active", address: "Rue A 1" },
    { id: "third", status: "active", address: "rue a 1" },
  ]);
  eq(out.length, 1);
  eq(out[0].id, "first");
});

test("tie on brand count keeps the first seen (stable)", () => {
  const out = dedupeShopsByAddress([
    { id: "first", status: "active", address: "Rue A 1", brands: ["Trek", "Giant"] },
    { id: "second", status: "active", address: "Rue A 1", brands: ["Cube", "Merida"] },
  ]);
  eq(out.map((s) => s.id), ["first"]);
});

test("normalizes irregular whitespace and comma runs into the same key", () => {
  const out = dedupeShopsByAddress([
    { id: "a", status: "active", address: "Rue A 1,, Ghent", brands: ["Trek"] },
    { id: "b", status: "active", address: "  RUE  A   1 , Ghent  ", brands: ["Trek", "Giant"] },
  ]);
  eq(out.map((s) => s.id), ["b"]);
});

test("drops non-active shops", () => {
  const out = dedupeShopsByAddress([
    { id: "pending", status: "pending", address: "Rue A 1", brands: ["Trek", "Giant"] },
    { id: "active", status: "active", address: "Rue A 1", brands: ["Trek"] },
  ]);
  eq(out.map((s) => s.id), ["active"]);
});

test("empty address falls back to lat,lng key", () => {
  const out = dedupeShopsByAddress([
    { id: "a", status: "active", address: "", lat: 50.1, lng: 4.2, brands: ["Trek"] },
    { id: "b", status: "active", address: "", lat: 50.1, lng: 4.2, brands: ["Trek", "Giant"] },
    { id: "c", status: "active", address: "", lat: 51.0, lng: 4.2 },
  ]);
  eq(out.map((s) => s.id).sort(), ["b", "c"]);
});

test("real shops.json: deduped count ≤ raw active count and no duplicates remain", () => {
  const shops = JSON.parse(readFileSync(join(root, "src/data/shops.json"), "utf8"));
  const activeCount = shops.filter((s) => s.status === "active").length;
  const out = dedupeShopsByAddress(shops);
  if (out.length > activeCount) {
    throw new Error(`deduped (${out.length}) > raw active (${activeCount})`);
  }
  const keys = new Set();
  for (const s of out) {
    const raw = (s.address ?? "").trim();
    const k = raw ? normalizeAddress(raw) : `${s.lat},${s.lng}`;
    if (keys.has(k)) throw new Error(`duplicate key remained: ${k}`);
    keys.add(k);
  }
  console.log(`    (${activeCount} active → ${out.length} unique)`);
});

// -------------------------------------------------------------------------
// Parity: every page-visible counter must equal dedupeShopsByAddress(shops).length
// -------------------------------------------------------------------------
//
// All pages read the counter via `useActiveShopCount` from
// src/lib/active-shop-count.ts, which delegates to `getActiveShopCount`.
// These tests lock in two guarantees:
//   A. getActiveShopCount() === dedupeShopsByAddress(shops.json).length
//   B. No page/component computes its own count from shops.json — they must
//      all import from active-shop-count so a single source of truth wins.

const { getActiveShopCount } = await import("../src/lib/active-shop-count.ts");

test("getActiveShopCount() matches dedupeShopsByAddress(shops.json).length", () => {
  const shops = JSON.parse(readFileSync(join(root, "src/data/shops.json"), "utf8"));
  const expected = dedupeShopsByAddress(shops).length;
  const actual = getActiveShopCount();
  eq(actual, expected, "counter and shop list disagree on unique count");
  console.log(`    (${expected} unique shops on every page)`);
});

test("all pages/components read the counter via useActiveShopCount (single source of truth)", async () => {
  const { readdir, readFile } = await import("node:fs/promises");
  const files = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "__tests__" || entry.name === "node_modules") continue;
        await walk(p);
      } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
        files.push(p);
      }
    }
  }
  await walk(join(root, "src"));

  // Files that are allowed to import shops.json directly (they render the
  // full list or audit it — they do NOT expose a count to the UI).
  const allowlist = new Set(
    [
      "src/lib/active-shop-count.ts",
      "src/components/ShopFinderMap.tsx",
      "src/components/ProCommunityMap.tsx",
      "src/routes/dedup-audit.tsx",
    ].map((p) => join(root, p)),
  );

  const offenders = [];
  for (const f of files) {
    if (allowlist.has(f)) continue;
    const src = await readFile(f, "utf8");
    if (/from\s+["']@\/data\/shops\.json["']/.test(src)) {
      offenders.push(f.slice(root.length + 1));
    }
  }
  if (offenders.length > 0) {
    throw new Error(
      `these files import shops.json directly and may compute a diverging count — ` +
        `use useActiveShopCount() instead:\n      - ${offenders.join("\n      - ")}`,
    );
  }
});

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);

