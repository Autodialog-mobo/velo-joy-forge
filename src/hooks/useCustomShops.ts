import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
