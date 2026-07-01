import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Store, Mail, Phone, ExternalLink, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listShopSignups, updateShopSignup } from "@/lib/shop-signups.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin-shop-signups")({
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
  component: ShopSignupsPage,
});

const STATUSES = ["new", "contacted", "converted", "rejected"] as const;
type Status = (typeof STATUSES)[number];
const LANGS = ["nl", "fr", "de", "en", "es"] as const;

const STATUS_LABEL: Record<Status, string> = {
  new: "Nieuw",
  contacted: "Gecontacteerd",
  converted: "Geconverteerd",
  rejected: "Afgewezen",
};

function statusStyle(s: string): React.CSSProperties {
  switch (s) {
    case "new":
      return { background: "rgba(86,156,255,0.12)", color: "#7AB0FF", border: "1px solid rgba(86,156,255,0.30)" };
    case "contacted":
      return { background: "rgba(224,163,62,0.12)", color: "#E0A33E", border: "1px solid rgba(224,163,62,0.30)" };
    case "converted":
      return { background: "rgba(46,204,138,0.12)", color: "#2ECC8A", border: "1px solid rgba(46,204,138,0.30)" };
    case "rejected":
      return { background: "rgba(224,82,82,0.12)", color: "#E05252", border: "1px solid rgba(224,82,82,0.30)" };
    default:
      return {};
  }
}

