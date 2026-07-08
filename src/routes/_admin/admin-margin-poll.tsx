import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listMarginPoll } from "@/lib/margin-poll.functions";

export const Route = createFileRoute("/_admin/admin-margin-poll")({
  ssr: false,
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id)
      .in("role", ["admin", "staff"]);
    if (!roles || roles.length === 0) throw redirect({ to: "/admin" });
  },
  component: MarginPollAdmin,
});

type Row = {
  id: string;
  shop_name: string;
  choice: "ja" | "misschien" | "nee";
  reason: string | null;
  created_at: string;
  updated_at: string;
};

const CHOICE_LABEL: Record<Row["choice"], string> = {
  ja: "Ja, graag",
  misschien: "Misschien",
  nee: "Nee",
};

function choiceStyle(c: Row["choice"]): React.CSSProperties {
  switch (c) {
    case "ja":
      return { background: "rgba(46,204,138,0.12)", color: "#2ECC8A", border: "1px solid rgba(46,204,138,0.30)" };
    case "misschien":
      return { background: "rgba(224,163,62,0.12)", color: "#E0A33E", border: "1px solid rgba(224,163,62,0.30)" };
    case "nee":
      return { background: "rgba(224,82,82,0.12)", color: "#E05252", border: "1px solid rgba(224,82,82,0.30)" };
  }
}

function MarginPollAdmin() {
  const list = useServerFn(listMarginPoll);
  const { data, isLoading } = useQuery({
    queryKey: ["margin-poll"],
    queryFn: () => list({ data: {} as any }),
  });
  const [filter, setFilter] = useState<Row["choice"] | "all">("all");

  const rows = (data?.rows ?? []) as Row[];
  const counts = useMemo(() => {
    const c = { ja: 0, misschien: 0, nee: 0 };
    for (const r of rows) c[r.choice] += 1;
    return c;
  }, [rows]);

  const filtered = filter === "all" ? rows : rows.filter((r) => r.choice === filter);

  const toCsv = () => {
    const header = ["shop_name", "choice", "reason", "created_at", "updated_at"];
    const esc = (v: unknown) =>
      `"${String(v ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
    const body = rows.map((r) =>
      [r.shop_name, r.choice, r.reason ?? "", r.created_at, r.updated_at].map(esc).join(","),
    );
    const blob = new Blob([[header.join(","), ...body].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `margin-poll-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0B1220", color: "#E7ECF3", padding: "32px 20px", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, margin: 0 }}>Margetoelichting — poll</h1>
            <p style={{ color: "#8A99B4", margin: "6px 0 0", fontSize: 14 }}>
              <a href="/admin" style={{ color: "#2ECC8A" }}>← Terug naar admin</a>
            </p>
          </div>
          <button
            onClick={toCsv}
            style={{ background: "#2ECC8A", color: "#0B1220", border: 0, borderRadius: 8, padding: "10px 16px", fontWeight: 700, cursor: "pointer" }}
          >
            Exporteer CSV
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
          {(["ja", "misschien", "nee"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setFilter(filter === c ? "all" : c)}
              style={{
                textAlign: "left",
                background: "#131C2E",
                border: `1px solid ${filter === c ? "#2ECC8A" : "#1F2A44"}`,
                borderRadius: 12,
                padding: 16,
                cursor: "pointer",
                color: "inherit",
              }}
            >
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: "#8A99B4" }}>{CHOICE_LABEL[c]}</div>
              <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{counts[c]}</div>
            </button>
          ))}
          <button
            onClick={() => setFilter("all")}
            style={{
              textAlign: "left",
              background: "#131C2E",
              border: `1px solid ${filter === "all" ? "#2ECC8A" : "#1F2A44"}`,
              borderRadius: 12,
              padding: 16,
              cursor: "pointer",
              color: "inherit",
            }}
          >
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: "#8A99B4" }}>Totaal</div>
            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{rows.length}</div>
          </button>
        </div>

        {isLoading ? (
          <p style={{ color: "#8A99B4" }}>Laden…</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: "#8A99B4" }}>Nog geen antwoorden.</p>
        ) : (
          <div style={{ background: "#131C2E", border: "1px solid #1F2A44", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "#0F1728", color: "#8A99B4", textAlign: "left" }}>
                  <th style={{ padding: 12 }}>Winkel</th>
                  <th style={{ padding: 12 }}>Antwoord</th>
                  <th style={{ padding: 12 }}>Reden</th>
                  <th style={{ padding: 12, whiteSpace: "nowrap" }}>Laatst geüpdatet</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} style={{ borderTop: "1px solid #1F2A44" }}>
                    <td style={{ padding: 12, fontWeight: 600 }}>{r.shop_name}</td>
                    <td style={{ padding: 12 }}>
                      <span style={{ ...choiceStyle(r.choice), padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
                        {CHOICE_LABEL[r.choice]}
                      </span>
                    </td>
                    <td style={{ padding: 12, color: r.reason ? "#E7ECF3" : "#5A6885", fontStyle: r.reason ? "normal" : "italic" }}>
                      {r.reason || "—"}
                    </td>
                    <td style={{ padding: 12, color: "#8A99B4", whiteSpace: "nowrap" }}>
                      {new Date(r.updated_at).toLocaleString("nl-BE")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
