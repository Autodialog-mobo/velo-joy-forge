// Deterministic shop_id for statische shops.
// Gebaseerd op de genormaliseerde address_key zodat elke statische shop
// een stabiel, uniek ID krijgt zonder databasewijziging.
import { normalizeAddress } from "@/lib/dedupe-shops";

function djb2(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
  }
  return h >>> 0;
}

// FNV-1a for a second independent mix, then combine → 64-bit-ish hex string.
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function staticShopIdFromAddress(address: string): string {
  const key = normalizeAddress(address || "");
  if (!key) return "";
  const a = djb2(key).toString(16).padStart(8, "0");
  const b = fnv1a(key).toString(16).padStart(8, "0");
  return `vp_s_${a}${b}`;
}

export function staticShopIdFromKey(addressKey: string): string {
  if (!addressKey) return "";
  const a = djb2(addressKey).toString(16).padStart(8, "0");
  const b = fnv1a(addressKey).toString(16).padStart(8, "0");
  return `vp_s_${a}${b}`;
}