function ShopSignupsPage() {
  const list = useServerFn(listShopSignups);
  const update = useServerFn(updateShopSignup);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["shop-signups"],
    queryFn: () => list({ data: {} as any }),
  });

  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [langFilter, setLangFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const rows: any[] = data?.rows ?? [];

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (langFilter !== "all" && (r.lang || "").toLowerCase() !== langFilter) return false;
      if (needle) {
        const hay = [
          r.email, r.shop_name, r.first_name, r.last_name, r.vat, r.phone, r.address,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [rows, statusFilter, langFilter, q]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length, new: 0, contacted: 0, converted: 0, rejected: 0 };
    rows.forEach((r) => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [rows]);

  const onChangeStatus = async (id: string, status: Status) => {
    setSavingId(id);
    try {
      await update({ data: { id, status } });
      toast.success(`Status bijgewerkt naar ${STATUS_LABEL[status]}`);
      refetch();
    } catch (err: any) {
      toast.error(err.message ?? "Wijzigen mislukt");
    } finally {
      setSavingId(null);
    }
  };

  const onSaveNote = async (id: string) => {
    setSavingId(id);
    try {
      await update({ data: { id, admin_notes: noteDraft } });
      toast.success("Notitie opgeslagen");
      refetch();
      setOpenId(null);
    } catch (err: any) {
      toast.error(err.message ?? "Opslaan mislukt");
    } finally {
      setSavingId(null);
    }
  };

  const open = openId ? rows.find((r) => r.id === openId) : null;

  return (
    <div style={{ background: "#0E0F12", minHeight: "100vh", color: "#fff" }}>
      <div className="max-w-[1200px] mx-auto px-5 py-8 md:px-10 md:py-12">
        <div className="mb-2 text-xs uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>
          Velopass · Back-office
        </div>
        <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <h1 className="flex items-center gap-3" style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 32 }}>
            <Store size={26} /> Shop-aanmeldingen
          </h1>
          <a href="/admin" className="text-sm" style={{ color: "#2ECC8A", borderBottom: "1px dashed #2ECC8A" }}>
            ← Terug naar fulfillment
          </a>
        </div>

        {/* Filters */}
        <div className="rounded-2xl p-4 mb-6" style={{ background: "#15171C", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex flex-wrap gap-2 mb-3">
            {(["all", ...STATUSES] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s as any)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold"
                style={
                  statusFilter === s
                    ? { background: "#2ECC8A", color: "#0E0F12" }
                    : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.1)" }
                }
              >
                {s === "all" ? "Alle" : STATUS_LABEL[s as Status]} ({counts[s] ?? 0})
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>Taal</span>
              <select
                value={langFilter}
                onChange={(e) => setLangFilter(e.target.value)}
                className="px-3 py-2 rounded-lg text-sm"
                style={{ background: "#0E0F12", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}
              >
                <option value="all">Alle</option>
                {LANGS.map((l) => (
                  <option key={l} value={l}>{l.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <Search size={14} style={{ color: "rgba(255,255,255,0.4)" }} />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Zoek op winkel, e-mail, BTW, naam…"
                className="flex-1 px-3 py-2 rounded-lg text-sm"
                style={{ background: "#0E0F12", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "#15171C", border: "1px solid rgba(255,255,255,0.08)" }}>
          {isLoading ? (
            <div className="p-6 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>Laden…</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>Geen aanmeldingen gevonden.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ color: "rgba(255,255,255,0.5)" }}>
                    <th className="text-left px-4 py-3 font-medium">Datum</th>
                    <th className="text-left px-4 py-3 font-medium">Winkel</th>
                    <th className="text-left px-4 py-3 font-medium">Contact</th>
                    <th className="text-left px-4 py-3 font-medium">Taal</th>
                    <th className="text-left px-4 py-3 font-medium">POS</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-right px-4 py-3 font-medium">Actie</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-t border-white/5 align-top">
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: "rgba(255,255,255,0.7)" }}>
                        {new Date(r.created_at).toLocaleDateString("nl-BE")}
                        <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                          {new Date(r.created_at).toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold">{r.shop_name || "—"}</div>
                        <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{r.vat || "geen BTW"}</div>
                        {r.address && (
                          <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>{r.address}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div>{[r.first_name, r.last_name].filter(Boolean).join(" ") || "—"}</div>
                        <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1 text-xs mt-0.5" style={{ color: "#7AB0FF" }}>
                          <Mail size={11} /> {r.email}
                        </a>
                        {r.phone && (
                          <div className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "rgba(255,255,255,0.6)" }}>
                            <Phone size={11} /> {r.phone}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
                          {(r.lang || "—").toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
                        {r.pos_system || "—"}
                        {r.pos_other && <div style={{ color: "rgba(255,255,255,0.5)" }}>{r.pos_other}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={r.status}
                          disabled={savingId === r.id}
                          onChange={(e) => onChangeStatus(r.id, e.target.value as Status)}
                          className="px-2 py-1 rounded-md text-xs font-semibold"
                          style={statusStyle(r.status)}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s} style={{ color: "#000" }}>{STATUS_LABEL[s]}</option>
                          ))}
                        </select>
                        {r.admin_notes && (
                          <div className="text-xs mt-1 line-clamp-2 max-w-[220px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                            {r.admin_notes}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => { setOpenId(r.id); setNoteDraft(r.admin_notes ?? ""); }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
                          style={{ background: "rgba(255,255,255,0.06)", color: "#fff", border: "1px solid rgba(255,255,255,0.12)" }}
                        >
                          <ExternalLink size={12} /> Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-3 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
          {filtered.length} van {rows.length} aanmeldingen
        </div>
      </div>

      {/* Detail modal */}
      {open && (
        <div
          onClick={() => setOpenId(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6"
            style={{ background: "#15171C", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-xs uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Shop-aanmelding
                </div>
                <h2 className="text-xl font-semibold mt-1">{open.shop_name || "—"}</h2>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={statusStyle(open.status)}>
                {STATUS_LABEL[open.status as Status] ?? open.status}
              </span>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-4">
              <div><dt className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Contact</dt><dd>{[open.first_name, open.last_name].filter(Boolean).join(" ") || "—"}</dd></div>
              <div><dt className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Taal</dt><dd>{(open.lang || "—").toUpperCase()}</dd></div>
              <div><dt className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>E-mail</dt><dd><a href={`mailto:${open.email}`} style={{ color: "#7AB0FF" }}>{open.email}</a></dd></div>
              <div><dt className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Telefoon</dt><dd>{open.phone || "—"}</dd></div>
              <div><dt className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>BTW</dt><dd>{open.vat || "—"}</dd></div>
              <div><dt className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>POS</dt><dd>{open.pos_system || "—"}{open.pos_other ? ` (${open.pos_other})` : ""}</dd></div>
              <div className="sm:col-span-2"><dt className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Adres</dt><dd>{open.address || "—"}</dd></div>
              <div className="sm:col-span-2"><dt className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Aangemeld</dt><dd>{new Date(open.created_at).toLocaleString("nl-BE")}</dd></div>
            </dl>

            <div className="mb-4">
              <label className="text-xs uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>
                Interne notitie
              </label>
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                rows={4}
                className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
                style={{ background: "#0E0F12", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}
                placeholder="Notities zichtbaar voor admins…"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setOpenId(null)}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ background: "rgba(255,255,255,0.06)", color: "#fff", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                Sluiten
              </button>
              <button
                onClick={() => onSaveNote(open.id)}
                disabled={savingId === open.id}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
                style={{ background: "#2ECC8A", color: "#0E0F12" }}
              >
                <Save size={14} /> {savingId === open.id ? "Opslaan…" : "Notitie opslaan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
