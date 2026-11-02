# Affiliate link and co-branding (VP-815, VP-821)

## Goal
A bike shop links to velopass.com with `?shopID=<publicId>`. We remember that shop and send it with the order to the Velopass Orders app as `affiliateShopPublicId`. Optionally, we show "You're ordering through <shop>" and pass the shop on to the cyclist app's sign-up link.

## Current state (checked)
- The order page already remembers a shop, but it reads `?shop=` (not `shopID`) and only on `/order`. It keeps the shop for 60 days and accepts upper case, `_` and `-`.
- The shop only goes into the payment's metadata. It is **not** saved on the order and **not** sent to the Orders app.
- The shop badge uses a temporary demo stub (`vp_demo_*`) plus an endpoint that doesn't exist yet.

## What changes

1. **Capture on every page**
   - Read `shopID` once on any page (root layout), after the page has loaded.
   - Trim and lowercase it. Keep it only if it matches `^[a-z0-9]{1,64}$`. Otherwise ignore it silently.
   - Replace the old `?shop=` parameter entirely; only `shopID` is read.
2. **Remember it**
   - Store it in the browser for 30 days with a timestamp. A new link replaces the old one (last click wins).
   - If browser storage isn't available, keep it in memory for the visit.
   - Don't clear it after an order.
   - Demo IDs stay URL-only, as now.
3. **Save it on the order**
   - Add a new `affiliate_shop_public_id` field to orders.
   - The payment step saves it with the order using the new lowercase check. An invalid value becomes empty and never blocks payment.
4. **Send it to the Orders app**
   - Add `affiliateShopPublicId` to the order data we send, only when one is set.
   - Live and sandbox both work this way. The automatic hourly sync picks it up too.
   - Fulfillment shows the shop ID per order (small label).
5. **Show the shop (optional, included)**
   - A new server lookup, `/api/public/shop-badge?shop=`, calls the Cyclist API co-branding endpoint: prod, or staging for preview/sandbox.
   - It returns the name, plus a logo address built from the assets endpoint (size 0) when a logo exists.
   - Any 404, error or timeout (3 s) means no badge is shown. It is cached for 10 minutes.
   - The demo stub stays limited to preview, as now.
6. **Links to the cyclist app (optional, included)**
   - "Register your bike" / app links to `app.velopass.com/register` get `?shopID=<id>` when a shop is remembered. They never carry a sticker code.
7. **Test**
   - A small test for the rules: lowercase, the format check, 30 days, last click wins, and storage failure.
   - Run it, plus the payload test (field present or omitted).

## Open points to confirm
- **30 days / last click wins:** the brief marks this as a proposal for Daniel. I'll use 30 days, replacing today's 60.
- **Field name:** the name `affiliateShopPublicId` at the top level of the Orders-app payload still needs the Orders-app team's confirmation.
- **Staging public ID:** no setting is needed. Share the ID from Daniel in chat. I'll test by opening the preview with `?shopID=<id>` and placing a sandbox order against the sandbox Orders app.

## Technical details
- `src/lib/shop-attribution.ts`: new normaliser, `shopID` param, 30-day TTL, in-memory fallback, `captureShopFromUrl()` called in a `useEffect` in `__root.tsx`.
- Migration: `orders.affiliate_shop_public_id text null`.
- `mollie.functions.ts`: validate with the new regex and write it to the order row.
- `build-payload.server.ts`: `...(order.affiliate_shop_public_id ? { affiliateShopPublicId } : {})`.
- `src/routes/api/public/shop-badge.ts`: server-side fetch (avoids CORS). Read-only and public data, so no auth is needed. Input is validated with the regex.
- Record in AGENTS.md that all affiliate capture and normalisation go through `shop-attribution.ts`.
- Nothing is published.
