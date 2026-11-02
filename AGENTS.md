# AGENTS.md

## Rules

- Hover labels and accessible names for shop-map pins and cluster bubbles come from `src/lib/map-tooltips.ts`; both map components (homepage community map, pro community map) must use it so hover info and screen-reader names stay identical.
- The order page uses `src/lib/order-checkout.ts` for country checkout eligibility, including its payment handler and mobile controls, so country restrictions cannot differ between entrypoints.
- Affiliate shop capture (`?shopID=`), normalisation and the 30-day memory live only in `src/lib/shop-attribution.ts`; orders store it as `affiliate_shop_public_id` and the B2B payload sends it as `affiliateShopPublicId`, so the rule cannot drift between pages, checkout and sync.
