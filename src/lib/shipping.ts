// Central B2C shipping fee + VAT helpers.
// Prices on the consumer side are VAT-INCLUSIVE. The shipping fee follows the
// same convention so the customer-facing line and any VAT breakdown stay
// consistent.

export const SHIPPING_FEE_CENTS = 195; // €1,95 incl. VAT
export const VAT_RATE = 0.21;

/** Extract the VAT portion out of a VAT-inclusive amount (cents). */
export function vatFromGross(grossCents: number): number {
  return Math.round((grossCents * VAT_RATE) / (1 + VAT_RATE));
}

export type B2CTotals = {
  productSubtotalCents: number; // products, incl. VAT
  shippingCents: number;        // shipping, incl. VAT
  totalCents: number;           // grand total incl. VAT (sent to Mollie)
  vatCents: number;             // "whereof VAT" on (subtotal + shipping)
};

const BUNDLE_PRICE_CENTS: Record<string, number> = {
  frameid_solo_onetime: 1295,
  frameid_duo_onetime: 2195,
  frameid_family_onetime: 4995,
};

export function computeB2CTotals(
  items: Array<{ priceId: string; quantity: number }>,
): B2CTotals {
  const productSubtotalCents = items.reduce((sum, i) => {
    const price = BUNDLE_PRICE_CENTS[i.priceId] ?? 0;
    return sum + price * i.quantity;
  }, 0);
  const shippingCents = items.length > 0 ? SHIPPING_FEE_CENTS : 0;
  const totalCents = productSubtotalCents + shippingCents;
  const vatCents = vatFromGross(totalCents);
  return { productSubtotalCents, shippingCents, totalCents, vatCents };
}
