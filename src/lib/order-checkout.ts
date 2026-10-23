/** France identification must be arranged through an approved operator. */
export function isOnlineCheckoutAllowed(country: string): boolean {
  return country !== "FR";
}