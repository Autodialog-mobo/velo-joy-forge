#!/usr/bin/env python3
"""
DOM parity test for the margetoelichting page.

Loads /m/<TOKEN> in a headless browser and asserts that the per-bundle
margin values, price labels, and framing text rendered in the DOM match
exactly what our margin calculation produces from src/lib/bundles.ts and
the constants in src/routes/m.$token.tsx.

Requires the dev server running on http://localhost:8080.
Run: python3 scripts/test_marge_dom.py
"""
import re
import sys
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
marge_src = (ROOT / "src/routes/m.$token.tsx").read_text()
bundles_src = (ROOT / "src/lib/bundles.ts").read_text()

TOKEN = re.search(r'const TOKEN = "([^"]+)"', marge_src).group(1)
PURCHASE = int(re.search(r"PURCHASE_PRICE_EXCL_VAT_CENTS\s*=\s*(\d+)", marge_src).group(1))
VAT = float(re.search(r"VAT_RATE\s*=\s*([0-9.]+)", marge_src).group(1))

BUNDLES = [
    {"key": m.group(1), "stickers": int(m.group(2)), "price": int(m.group(3))}
    for m in re.finditer(
        r'\{\s*key:\s*"([^"]+)"[\s\S]*?stickers:\s*(\d+)[\s\S]*?price:\s*(\d+)',
        bundles_src,
    )
]

EXPECTED_FRAMING = (
    "De marge op de Frame-ID is mooi meegenomen. Maar de echte winst "
    "zit in de klant die terugkomt — voor alles wat daarna volgt."
)


def eur(cents: int) -> str:
    # Match Intl.NumberFormat("nl-BE", currency EUR): "€\u00a012,95"
    whole, frac = divmod(abs(cents), 100)
    # nl-BE uses "." as thousands sep and "," as decimal
    whole_str = f"{whole:,}".replace(",", ".")
    sign = "-" if cents < 0 else ""
    return f"{sign}€\u00a0{whole_str},{frac:02d}"


def compute():
    out = []
    for b in BUNDLES:
        price_excl = round(b["price"] / (1 + VAT))
        margin_total = price_excl - PURCHASE * b["stickers"]
        margin_per_unit = round(margin_total / b["stickers"])
        pct = round((margin_total / price_excl) * 100)
        out.append({**b, "priceExcl": price_excl, "marginTotal": margin_total,
                    "marginPerUnit": margin_per_unit, "pct": pct})
    return out


failed = 0
def check(cond, msg):
    global failed
    if cond:
        print(f"  ok  {msg}")
    else:
        print(f"  FAIL {msg}")
        failed += 1

def eq(a, b, msg):
    check(a == b, f"{msg} — expected {b!r}, got {a!r}")


async def main():
    expected = compute()
    url = f"http://localhost:8080/m/{TOKEN}"
    print(f"Loading {url}")
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        try:
            ctx = await browser.new_context(viewport={"width": 1280, "height": 1800})
            page = await ctx.new_page()
            resp = await page.goto(url, wait_until="networkidle")
            check(resp is not None and resp.ok, f"page responded 2xx (got {resp.status if resp else 'no response'})")
            await page.wait_for_selector('[data-testid="bundle-card"]')

            cards = await page.eval_on_selector_all(
                '[data-testid="bundle-card"]',
                """els => els.map(el => ({
                    key: el.getAttribute('data-bundle-key'),
                    stickers: Number(el.getAttribute('data-stickers')),
                    marginCents: Number(el.getAttribute('data-margin-cents')),
                    marginPerUnitCents: Number(el.getAttribute('data-margin-per-unit-cents')),
                    priceInclCents: Number(el.getAttribute('data-price-incl-cents')),
                    priceExclCents: Number(el.getAttribute('data-price-excl-cents')),
                    pct: Number(el.getAttribute('data-pct')),
                    marginText: el.querySelector('[data-testid="margin-value"]')?.textContent?.trim(),
                    pctText: el.querySelector('[data-testid="margin-pct"]')?.textContent?.trim(),
                    perUnitText: el.querySelector('[data-testid="margin-per-unit"]')?.textContent?.trim(),
                    priceInclText: el.querySelector('[data-testid="price-incl"]')?.textContent?.trim(),
                    priceExclText: el.querySelector('[data-testid="price-excl"]')?.textContent?.trim(),
                }))""",
            )
            eq(len(cards), len(expected), "rendered card count")

            for exp in expected:
                got = next((c for c in cards if c["key"] == exp["key"]), None)
                check(got is not None, f"card rendered for {exp['key']}")
                if not got:
                    continue
                print(f"\n[{exp['key']}]")
                eq(got["stickers"], exp["stickers"], "data-stickers")
                eq(got["priceInclCents"], exp["price"], "data-price-incl-cents")
                eq(got["priceExclCents"], exp["priceExcl"], "data-price-excl-cents")
                eq(got["marginCents"], exp["marginTotal"], "data-margin-cents")
                eq(got["marginPerUnitCents"], exp["marginPerUnit"], "data-margin-per-unit-cents")
                eq(got["pct"], exp["pct"], "data-pct")
                eq(got["priceInclText"], eur(exp["price"]), "price-incl label")
                eq(got["priceExclText"], eur(exp["priceExcl"]), "price-excl label")
                eq(got["marginText"], eur(exp["marginTotal"]), "margin label")
                eq(got["pctText"], f"{exp['pct']}% van verkoopprijs excl. btw", "margin-pct label")
                eq(got["perUnitText"], f"{eur(exp['marginPerUnit'])} marge / Frame-ID", "per-unit label")

            framing = (await page.text_content('[data-testid="framing"]') or "").strip()
            framing = re.sub(r"\s+", " ", framing)
            print("\n[framing]")
            eq(framing, EXPECTED_FRAMING, "framing text")
        finally:
            await browser.close()

    print("\nAll DOM parity checks passed." if failed == 0 else f"\n{failed} check(s) FAILED.")
    sys.exit(0 if failed == 0 else 1)


asyncio.run(main())
