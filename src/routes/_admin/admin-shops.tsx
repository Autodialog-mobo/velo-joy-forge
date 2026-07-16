import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, RefreshCw, Download, Upload, Store, Trash2, Search } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import shopsData from "@/data/shops.json";
import { dedupeShopsByAddress, normalizeAddress } from "@/lib/dedupe-shops";
import { listCustomShops, importCustomShops, deleteCustomShop, type ImportShopRow } from "@/lib/shops-admin.functions";

export const Route = createFileRoute("/_admin/admin-shops")({
  ssr: false,
  component: AdminShopsPage,
  head: () => ({ meta: [{ title: "Shops — Velopass admin" }] }),
});

const NAVY = "#0D1F3C";
const GREEN = "#2ECC8A";
const RED = "#E05252";
const SURFACE = "rgba(255,255,255,0.04)";
const SURFACE_BORDER = "rgba(255,255,255,0.08)";
const TEXT_PRI = "rgba(255,255,255,0.92)";
const TEXT_SEC = "rgba(255,255,255,0.60)";
const TEXT_MUTED = "rgba(255,255,255,0.40)";

const EYEBROW: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, letterSpacing: "0.12em",
  textTransform: "uppercase", color: TEXT_MUTED,
};

type Shop = {
  name: string;
  address: string;
  city: string;
  country: string;
  status: string;
  brands?: string[];
  lat: number;
  lng: number;
};

type Row = Shop & { source: "static" | "custom"; customId?: string; shopId?: string };

const CSV_HEADERS = ["shop_id", "name", "address", "city", "country", "status", "brands", "lat", "lng"];

function csvEscape(v: string) {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows: Row[]): string {
  const lines = [CSV_HEADERS.join(",")];
  for (const r of rows) {
    lines.push([
      csvEscape(r.shopId ?? ""),
      csvEscape(r.name),
      csvEscape(r.address),
      csvEscape(r.city),
      csvEscape(r.country),
      csvEscape(r.status),
      csvEscape((r.brands ?? []).join("|")),
      r.lat != null ? String(r.lat) : "",
      r.lng != null ? String(r.lng) : "",
    ].join(","));
  }
  return lines.join("\n");
}


// Minimal RFC4180-ish CSV parser (handles quotes, commas, newlines).
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let val = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { val += '"'; i++; }
        else inQ = false;
      } else val += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { cur.push(val); val = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        cur.push(val); rows.push(cur); cur = []; val = "";
      } else val += c;
    }
  }
  if (val.length || cur.length) { cur.push(val); rows.push(cur); }
  return rows.filter((r) => r.some((x) => x.trim() !== ""));
}

