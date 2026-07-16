import { createServerFn } from "@tanstack/react-start";
import { requireAuth0Admin } from "@/integrations/auth0/middleware";
import { z } from "zod";
import { normalizeAddress } from "@/lib/dedupe-shops";

const ShopRow = z.object({
  name: z.string().trim().min(1),
  address: z.string().trim().min(1),
  city: z.string().trim().optional().default(""),
  country: z.string().trim().optional().default(""),
  status: z.string().trim().optional().default("active"),
  brands: z.array(z.string()).optional().default([]),
  lat: z.number().nullish(),
  lng: z.number().nullish(),
});

export type ImportShopRow = z.infer<typeof ShopRow>;

export const listCustomShops = createServerFn({ method: "POST" })
  .middleware([requireAuth0Admin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("shops_custom")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });

export const importCustomShops = createServerFn({ method: "POST" })
  .middleware([requireAuth0Admin])
  .inputValidator((d: unknown) =>
    z.object({
      rows: z.array(ShopRow).min(1),
      staticKeys: z.array(z.string()),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const staticSet = new Set(data.staticKeys);

    const { data: existing, error: exErr } = await (supabaseAdmin as any)
      .from("shops_custom")
      .select("id, address_key");
    if (exErr) throw new Error(exErr.message);
    const existingMap = new Map<string, string>();
    for (const r of existing ?? []) existingMap.set(r.address_key, r.id);

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const errors: { row: number; message: string }[] = [];

    for (let i = 0; i < data.rows.length; i++) {
      const r = data.rows[i];
      const key = normalizeAddress(r.address);
      if (!key) { skipped++; continue; }

      // In static shops.json and not in custom → skip (already known).
      if (staticSet.has(key) && !existingMap.has(key)) {
        skipped++;
        continue;
      }

      const payload: any = {
        name: r.name,
        address: r.address,
        city: r.city ?? "",
        country: (r.country ?? "").toUpperCase(),
        status: r.status || "active",
        brands: r.brands ?? [],
        lat: r.lat ?? null,
        lng: r.lng ?? null,
        address_key: key,
      };

      if (existingMap.has(key)) {
        const { error } = await (supabaseAdmin as any)
          .from("shops_custom")
          .update(payload)
          .eq("id", existingMap.get(key));
        if (error) { errors.push({ row: i + 1, message: error.message }); continue; }
        updated++;
      } else {
        const { error } = await (supabaseAdmin as any)
          .from("shops_custom")
          .insert(payload);
        if (error) { errors.push({ row: i + 1, message: error.message }); continue; }
        inserted++;
      }
    }

    return { inserted, updated, skipped, errors };
  });

export const deleteCustomShop = createServerFn({ method: "POST" })
  .middleware([requireAuth0Admin])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("shops_custom")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
