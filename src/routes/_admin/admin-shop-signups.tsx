import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Store, Mail, Phone, ExternalLink, Save, Copy, Check, ArrowUpDown, ArrowUp, ArrowDown, Send, Loader2, AlertCircle, RefreshCcw } from "lucide-react";
import { listShopSignups, updateShopSignup, pushShopSignupToVelopassPro, setShopSignupManagementId } from "@/lib/shop-signups.functions";
import { toast } from "sonner";


export const Route = createFileRoute("/_admin/admin-shop-signups")({
  ssr: false,
  component: ShopSignupsPage,
});

const STATUSES = ["new", "contacted", "converted", "rejected"] as const;
type Status = (typeof STATUSES)[number];
const LANGS = ["nl", "fr", "de", "en", "es"] as const;
const VELOPASS_PRO_ORGANISATION_URL = "https://management.velopass.com/organisations";

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
  const pushToPro = useServerFn(pushShopSignupToVelopassPro);
  const setManagementId = useServerFn(setShopSignupManagementId);
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["shop-signups"],
    queryFn: () => list({ data: {} as any }),
  });

  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [langFilter, setLangFilter] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [countrySort, setCountrySort] = useState<"asc" | "desc" | null>(null);
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [labelCopied, setLabelCopied] = useState(false);

  const [pushingId, setPushingId] = useState<string | null>(null);
  const [pushError, setPushError] = useState<any | null>(null);
  const [pushSuccess, setPushSuccess] = useState<{ id: string; managementId: string } | null>(null);
  const [pushedIds, setPushedIds] = useState<Set<string>>(new Set());
  const [statusError, setStatusError] = useState<{ id: string; status: Status; message: string } | null>(null);
  const isPushingRef = useRef(false);

  // Sluit de detailmodal met de Escape-toets.
  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpenId(null);
        setPushError(null);
        setPushSuccess(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId]);

  const rows: any[] = data?.rows ?? [];


  const countries = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const c = (r.country || "").trim();
      if (c) set.add(c);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "nl"));
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (langFilter !== "all" && (r.lang || "").toLowerCase() !== langFilter) return false;
      if (countryFilter !== "all" && (r.country || "").trim() !== countryFilter) return false;
      if (needle) {
        const hay = [
          r.email, r.shop_name, r.first_name, r.last_name, r.vat, r.phone, r.address, r.country,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    if (countrySort) {
      list = list.slice().sort((a, b) => {
        const ca = (a.country || "").toLowerCase();
        const cb = (b.country || "").toLowerCase();
        if (ca === cb) return 0;
        return countrySort === "asc" ? ca.localeCompare(cb, "nl") : cb.localeCompare(ca, "nl");
      });
    }
    return list;
  }, [rows, statusFilter, langFilter, countryFilter, countrySort, q]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length, new: 0, contacted: 0, converted: 0, rejected: 0 };
    rows.forEach((r) => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [rows]);

  const onChangeStatus = async (id: string, status: Status) => {
    setSavingId(id);
    try {
      // Include any unsaved draft edits from the modal so switching status
      // does not silently discard the admin's other changes.
      const payload: any = { id, status };
      if (openId === id) {
        for (const k of ["first_name","last_name","shop_name","email","phone","vat","address","country","lang","pos_system","pos_other","admin_notes"]) {
          if (draft[k] !== undefined) payload[k] = draft[k] ?? "";
        }
      }
      await update({ data: payload });
      queryClient.setQueryData(["shop-signups"], (old: any) => {
        if (!old?.rows) return old;
        return { ...old, rows: old.rows.map((r: any) => (r.id === id ? { ...r, ...payload, status } : r)) };
      });
      await refetch();
      setStatusError(null);
      toast.success(`Status opgeslagen: ${STATUS_LABEL[status]}`);
    } catch (err: any) {
      setStatusError({ id, status, message: err.message ?? "Onbekende fout" });
      toast.error(`Status niet opgeslagen: ${err.message ?? "Onbekende fout"}`);
    } finally {
      setSavingId(null);
    }
  };

  const onSaveDetails = async (id: string) => {
    if (savingId || pushingId) return;
    setSavingId(id);
    try {
      const payload: any = { id };
      for (const k of ["first_name","last_name","shop_name","email","phone","vat","address","country","lang","pos_system","pos_other","admin_notes"]) {
        payload[k] = draft[k] ?? "";
      }
      const res = await update({ data: payload });
      toast.success(res?.changed ? "Aanmelding bijgewerkt" : "Geen wijzigingen");
      refetch();
      setOpenId(null);
    } catch (err: any) {
      toast.error(err.message ?? "Opslaan mislukt");
    } finally {
      setSavingId(null);
    }
  };

  const onPushToPro = async (id: string) => {
    if (isPushingRef.current || pushingId || savingId) return;
    isPushingRef.current = true;
    if (!confirm("Deze aanmelding doorsturen naar velopass.pro?\n\nEr wordt een nieuwe Organisation aangemaakt in het management panel.")) {
      isPushingRef.current = false;
      return;
    }
    setPushingId(id);
    setPushError(null);
    setPushSuccess(null);
    try {
      const res: any = await pushToPro({ data: { id } });
      if (res?.ok === false) {
        setPushError(res);
        toast.error(res.message ?? "Doorsturen mislukt");
        return;
      }
      const managementId = res?.managementId;
      setPushSuccess({ id, managementId: managementId ?? "" });
      setPushedIds((prev) => new Set(prev).add(id));
      toast.success(
        res?.alreadyExists
          ? "Reeds aanwezig in velopass.pro — gemarkeerd als doorgestuurd"
          : managementId
            ? `Aangemaakt in velopass.pro (id: ${managementId})`
            : "Doorgestuurd naar velopass.pro",
      );
      refetch();
    } catch (err: any) {
      setPushError({ stage: "unexpected", message: err?.message ?? "Onverwachte fout" });
      toast.error(err?.message ?? "Doorsturen mislukt");
    } finally {
      setPushingId(null);
      isPushingRef.current = false;
    }
  };

  const onSaveManagementId = async (id: string, managementId: string): Promise<boolean> => {
    try {
      await setManagementId({ data: { id, managementId } });
      toast.success("Organisation-id gekoppeld");
      refetch();
      return true;
    } catch (err: any) {
      toast.error(err?.message ?? "Koppelen mislukt");
      return false;
    }
  };





  const openRow = (r: any) => {
    setOpenId(r.id);
    setPushError(null);
    setPushSuccess(null);
    setStatusError(null);
    setLabelCopied(false);
    setDraft({

      first_name: r.first_name ?? "",
      last_name: r.last_name ?? "",
      shop_name: r.shop_name ?? "",
      email: r.email ?? "",
      phone: r.phone ?? "",
      vat: r.vat ?? "",
      address: r.address ?? "",
      country: r.country ?? "",
      lang: (r.lang ?? "").toLowerCase(),
      pos_system: r.pos_system ?? "",
      pos_other: r.pos_other ?? "",
      admin_notes: r.admin_notes ?? "",
    });
  };

  const copy = async (key: string, value: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      toast.success("Gekopieerd");
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1200);
    } catch {
      toast.error("Kopiëren mislukt");
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
              <span className="text-xs uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>Land</span>
              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="px-3 py-2 rounded-lg text-sm"
                style={{ background: "#0E0F12", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}
              >
                <option value="all">Alle</option>
                {countries.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
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
                    <th
                      className="text-left px-4 py-3 font-medium cursor-pointer select-none"
                      onClick={() =>
                        setCountrySort((prev) => (prev === "asc" ? "desc" : "asc"))
                      }
                    >
                      <span className="inline-flex items-center gap-1">
                        Land
                        {countrySort === "asc" ? (
                          <ArrowUp size={12} />
                        ) : countrySort === "desc" ? (
                          <ArrowDown size={12} />
                        ) : (
                          <ArrowUpDown size={12} style={{ opacity: 0.5 }} />
                        )}
                      </span>
                    </th>
                    <th className="text-left px-4 py-3 font-medium">Contact</th>
                    <th className="text-left px-4 py-3 font-medium">Taal</th>
                  <th className="text-left px-4 py-3 font-medium">POS</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-4 py-3 font-medium">Doorst.</th>
                </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => openRow(r)}
                      className="border-t border-white/5 align-top cursor-pointer hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: "rgba(255,255,255,0.7)" }}>
                        {new Date(r.created_at).toLocaleDateString("nl-BE")}
                        <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                          {new Date(r.created_at).toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold">{r.shop_name || "—"}</div>
                        <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{r.vat || "geen BTW"}</div>
                        {(r.address || r.country) && (
                          <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                            {[r.address, r.country].filter(Boolean).join(", ")}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: "rgba(255,255,255,0.7)" }}>
                        {r.country || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div>{[r.first_name, r.last_name].filter(Boolean).join(" ") || "—"}</div>
                        <a
                          href={`mailto:${r.email}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs mt-0.5"
                          style={{ color: "#7AB0FF" }}
                        >
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
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          {savingId === r.id && (
                            <Loader2 size={14} className="animate-spin" style={{ color: "#E0A33E" }} />
                          )}
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
                        </div>
                        {r.admin_notes && (
                          <div className="text-xs mt-1 line-clamp-2 max-w-[220px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                            {r.admin_notes}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        {r.pushed_to_pro_at ? (
                          <div className="inline-flex flex-col items-end gap-1">
                            <a
                              href={r.pushed_to_pro_management_id ? `${VELOPASS_PRO_ORGANISATION_URL}/${r.pushed_to_pro_management_id}/` : VELOPASS_PRO_ORGANISATION_URL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-end gap-1 text-xs font-semibold"
                              style={{ color: "#2ECC8A" }}
                              title="Bekijk in velopass.pro"
                            >
                              <Check size={14} /> Doorgestuurd <ExternalLink size={12} />
                            </a>
                            <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                              {new Date(r.pushed_to_pro_at).toLocaleString("nl-BE")}
                            </div>
                            {(r.pushed_to_pro_by_name || r.pushed_to_pro_by_email) && (
                              <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                                door {r.pushed_to_pro_by_name || r.pushed_to_pro_by_email}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>—</span>
                        )}
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
          onClick={() => { setOpenId(null); setPushError(null); setPushSuccess(null); }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6"
            style={{ background: "#15171C", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <div className="flex items-start justify-between mb-4 gap-3">
              <div>
                <div className="text-xs uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Shop-aanmelding
                </div>
                <h2 className="text-xl font-semibold mt-1">{open.shop_name || "—"}</h2>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {savingId === open.id && (
                  <Loader2 size={16} className="animate-spin" style={{ color: "#E0A33E" }} />
                )}
                <select
                  value={open.status}
                  disabled={savingId === open.id}
                  onChange={(e) => onChangeStatus(open.id, e.target.value as Status)}
                  className="px-2 py-1 rounded-md text-xs font-semibold shrink-0"
                  style={statusStyle(open.status)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s} style={{ color: "#000" }}>{STATUS_LABEL[s]}</option>
                  ))}
                </select>
              </div>
            </div>

            {!!statusError && statusError.id === open.id && (
              <StatusErrorPanel
                status={statusError.status}
                message={statusError.message}
                onRetry={() => onChangeStatus(statusError.id, statusError.status)}
                onDismiss={() => setStatusError(null)}
                disabled={savingId === open.id}
              />
            )}

            {open.pushed_to_pro_at || pushedIds.has(open.id) ? (
              <PushedInfoBanner
                pushedAt={open.pushed_to_pro_at ?? new Date().toISOString()}
                pushedByEmail={open.pushed_to_pro_by_email}
                pushedByName={open.pushed_to_pro_by_name}
                managementId={open.pushed_to_pro_management_id}
                shopId={open.id}
                onSaveManagementId={(mid) => onSaveManagementId(open.id, mid)}
              />

            ) : (
              <NotPushedInfoBanner
                onPush={() => onPushToPro(open.id)}
                disabled={pushingId === open.id || savingId === open.id || pushedIds.has(open.id)}
                loading={pushingId === open.id}
              />
            )}

            <EditableGrid
              draft={draft}
              setDraft={setDraft}
              copy={copy}
              copiedKey={copiedKey}
              created_at={open.created_at}
            />

            {(() => {
              const labelLines = [
                `${draft.first_name ?? ""} ${draft.last_name ?? ""}`.trim(),
                draft.shop_name,
                draft.address,
                draft.country ? String(draft.country).toUpperCase() : null,
              ].filter((l) => l && String(l).trim().length > 0) as string[];
              const labelText = labelLines.join("\n");
              if (!labelText) return null;
              return (
                <div className="mb-4">
                  <label className="text-xs uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>
                    Adreslabel
                  </label>
                  <div
                    className="mt-1 rounded-lg p-3"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.12)" }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <pre
                        className="text-[13px] leading-[1.45] m-0 whitespace-pre-wrap"
                        style={{
                          color: "#fff",
                          fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
                        }}
                      >
                        {labelText}
                      </pre>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(labelText);
                            setLabelCopied(true);
                            setTimeout(() => setLabelCopied(false), 1600);
                          } catch {}
                        }}
                        className="inline-flex items-center gap-1.5 h-[28px] px-2.5 rounded-lg text-[11px] font-medium shrink-0 transition-colors focus:outline-none focus-visible:ring-2"
                        style={{
                          background: "transparent",
                          border: "1px solid rgba(255,255,255,0.12)",
                          color: labelCopied ? "#2ECC8A" : "rgba(255,255,255,0.6)",
                        }}
                        aria-label="Kopieer adreslabel"
                      >
                        {labelCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {labelCopied ? "Gekopieerd" : "Kopieer adreslabel"}
                      </button>
                    </div>
                    {(draft.lang || "").trim() && (
                      <div
                        className="mt-2 text-right text-[10px] uppercase tracking-wide"
                        style={{ color: "rgba(255,255,255,0.4)" }}
                      >
                        {(draft.lang || "").trim().toUpperCase()}
                      </div>
                    )}
                  </div>

                </div>
              );
            })()}


            <div className="mb-4">
              <label className="text-xs uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>
                Interne notitie
              </label>
              <textarea
                value={draft.admin_notes ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, admin_notes: e.target.value }))}
                rows={4}
                className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
                style={{ background: "#0E0F12", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}
                placeholder="Notities zichtbaar voor admins…"
              />
            </div>

            {pushError && <PushErrorPanel err={pushError} onDismiss={() => setPushError(null)} />}
            {pushSuccess && !open.pushed_to_pro_at && <PushSuccessPanel success={pushSuccess} onDismiss={() => setPushSuccess(null)} />}

            <div className="flex justify-end gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setOpenId(null)}
                disabled={pushingId === open.id}
                className="px-4 py-2 rounded-lg text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: "rgba(255,255,255,0.06)", color: "#fff", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                Sluiten
              </button>
              <button
                type="button"
                onClick={() => onSaveDetails(open.id)}
                disabled={savingId === open.id || pushingId === open.id}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: "#2ECC8A", color: "#0E0F12" }}
              >
                <Save size={14} /> {savingId === open.id ? "Opslaan…" : "Wijzigingen opslaan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type EGProps = {
  draft: Record<string, string>;
  setDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  copy: (key: string, value: string) => void;
  copiedKey: string | null;
  created_at: string;
};

function EditableGrid({ draft, setDraft, copy, copiedKey, created_at }: EGProps) {
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setDraft((d) => ({ ...d, [k]: e.target.value }));

  const inputCls = "flex-1 px-2 py-1.5 rounded-md text-sm min-w-0";
  const inputStyle: React.CSSProperties = {
    background: "#0E0F12",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#fff",
  };
  const labelCls = "text-xs uppercase tracking-wider block mb-1";
  const labelStyle: React.CSSProperties = { color: "rgba(255,255,255,0.5)" };

  const renderCopyBtn = (k: string, v: string) => (
    <button
      type="button"
      onClick={() => copy(k, v)}
      disabled={!v}
      title={v ? "Kopieer" : "Leeg"}
      className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-md disabled:opacity-40"
      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}
    >
      {copiedKey === k ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );

  const renderRow = (k: string, label: string, type: string = "text") => {
    const contactValue =
      k === "contact" ? `${draft.first_name ?? ""} ${draft.last_name ?? ""}`.trim() : draft[k] ?? "";
    return (
      <div>
        <label className={labelCls} style={labelStyle}>{label}</label>
        <div className="flex items-center gap-2">
          {k === "contact" ? (
            <div className="flex-1 flex gap-2 min-w-0">
              <input
                type="text"
                value={draft.first_name ?? ""}
                onChange={set("first_name")}
                placeholder="Voornaam"
                className={inputCls}
                style={inputStyle}
              />
              <input
                type="text"
                value={draft.last_name ?? ""}
                onChange={set("last_name")}
                placeholder="Achternaam"
                className={inputCls}
                style={inputStyle}
              />
            </div>
          ) : (
            <input
              type={type}
              value={draft[k] ?? ""}
              onChange={set(k)}
              className={inputCls}
              style={inputStyle}
            />
          )}
          {renderCopyBtn(k, contactValue)}
        </div>
      </div>
    );
  };


  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
      {renderRow("contact", "Contact")}
      <div>
        <label className={labelCls} style={labelStyle}>Taal</label>
        <select value={(draft.lang ?? "").toLowerCase()} onChange={set("lang")} className={inputCls} style={inputStyle}>
          <option value="">—</option>
          {["nl","fr","de","en","es"].map((l) => (
            <option key={l} value={l}>{l.toUpperCase()}</option>
          ))}
        </select>
      </div>
      {renderRow("email", "E-mail", "email")}
      {renderRow("phone", "Telefoon", "tel")}
      {renderRow("vat", "BTW")}
      <div>
        <label className={labelCls} style={labelStyle}>POS</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={draft.pos_system ?? ""}
            onChange={set("pos_system")}
            placeholder="Systeem"
            className={inputCls}
            style={inputStyle}
          />
          <input
            type="text"
            value={draft.pos_other ?? ""}
            onChange={set("pos_other")}
            placeholder="Ander"
            className={inputCls}
            style={inputStyle}
          />
          {renderCopyBtn("pos", [draft.pos_system, draft.pos_other].filter(Boolean).join(" / "))}
        </div>
      </div>
      <div className="sm:col-span-2">
        {renderRow("shop_name", "Winkel")}
      </div>
      <div className="sm:col-span-2">
        {renderRow("address", "Adres")}
      </div>
      <div className="sm:col-span-2">
        {renderRow("country", "Land")}
      </div>
      <div className="sm:col-span-2">
        <label className={labelCls} style={labelStyle}>Aangemeld</label>
        <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 14 }}>
          {new Date(created_at).toLocaleString("nl-BE")}
        </div>
      </div>
    </div>
  );

}

function PushErrorPanel({ err, onDismiss }: { err: any; onDismiss: () => void }) {
  const stage: string = err?.stage ?? "unknown";
  const stageLabel: Record<string, string> = {
    validation: "Ontbrekende velden",
    api: `API-fout${err?.apiStatus ? ` (HTTP ${err.apiStatus})` : ""}`,
    network: "Verbindingsfout",
    auth: "Authenticatiefout",
    unexpected: "Onverwachte fout",
    unknown: "Fout",
  };
  return (
    <div
      className="mb-4 rounded-xl p-4"
      style={{ background: "rgba(224,82,82,0.08)", border: "1px solid rgba(224,82,82,0.35)" }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="text-xs uppercase tracking-wider" style={{ color: "#E05252" }}>
            Doorsturen naar velopass.pro — {stageLabel[stage] ?? stageLabel.unknown}
          </div>
          <div className="text-sm mt-1" style={{ color: "#fff" }}>
            {err?.message ?? "Er ging iets mis."}
          </div>
          {err?.detail && (
            <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.7)" }}>{err.detail}</div>
          )}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-xs px-2 py-1 rounded-md"
          style={{ background: "rgba(255,255,255,0.06)", color: "#fff", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          Sluiten
        </button>
      </div>

      {Array.isArray(err?.missing) && err.missing.length > 0 && (
        <ul className="mt-2 text-sm space-y-1" style={{ color: "rgba(255,255,255,0.85)" }}>
          {err.missing.map((m: any, i: number) => (
            <li key={i} className="flex flex-col">
              <span>
                <span style={{ color: "#E05252" }}>•</span>{" "}
                <strong>{m.label}</strong>
                <span style={{ color: "rgba(255,255,255,0.5)" }}> — veld: {m.field}</span>
              </span>
              {m.hint && (
                <span className="text-xs pl-3" style={{ color: "rgba(255,255,255,0.6)" }}>{m.hint}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {Array.isArray(err?.fieldErrors) && err.fieldErrors.length > 0 && (
        <div className="mt-2">
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>
            Velden geweigerd door velopass.pro
          </div>
          <ul className="text-sm space-y-1" style={{ color: "rgba(255,255,255,0.85)" }}>
            {err.fieldErrors.map((f: any, i: number) => (
              <li key={i}>
                <strong>{f.field}</strong>
                <ul className="pl-4 text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
                  {f.messages.map((msg: string, j: number) => (
                    <li key={j}>• {msg}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}

      {err?.raw && !err?.detail && (
        <pre
          className="mt-2 text-xs p-2 rounded-md overflow-x-auto"
          style={{ background: "#0E0F12", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {err.raw}
        </pre>
      )}

      <div className="mt-3 text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
        Tip: pas de velden hierboven aan, klik <em>Wijzigingen opslaan</em> en probeer <em>Doorsturen</em> opnieuw.
      </div>
    </div>
  );
}

function PushSuccessPanel({
  success,
  onDismiss,
}: {
  success: { id: string; managementId: string };
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copyId = async () => {
    if (!success.managementId) return;
    try {
      await navigator.clipboard.writeText(success.managementId);
      setCopied(true);
      toast.success("Organisation-id gekopieerd");
      setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error("Kopiëren mislukt");
    }
  };
  const viewUrl = success.managementId
    ? `${VELOPASS_PRO_ORGANISATION_URL}/${success.managementId}/`
    : VELOPASS_PRO_ORGANISATION_URL;

  return (
    <div
      className="mb-4 rounded-xl p-4"
      style={{ background: "rgba(46,204,138,0.08)", border: "1px solid rgba(46,204,138,0.35)" }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="text-xs uppercase tracking-wider" style={{ color: "#2ECC8A" }}>
            Succesvol doorgestuurd naar velopass.pro
          </div>
          <div className="text-sm mt-1" style={{ color: "#fff" }}>
            De Organisation is aangemaakt in het management panel.
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-xs px-2 py-1 rounded-md"
          style={{ background: "rgba(255,255,255,0.06)", color: "#fff", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          Sluiten
        </button>
      </div>

      {success.managementId && (
        <div className="mt-3 rounded-lg p-3" style={{ background: "#0E0F12", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>
            Organisation-id
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-sm" style={{ color: "#2ECC8A" }}>{success.managementId}</code>
            <button
              type="button"
              onClick={copyId}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md"
              style={{ background: "rgba(255,255,255,0.06)", color: "#fff", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Gekopieerd" : "Kopieer"}
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <a
          href={viewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: "#2ECC8A", color: "#0E0F12" }}
        >
          <ExternalLink size={12} /> Bekijk in velopass.pro
        </a>
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
          Link opent in een nieuw tabblad.
        </span>
      </div>
    </div>
  );
}


function PushedInfoBanner({
  pushedAt,
  pushedByEmail,
  pushedByName,
  managementId,
  onSaveManagementId,
}: {
  pushedAt: string;
  pushedByEmail?: string | null;
  pushedByName?: string | null;
  managementId?: string | null;
  shopId?: string;
  onSaveManagementId?: (managementId: string) => Promise<boolean>;
}) {
  const viewUrl = managementId
    ? `${VELOPASS_PRO_ORGANISATION_URL}/${managementId}/`
    : VELOPASS_PRO_ORGANISATION_URL;
  const actor = pushedByName || pushedByEmail;
  const [copied, setCopied] = useState(false);
  const [idInput, setIdInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [idError, setIdError] = useState<string | null>(null);
  const copyId = async () => {
    if (!managementId) return;
    try {
      await navigator.clipboard.writeText(managementId);
      setCopied(true);
      toast.success("Organisation-id gekopieerd");
      setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error("Kopiëren mislukt");
    }
  };
  const submitId = async () => {
    const trimmed = idInput.trim();
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(trimmed)) {
      setIdError("Voer een geldig organisation-id in (UUID-formaat).");
      return;
    }
    if (!onSaveManagementId) return;
    setIdError(null);
    setSaving(true);
    const ok = await onSaveManagementId(trimmed);
    setSaving(false);
    if (ok) setIdInput("");
  };

  return (
    <div
      className="mb-4 rounded-xl p-3"
      style={{ background: "rgba(122,176,255,0.08)", border: "1px solid rgba(122,176,255,0.30)" }}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wider" style={{ color: "#7AB0FF" }}>
            Doorgestuurd naar velopass.pro
          </div>
          <div className="text-sm mt-1" style={{ color: "#fff" }}>
            {new Date(pushedAt).toLocaleString("nl-BE")}
            {actor ? <> · door <span style={{ color: "rgba(255,255,255,0.9)" }}>{actor}</span></> : null}
            {pushedByName && pushedByEmail && pushedByName !== pushedByEmail ? (
              <span style={{ color: "rgba(255,255,255,0.5)" }}> ({pushedByEmail})</span>
            ) : null}
          </div>
          {managementId ? (
            <div className="mt-2 rounded-lg p-2.5" style={{ background: "#0E0F12", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>
                Organisation-id
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <code className="text-sm" style={{ color: "#7AB0FF" }}>{managementId}</code>
                <button
                  type="button"
                  onClick={copyId}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md"
                  style={{ background: "rgba(255,255,255,0.06)", color: "#fff", border: "1px solid rgba(255,255,255,0.12)" }}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Gekopieerd" : "Kopieer"}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-2 rounded-lg p-2.5" style={{ background: "#0E0F12", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>
                Organisation-id ontbreekt
              </div>
              <div className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>
                Plak hier de organisation-id uit velopass.pro om de link naar de shop te activeren.
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  value={idInput}
                  onChange={(e) => { setIdInput(e.target.value); if (idError) setIdError(null); }}
                  placeholder="bv. fe79bcee-c75f-47db-9427-ab87fa9f76c0"
                  disabled={saving || !onSaveManagementId}
                  className="flex-1 min-w-[260px] px-2 py-1 rounded-md text-xs font-mono"
                  style={{ background: "#15171C", color: "#fff", border: `1px solid ${idError ? "rgba(224,82,82,0.5)" : "rgba(255,255,255,0.12)"}` }}
                />
                <button
                  type="button"
                  onClick={submitId}
                  disabled={saving || !idInput.trim() || !onSaveManagementId}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ background: "rgba(122,176,255,0.14)", color: "#7AB0FF", border: "1px solid rgba(122,176,255,0.35)" }}
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  {saving ? "Opslaan…" : "Koppelen"}
                </button>
              </div>
              {idError && (
                <div className="text-xs mt-1" style={{ color: "#E05252" }}>{idError}</div>
              )}
            </div>
          )}
        </div>
        <a
          href={viewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: "rgba(122,176,255,0.14)", color: "#7AB0FF", border: "1px solid rgba(122,176,255,0.35)" }}
        >
          <ExternalLink size={12} /> Bekijken
        </a>
      </div>
    </div>
  );
}


function NotPushedInfoBanner({
  onPush,
  disabled,
  loading,
}: {
  onPush: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <div
      className="mb-4 rounded-xl p-3"
      style={{ background: "rgba(224,163,62,0.08)", border: "1px solid rgba(224,163,62,0.30)" }}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <AlertCircle size={18} style={{ color: "#E0A33E", marginTop: 2 }} />
          <div>
            <div className="text-xs uppercase tracking-wider" style={{ color: "#E0A33E" }}>
              Nog niet doorgestuurd
            </div>
            <div className="text-sm mt-1" style={{ color: "#fff" }}>
              Deze aanmelding is nog niet doorgezet naar velopass.pro.
            </div>
            <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>
              Klik op de knop om een Organisation aan te maken.
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onPush}
          disabled={disabled || loading}
          aria-busy={loading}
          title="Maak een Organisation aan op managementapi.prod.velopass.com"
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: "rgba(224,163,62,0.14)", color: "#E0A33E", border: "1px solid rgba(224,163,62,0.35)" }}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {loading ? "Doorsturen…" : "Nu doorsturen naar velopass.pro"}
        </button>
      </div>
    </div>
  );
}

function StatusErrorPanel({
  status,
  message,
  onRetry,
  onDismiss,
  disabled,
}: {
  status: Status;
  message: string;
  onRetry: () => void;
  onDismiss: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="mb-4 rounded-xl p-4"
      style={{ background: "rgba(224,82,82,0.08)", border: "1px solid rgba(224,82,82,0.35)" }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="text-xs uppercase tracking-wider" style={{ color: "#E05252" }}>
            Status opslaan mislukt
          </div>
          <div className="text-sm mt-1" style={{ color: "#fff" }}>
            {message}
          </div>
          <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>
            Status die niet werd opgeslagen: <strong>{STATUS_LABEL[status]}</strong>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-xs px-2 py-1 rounded-md"
          style={{ background: "rgba(255,255,255,0.06)", color: "#fff", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          Sluiten
        </button>
      </div>
      <button
        type="button"
        onClick={onRetry}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ background: "rgba(224,82,82,0.14)", color: "#E05252", border: "1px solid rgba(224,82,82,0.35)" }}
      >
        {disabled ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
        {disabled ? "Opnieuw proberen…" : "Opnieuw proberen"}
      </button>
    </div>
  );
}
