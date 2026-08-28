// Single source of truth for the consumer Frame-ID bundles shown on /order.
// Consumed by both the order page and the private margin explainer page,
// so pricing/composition never diverges.

export type BundleKey =
  | "frameid_solo_onetime"
  | "frameid_duo_onetime"
  | "frameid_family_onetime";

export type Bundle = {
  key: BundleKey;
  name: string;
  tier: "Solo" | "Duo" | "Family";
  stickers: number;
  price: number; // total price, cents, INCL. VAT
  pricePerUnit: number; // per-unit price, cents, INCL. VAT
  discountKey?: "discount_15" | "discount_23";
  featured?: boolean;
};

export const BUNDLES: Bundle[] = [
  {
    key: "frameid_solo_onetime",
    name: "1 Frame-ID",
    tier: "Solo",
    stickers: 1,
    price: 1295,
    pricePerUnit: 1295,
  },
  {
    key: "frameid_duo_onetime",
    name: "2 Frame-ID's",
    tier: "Duo",
    stickers: 2,
    price: 2195,
    pricePerUnit: 1098,
    discountKey: "discount_15",
    featured: true,
  },
  {
    key: "frameid_family_onetime",
    name: "5 Frame-ID's",
    tier: "Family",
    stickers: 5,
    price: 4995,
    pricePerUnit: 999,
    discountKey: "discount_23",
  },
];
