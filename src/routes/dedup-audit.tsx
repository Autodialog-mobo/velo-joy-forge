import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import shopsData from "@/data/shops.json";
import {
  dedupeShopsByAddressWithAudit,
  type DedupeShop,
} from "@/lib/dedupe-shops";

export const Route = createFileRoute("/dedup-audit")({
  head: () => ({
    meta: [
      { title: "Shop dedup audit — Velopass" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: DedupAuditPage,
});

type Shop = DedupeShop & {
  name?: string;
  city?: string;
  country?: string;
  address?: string;
};

function shopLabel(s: Shop) {
  return `${s.name ?? "(no name)"} — ${s.address ?? "(no address)"}`;
}

function DedupAuditPage() {
  const audit = useMemo(
    () => dedupeShopsByAddressWithAudit(shopsData as Shop[]),
    [],
  );
  const [filter, setFilter] = useState<"all" | "same-address" | "same-coordinates">("all");
  const [q, setQ] = useState("");

  const merges = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return audit.merges
      .filter((m) => filter === "all" || m.reason === filter)
      .filter((m) => {
        if (!needle) return true;
        const hay = [
          m.key,
          shopLabel(m.keeper as Shop),
          ...m.dropped.map((d) => shopLabel(d as Shop)),
        ]
          .join(" \n ")
          .toLowerCase();
        return hay.includes(needle);
      })
      .sort((a, b) => (a.keeper as Shop).name?.localeCompare((b.keeper as Shop).name ?? "") ?? 0);
  }, [audit.merges, filter, q]);

  const sameAddr = audit.merges.filter((m) => m.reason === "same-address").length;
  const sameCoord = audit.merges.filter((m) => m.reason === "same-coordinates").length;

  return (
    <main
      style={{
        fontFamily: "'DM Sans', system-ui, sans-serif",
        color: "#0D1F3C",
        maxWidth: 1100,
        margin: "0 auto",
        padding: "40px 24px 80px",
      }}
    >
      <h1 style={{ fontSize: 28, fontWeight: 600, margin: 0 }}>Shop dedup audit</h1>
      <p style={{ color: "#5B6B85", marginTop: 8 }}>
        Overzicht van samengevoegde winkels uit <code>src/data/shops.json</code>.
      </p>

      <section style={statGridStyle}>
        <Stat label="Ruwe entries" value={audit.rawTotal} />
        <Stat label="Actief" value={audit.activeTotal} />
        <Stat label="Inactief (weggelaten)" value={audit.droppedInactive} />
        <Stat label="Uniek na dedup" value={audit.uniqueTotal} tone="accent" />
        <Stat label="Merges op adres" value={sameAddr} />
        <Stat label="Merges op coördinaten" value={sameCoord} />
      </section>

      <div style={{ display: "flex", gap: 12, margin: "24px 0 16px", flexWrap: "wrap" }}>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          style={inputStyle}
        >
          <option value="all">Alle redenen ({audit.merges.length})</option>
          <option value="same-address">Zelfde adresstring ({sameAddr})</option>
          <option value="same-coordinates">Zelfde lat/lng ({sameCoord})</option>
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Zoek op naam, adres of key…"
          style={{ ...inputStyle, flex: 1, minWidth: 220 }}
        />
      </div>

      <p style={{ color: "#5B6B85", marginBottom: 12 }}>
        {merges.length} merge-groep{merges.length === 1 ? "" : "en"} getoond.
      </p>

      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
        {merges.map((m, i) => {
          const keeper = m.keeper as Shop;
          return (
            <li
              key={i}
              style={{
                border: "1px solid #E5E9F0",
                borderRadius: 12,
                padding: 16,
                background: "#fff",
              }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={badge(m.reason === "same-address" ? "#2ECC8A" : "#F59E0B")}>
                  {m.reason === "same-address" ? "zelfde adres" : "zelfde lat/lng"}
                </span>
                <code style={{ color: "#5B6B85", fontSize: 12 }}>{m.key}</code>
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: "#5B6B85", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Behouden ({(keeper.brands?.length ?? 0)} brands)
                </div>
                <ShopRow shop={keeper} highlight />
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: "#5B6B85", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Weggelaten ({m.dropped.length})
                </div>
                {m.dropped.map((d, j) => (
                  <ShopRow key={j} shop={d as Shop} />
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "accent" }) {
  return (
    <div
      style={{
        border: "1px solid #E5E9F0",
        borderRadius: 12,
        padding: 16,
        background: tone === "accent" ? "#E8FBF1" : "#fff",
      }}
    >
      <div style={{ fontSize: 12, color: "#5B6B85", textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 600, marginTop: 4 }}>{value.toLocaleString("nl-BE")}</div>
    </div>
  );
}

function ShopRow({ shop, highlight }: { shop: Shop; highlight?: boolean }) {
  return (
    <div
      style={{
        marginTop: 6,
        padding: "8px 10px",
        borderRadius: 8,
        background: highlight ? "#F1FBF6" : "#F7F8FB",
        fontSize: 14,
      }}
    >
      <div style={{ fontWeight: 500 }}>{shop.name ?? "(no name)"}</div>
      <div style={{ color: "#5B6B85", fontSize: 13 }}>{shop.address ?? "(no address)"}</div>
      <div style={{ color: "#8A98B0", fontSize: 12, marginTop: 2 }}>
        lat {shop.lat ?? "?"}, lng {shop.lng ?? "?"} · brands {shop.brands?.length ?? 0}
      </div>
    </div>
  );
}

const statGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 12,
  marginTop: 20,
};

const inputStyle: React.CSSProperties = {
  border: "1px solid #E5E9F0",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 14,
  fontFamily: "inherit",
  color: "#0D1F3C",
  background: "#fff",
};

function badge(bg: string): React.CSSProperties {
  return {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 999,
    background: bg,
    color: "#0D1F3C",
    fontSize: 12,
    fontWeight: 500,
  };
}
