import { createServerFn } from "@tanstack/react-start";

/**
 * Public, read-only list of address_keys for static shops that admins hid.
 * Runs server-side so no privileged database function has to be exposed to
 * anonymous clients; only the address_key column ever leaves the server.
 */
export const getHiddenShopAddressKeys = createServerFn({ method: "GET" }).handler(
  async (): Promise<string[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("shops_custom")
      .select("address_key")
      .eq("hidden", true);
    if (error) return [];
    return (data ?? [])
      .map((row) => (row as { address_key: string | null }).address_key)
      .filter((k): k is string => typeof k === "string" && k.length > 0);
  },
);
