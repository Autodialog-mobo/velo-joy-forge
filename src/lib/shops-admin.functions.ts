import { createServerFn } from "@tanstack/react-start";
import { requireAuth0Admin } from "@/integrations/auth0/middleware";
import { z } from "zod";
import { normalizeAddress } from "@/lib/dedupe-shops";

const ShopRow = z.object({
  shop_id: z.string().trim().optional().default(""),
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
      .select("id, shop_id, address_key, name, address, city, country, status, brands, lat, lng");
    if (exErr) throw new Error(exErr.message);
    const byAddress = new Map<string, any>();
    const byShopId = new Map<string, any>();
    for (const r of existing ?? []) {
      if (r.address_key) byAddress.set(r.address_key, r);
      if (r.shop_id) byShopId.set(r.shop_id, r);
    }

    const FIELDS = ["name", "address", "city", "country", "status", "brands", "lat", "lng"] as const;
    function diffFields(before: any, after: any): string[] {
      const changed: string[] = [];
      for (const f of FIELDS) {
        const a = before?.[f];
        const b = after?.[f];
        if (f === "brands") {
          const aa = (Array.isArray(a) ? a : []).join("|");
          const bb = (Array.isArray(b) ? b : []).join("|");
          if (aa !== bb) changed.push(f);
        } else if ((a ?? null) !== (b ?? null)) {
          changed.push(f);
        }
      }
      return changed;
    }

    type Result = {
      row: number;
      status: "insert" | "update" | "skip" | "error";
      name: string;
      address: string;
      shop_id?: string;
      changedFields?: string[];
      reason?: string;
      message?: string;
    };
    const results: Result[] = [];
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (let i = 0; i < data.rows.length; i++) {
      const r = data.rows[i];
      const rowNum = i + 1;
      const key = normalizeAddress(r.address);
      if (!key) {
        skipped++;
        results.push({ row: rowNum, status: "skip", name: r.name, address: r.address, reason: "leeg adres" });
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

      const providedId = (r.shop_id ?? "").trim();
      if (providedId) {
        const before = byShopId.get(providedId);
        if (!before) {
          results.push({ row: rowNum, status: "error", name: r.name, address: r.address, shop_id: providedId, message: `shop_id ${providedId} bestaat niet` });
          continue;
        }
        const changed = diffFields(before, payload);
        if (changed.length === 0) {
          skipped++;
          results.push({ row: rowNum, status: "skip", name: r.name, address: r.address, shop_id: providedId, reason: "geen wijzigingen" });
          continue;
        }
        const { error } = await (supabaseAdmin as any)
          .from("shops_custom").update(payload).eq("id", before.id);
        if (error) {
          results.push({ row: rowNum, status: "error", name: r.name, address: r.address, shop_id: providedId, message: error.message });
          continue;
        }
        updated++;
        results.push({ row: rowNum, status: "update", name: r.name, address: r.address, shop_id: providedId, changedFields: changed });
        continue;
      }

      if (staticSet.has(key) && !byAddress.has(key)) {
        skipped++;
        results.push({ row: rowNum, status: "skip", name: r.name, address: r.address, reason: "staat in statisch bestand" });
        continue;
      }

      if (byAddress.has(key)) {
        const before = byAddress.get(key);
        const changed = diffFields(before, payload);
        if (changed.length === 0) {
          skipped++;
          results.push({ row: rowNum, status: "skip", name: r.name, address: r.address, shop_id: before.shop_id, reason: "geen wijzigingen" });
          continue;
        }
        const { error } = await (supabaseAdmin as any)
          .from("shops_custom").update(payload).eq("id", before.id);
        if (error) {
          results.push({ row: rowNum, status: "error", name: r.name, address: r.address, shop_id: before.shop_id, message: error.message });
          continue;
        }
        updated++;
        results.push({ row: rowNum, status: "update", name: r.name, address: r.address, shop_id: before.shop_id, changedFields: changed });
        continue;
      }

      const { data: ins, error } = await (supabaseAdmin as any)
        .from("shops_custom").insert(payload).select("shop_id").single();
      if (error) {
        results.push({ row: rowNum, status: "error", name: r.name, address: r.address, message: error.message });
        continue;
      }
      inserted++;
      results.push({ row: rowNum, status: "insert", name: r.name, address: r.address, shop_id: ins?.shop_id });
    }

    const errors = results.filter((r) => r.status === "error").map((r) => ({ row: r.row, message: r.message ?? "" }));
    return { inserted, updated, skipped, errors, results };
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
