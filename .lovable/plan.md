# Shop link (shopID): language redirect and official shop lookup

## Where it stands
- Capture of `?shopID=` on every page, 30-day memory, saving it on the order and sending it to Velopass as `affiliateShopPublicId` are already built (not published).
- The shop name/logo on the order page currently uses an older, unofficial lookup without a key. This plan replaces it with the new official call.

## What changes

### 1. Link without language → visitor's language
- `velopass.com/order?shopID=...` redirects in one step to `/{taal}/order?shopID=...` (e.g. `/nl/order?shopID=tomsfrenchstoresoultzhautrhin7647`).
- Language = the visitor's browser language (nl/fr/de/en/es), fallback nl. Same detection as the homepage already uses.
- All query parameters (shopID, utm_...) are kept.
- Temporary redirect (302), because the target depends on the visitor. Also `/order/thanks` gets the same treatment.

### 2. Shop name and logo from the official Velopass call
- Our server calls `GET {base}/api/v1/organisations/{publicId}/branding` with the velopass.com key. The key never reaches the browser.
- 200: show "Bestellen via {name}, {city}" with logo (if `logoUrl`).
- 404 (unknown/inactive): show nothing; the shopID is still sent with the order (Velopass decides).
- 401/403 or timeout (3s): show nothing, log a warning. Payment is never blocked.
- Results cached 10 minutes per shop.
- Live site uses the live key; preview uses the staging key (if provided), otherwise shows nothing.

### 3. Where to set the API key
- I'll open a secure form (not in chat) with two fields: **VELOPASS_BRANDING_API_KEY_LIVE** and optionally **VELOPASS_BRANDING_API_KEY_STAGING**. Values are stored encrypted and only used on the server.

### 4. Test
- Unit tests: redirect keeps shopID; 200/404/401 handling.
- End-to-end with `tomsfrenchstoresoultzhautrhin7647`: link without language → `/nl/order`, shop name visible, test order carries the shop to the Velopass sandbox.

## Open points (needed before building)
1. **Base URL** of the new API (live and staging) — e.g. `https://ordersapi.prod.velopass.com`?
2. **Key header name** — `X-Api-Key`, or `Authorization: Bearer ...`?
3. Is `tomsfrenchstoresoultzhautrhin7647` a live or staging shop?
4. Note: this is a French shop; France can't check out online and is sent to the shop finder. With this shopID, should France still be redirected, or should French visitors be pointed to this shop?

## Technical details
- `src/server.ts`: handle `/order` and `/order/thanks` before routing; language from `Accept-Language` (reuse logic of `detectLang`), 302 with original search string.
- `src/routes/api/public/shop-badge.ts`: replace the co-branding fetch with the new endpoint, key from `process.env` read inside the handler, response mapped to `{ name, city, logoUrl? }`; validate shopID with `^[a-z0-9]{1,64}$`.
- `src/lib/shop-attribution.ts`: `ShopBadge` gets `city`; order page renders it.
- AGENTS.md rule on shop-attribution stays; add that the branding lookup only happens server-side with the key.
