import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { normalizeAddress } from "@/lib/dedupe-shops";

export type CustomShop = {
  id: string;
  name: string;
  address: string;
  city: string | null;
  country: string | null;
  status: string;
  brands: string[] | null;
  lat: number | null;
  lng: number | null;
};

// Browser-side fetch of custom shops (public SELECT policy on status='active').
// Kept as a lightweight hook so map components can merge without a full
// react-query wiring on SSR-sensitive paths.
export function useCustomShops(): CustomShop[] {
  const [rows, setRows] = useState<CustomShop[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("shops_custom" as any)
        .select("id,name,address,city,country,status,brands,lat,lng");
      if (cancelled || error || !data) return;
      setRows(data as unknown as CustomShop[]);
    })();
    return () => { cancelled = true; };
  }, []);
  return rows;
}

// Hidden static-shop address_keys — admins hid these via the shops panel.
// Map components use it to filter out matching entries from shops.json.
export function useHiddenShopAddressKeys(): Set<string> {
  const [keys, setKeys] = useState<Set<string>>(new Set());
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let data: string[] = [];
      try {
        data = await getHiddenShopAddressKeys();
      } catch {
        return;
      }
      if (cancelled || !Array.isArray(data)) return;
      setKeys(new Set(data.map(String)));
    })();
    return () => { cancelled = true; };
  }, []);
  return keys;
}

export function filterHiddenStatic<T extends { address?: string }>(
  shops: readonly T[],
  hidden: Set<string>,
): T[] {
  if (hidden.size === 0) return [...shops];
  return shops.filter((s) => {
    const raw = (s.address ?? "").trim();
    if (!raw) return true;
    return !hidden.has(normalizeAddress(raw));
  });
}

