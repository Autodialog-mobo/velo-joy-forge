# AGENTS.md

## Rules

- Hover labels and accessible names for shop-map pins and cluster bubbles come from `src/lib/map-tooltips.ts`; both map components (homepage community map, pro community map) must use it so hover info and screen-reader names stay identical.
- The order page uses `src/lib/order-checkout.ts` for country checkout eligibility, including its payment handler and mobile controls, so country restrictions cannot differ between entrypoints.
- Affiliate shop capture (`?shopID=`), normalisation and the 30-day memory live only in `src/lib/shop-attribution.ts`; orders store it as `affiliate_shop_public_id` and the B2B payload sends it as `affiliateShopPublicId`, so the rule cannot drift between pages, checkout and sync.
- Shop branding (name/city/logo) is fetched only server-side via `src/lib/shop-branding.server.ts` behind `/api/public/shop-badge`, so the Velopass third-party API key never reaches the browser.
- Language-less paths (e.g. `/order`) redirect with 302 via `src/lib/lang-redirect.ts` in `src/server.ts`, keeping the query string so `?shopID=` survives.
- Shop-signup pushes go only through `POST /api/v1/bike-shops` on the Velopass Third Party API with the server-side X-Api-Key (`src/lib/velopass-thirdparty.server.ts`), geocoded lat/lng required; never forward the admin Auth0 token to Velopass APIs, so access stays revocable per client.
- Slack alerts for new shop signups go through the Incoming Webhook in `src/lib/slack-notify.server.ts` (SLACK_WEBHOOK_URL), never blocking the signup; the Slack connector isn't available to this workspace role.