function AdminShopsPage() {
  const listFn = useServerFn(listCustomShops);
  const importFn = useServerFn(importCustomShops);
  const deleteFn = useServerFn(deleteCustomShop);
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "static" | "custom">("all");
  const [importing, setImporting] = useState(false);
  const [importReport, setImportReport] = useState<any[] | null>(null);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["admin-shops-custom"],
    queryFn: () => listFn({ data: {} as any }),
  });

  const customRows: any[] = data?.rows ?? [];

  const rows: Row[] = useMemo(() => {
    const staticShops = (shopsData as Shop[]).map((s) => ({ ...s, source: "static" as const }));
    const customShops: Row[] = customRows.map((c) => ({
      name: c.name,
      address: c.address,
      city: c.city ?? "",
      country: c.country ?? "",
      status: c.status,
      brands: c.brands ?? [],
      lat: c.lat ?? 0,
      lng: c.lng ?? 0,
      source: "custom" as const,
      customId: c.id,
      shopId: c.shop_id,
    }));
    const combined = [...staticShops, ...customShops];
    // Dedupe the same way both maps do, then re-attach source based on address_key.
    const kept = dedupeShopsByAddress(combined as any) as Row[];
    // Note: dedupe may replace a static entry with a custom entry with more brands
    // (or vice versa). Preserve whichever was kept.
    return kept;
  }, [customRows]);

  const staticKeys = useMemo(
    () => Array.from(new Set((shopsData as Shop[])
      .filter((s) => s.status === "active" && s.address)
      .map((s) => normalizeAddress(s.address)))),
    [],
  );

  const tabRows = useMemo(
    () => (tab === "all" ? rows : rows.filter((r) => r.source === tab)),
    [rows, tab],
  );

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return tabRows;
    return tabRows.filter((r) =>
      r.name.toLowerCase().includes(query) ||
      (r.city ?? "").toLowerCase().includes(query) ||
      (r.address ?? "").toLowerCase().includes(query) ||
      (r.country ?? "").toLowerCase().includes(query),
    );
  }, [tabRows, q]);

  const staticCount = rows.filter((r) => r.source === "static").length;
  const customCount = rows.filter((r) => r.source === "custom").length;

  function handleExport() {
    const csv = toCsv(tabRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `velopass-shops-${tab}-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleImport(file: File) {
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      if (parsed.length < 2) {
        toast.error("CSV is leeg of bevat geen data-rijen.");
        return;
      }
      const header = parsed[0].map((h) => h.trim().toLowerCase());
      const idx = (name: string) => header.indexOf(name);
      const iName = idx("name");
      const iAddr = idx("address");
      if (iName < 0 || iAddr < 0) {
        toast.error(`CSV mist verplichte kolommen: name, address. Gevonden: ${header.join(", ")}`);
        return;
      }
      const iCity = idx("city");
      const iCountry = idx("country");
      const iStatus = idx("status");
      const iBrands = idx("brands");
      const iLat = idx("lat");
      const iLng = idx("lng");
      const iShopId = idx("shop_id");

      const rowsOut: ImportShopRow[] = [];
      for (let i = 1; i < parsed.length; i++) {
        const r = parsed[i];
        const name = (r[iName] ?? "").trim();
        const address = (r[iAddr] ?? "").trim();
        if (!name || !address) continue;
        const brandsRaw = iBrands >= 0 ? (r[iBrands] ?? "") : "";
        const brands = brandsRaw
          .split(/[|;]/)
          .map((b: string) => b.trim())
          .filter(Boolean);
        const parseNum = (s: string | undefined) => {
          if (s == null) return undefined;
          const t = s.trim();
          if (!t) return undefined;
          const n = Number(t.replace(",", "."));
          return Number.isFinite(n) ? n : undefined;
        };
        rowsOut.push({
          shop_id: iShopId >= 0 ? (r[iShopId] ?? "").trim() : "",
          name,
          address,
          city: iCity >= 0 ? (r[iCity] ?? "").trim() : "",
          country: iCountry >= 0 ? (r[iCountry] ?? "").trim() : "",
          status: iStatus >= 0 ? ((r[iStatus] ?? "").trim() || "active") : "active",
          brands,
          lat: parseNum(iLat >= 0 ? r[iLat] : undefined) ?? null,
          lng: parseNum(iLng >= 0 ? r[iLng] : undefined) ?? null,
        });
      }
      if (rowsOut.length === 0) {
        toast.error("Geen geldige rijen gevonden.");
        return;
      }
      const res = await importFn({ data: { rows: rowsOut, staticKeys } });
      const parts: string[] = [];
      if (res.inserted) parts.push(`${res.inserted} nieuw`);
      if (res.updated) parts.push(`${res.updated} bijgewerkt`);
      if (res.skipped) parts.push(`${res.skipped} overgeslagen (dubbel)`);
      toast.success(`Import klaar: ${parts.join(", ") || "geen wijzigingen"}`);
      if (res.errors?.length) {
        toast.error(`${res.errors.length} rij(en) met fouten — zie console`);
        console.warn("[shop-import] errors", res.errors);
      }
      qc.invalidateQueries({ queryKey: ["admin-shops-custom"] });
    } catch (e: any) {
      toast.error(`Import mislukt: ${e?.message ?? e}`);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Deze aangepaste winkel verwijderen?")) return;
    try {
      await deleteFn({ data: { id } });
      toast.success("Winkel verwijderd");
      qc.invalidateQueries({ queryKey: ["admin-shops-custom"] });
    } catch (e: any) {
      toast.error(`Verwijderen mislukt: ${e?.message ?? e}`);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: NAVY, color: TEXT_PRI, fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif" }}>
      <style>{`
        .btn { display:inline-flex; align-items:center; gap:6px; padding:8px 14px; border-radius:8px; font-size:13px; cursor:pointer; transition:all .15s ease; border:1px solid ${SURFACE_BORDER}; background:transparent; color:${TEXT_PRI}; }
        .btn:hover { background: rgba(255,255,255,0.06); }
        .btn:disabled { opacity:.5; cursor:not-allowed; }
        .btn-primary { background:${GREEN}; color:${NAVY}; border-color:transparent; font-weight:600; }
        .btn-primary:hover { background:#25b378; }
        .btn-danger { color:${RED}; border-color:rgba(224,82,82,0.30); }
        .btn-danger:hover { background: rgba(224,82,82,0.10); }
        .card { background:${SURFACE}; border:1px solid ${SURFACE_BORDER}; border-radius:12px; }
        .row { display:grid; grid-template-columns: 1fr 2fr 1fr 60px 90px 80px; gap:16px; padding:12px 16px; align-items:center; border-bottom:1px solid ${SURFACE_BORDER}; font-size:13px; }
        .row:last-child { border-bottom:none; }
        .pill { display:inline-flex; align-items:center; gap:6px; padding:2px 8px; border-radius:999px; font-size:10px; font-weight:600; }
        input[type="text"] { background:${SURFACE}; border:1px solid ${SURFACE_BORDER}; color:${TEXT_PRI}; padding:8px 12px 8px 34px; border-radius:8px; font-size:13px; width: 100%; }
        input[type="text"]:focus { outline: 2px solid ${GREEN}; outline-offset: 0; }
      `}</style>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "32px 24px 64px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <Link to="/admin" style={{ ...EYEBROW, color: TEXT_SEC, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <ArrowLeft size={12} /> Terug naar admin
            </Link>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: "8px 0 4px" }}>Shops</h1>
            <p style={{ color: TEXT_SEC, fontSize: 14, margin: 0 }}>
              Alle winkels die op de fietser- en pro-map getoond worden. {rows.length} actief
              {" · "}{staticCount} statisch{customCount ? ` · ${customCount} aangepast` : ""}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw size={14} style={{ opacity: isFetching ? 0.5 : 1 }} />
              Ververs
            </button>
            <button className="btn" onClick={handleExport}>
              <Download size={14} /> Exporteer CSV
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImport(f);
              }}
            />
            <button className="btn btn-primary" onClick={() => fileRef.current?.click()} disabled={importing}>
              <Upload size={14} /> {importing ? "Importeren…" : "Importeer CSV"}
            </button>
          </div>
        </div>

        <div className="card" style={{ padding: 12, marginBottom: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "inline-flex", gap: 4, background: "rgba(0,0,0,0.20)", padding: 4, borderRadius: 8 }}>
            {([
              { key: "all", label: `Alle (${rows.length})` },
              { key: "static", label: `Statisch (${staticCount})` },
              { key: "custom", label: `Aangepast (${customCount})` },
            ] as const).map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{
                    padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                    border: "none", cursor: "pointer",
                    background: active ? GREEN : "transparent",
                    color: active ? NAVY : TEXT_SEC,
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: TEXT_MUTED }} />
            <input
              type="text"
              placeholder="Zoek op naam, adres, stad, land…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div style={{ fontSize: 12, color: TEXT_SEC }}>
            {filtered.length} van {tabRows.length} getoond
          </div>
        </div>

        <div className="card">
          <div className="row" style={{ ...EYEBROW, color: TEXT_MUTED }}>
            <div>Naam</div>
            <div>Adres</div>
            <div>Stad</div>
            <div>Land</div>
            <div>Bron</div>
            <div style={{ textAlign: "right" }}>Acties</div>
          </div>
          {filtered.length === 0 && (
            <div style={{ padding: 32, textAlign: "center", color: TEXT_MUTED, fontSize: 13 }}>
              Geen winkels gevonden.
            </div>
          )}
          {filtered.slice(0, 500).map((r, i) => (
            <div key={`${r.source}-${r.customId ?? i}`} className="row">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Store size={14} style={{ color: TEXT_MUTED, flexShrink: 0 }} />
                <div style={{ color: TEXT_PRI, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
              </div>
              <div style={{ color: TEXT_SEC, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.address}</div>
              <div style={{ color: TEXT_SEC }}>{r.city}</div>
              <div style={{ color: TEXT_SEC, textTransform: "uppercase", fontFamily: "ui-monospace, monospace", fontSize: 11 }}>{r.country}</div>
              <div>
                {r.source === "custom" ? (
                  <span className="pill" style={{ background: "rgba(46,204,138,0.12)", color: GREEN, border: "1px solid rgba(46,204,138,0.30)", fontFamily: "ui-monospace, monospace" }}>
                    {r.shopId ?? "Aangepast"}
                  </span>
                ) : (
                  <span className="pill" style={{ background: "rgba(255,255,255,0.06)", color: TEXT_SEC, border: `1px solid ${SURFACE_BORDER}` }}>
                    Statisch
                  </span>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                {r.source === "custom" && r.customId && (
                  <button className="btn btn-danger" onClick={() => handleDelete(r.customId!)} style={{ padding: "4px 8px" }}>
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {filtered.length > 500 && (
            <div style={{ padding: 16, textAlign: "center", color: TEXT_MUTED, fontSize: 12 }}>
              Eerste 500 rijen getoond. Verfijn de zoekopdracht om meer te zien.
            </div>
          )}
        </div>

        <div className="card" style={{ marginTop: 24, padding: 20, fontSize: 13, color: TEXT_SEC, lineHeight: 1.6 }}>
          <div style={{ ...EYEBROW, marginBottom: 8 }}>CSV formaat</div>
          <div>
            Kolommen: <code style={{ color: TEXT_PRI }}>{CSV_HEADERS.join(", ")}</code>.
            Merken zijn pipe-gescheiden (<code>Trek|Cube|Giant</code>).
            Import-logica: rijen met een bestaande <code>shop_id</code> worden bijgewerkt (ook bij adreswijziging).
            Rijen zonder <code>shop_id</code> waarvan het adres al in het statische bestand staat worden overgeslagen;
            overige nieuwe adressen krijgen automatisch een nieuwe <code>shop_id</code> (bv. <code>vp_000042</code>).
          </div>
        </div>
      </div>
    </div>
  );
}
