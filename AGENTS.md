# AGENTS.md

## Rules

- Hover labels and accessible names for shop-map pins and cluster bubbles come from `src/lib/map-tooltips.ts`; both map components (homepage community map, pro community map) must use it so hover info and screen-reader names stay identical.
- The order page uses `src/lib/order-checkout.ts` for country checkout eligibility, including its payment handler and mobile controls, so country restrictions cannot differ between entrypoints.
