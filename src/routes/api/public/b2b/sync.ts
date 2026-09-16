// Catch-up sync: pushes every paid webshop order that is not yet in the
// Velopass B2B app. The Mollie webhook already pushes on payment; this runs
// on a schedule so a failed or missed webhook never needs manual action.
import { createFileRoute } from "@tanstack/react-router";

async function runSync(limit: number) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;
  const { pushOrderToB2B } = await import("@/lib/b2b/push.server");

  const { data: orders, error } = await admin
    .from("orders")
    .select("id")
    .in("status", ["paid", "printed", "shipped"])
    .is("deleted_at", null)
    .is("b2b_order_id", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);

  const ids = (orders ?? []).map((o: any) => o.id);
  if (!ids.length) return { checked: 0, pushed: 0, failed: 0, skipped: 0, results: [] };

  // Legacy imported orders have no order_lines — never auto-push those.
  const withLines = new Set<string>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data: lines } = await admin
      .from("order_lines")
      .select("order_id")
      .in("order_id", ids.slice(i, i + 200));
    for (const l of lines ?? []) withLines.add(l.order_id);
  }

  const targets = ids.filter((id: string) => withLines.has(id));
  let pushed = 0;
  let failed = 0;
  let skipped = 0;
  const results: Array<{ orderId: string; ok: boolean; error?: string; skipped?: string }> = [];

  for (const id of targets) {
    try {
      const r = await pushOrderToB2B(id, {});
      if (r.ok && !r.skipped) pushed++;
      else if (r.skipped) skipped++;
      else failed++;
      results.push({ orderId: id, ok: r.ok, error: r.error, skipped: r.skipped });
    } catch (e: any) {
      failed++;
      results.push({ orderId: id, ok: false, error: String(e?.message ?? e) });
    }
  }

  return { checked: targets.length, pushed, failed, skipped, results };
}

async function handle({ request }: { request: Request }) {
  const secret = process.env["B2B_SYNC_SECRET"];
  if (!secret) return new Response("not configured", { status: 503 });

  const url = new URL(request.url);
  const provided =
    request.headers.get("x-sync-secret") ??
    (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "") ??
    url.searchParams.get("secret");
  if (provided !== secret) return new Response("unauthorized", { status: 401 });

  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50), 1), 200);

  try {
    const summary = await runSync(limit);
    console.log("[b2b-sync]", JSON.stringify({ ...summary, results: undefined }));
    return Response.json({ ok: true, ...summary });
  } catch (e: any) {
    console.error("[b2b-sync] failed", e?.message);
    return Response.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/public/b2b/sync")({
  server: { handlers: { GET: handle, POST: handle } },
});
