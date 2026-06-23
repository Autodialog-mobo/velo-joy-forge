import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowUp, ArrowDown, Inbox, Package, CreditCard, MapPin, Calendar, User, Hash, ArrowRight, Copy, Check, Languages, ChevronLeft, ChevronRight, Undo2, Trash2, RotateCcw, History, Search, X, ExternalLink } from "lucide-react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { listOrders, markPrinted, markShipped, revertToPaid, revertToPrinted, softDeleteOrder, restoreOrder, listOrderEvents, sendTestOrderConfirmation, logPrintAudit } from "@/lib/admin.functions";
import { getMyRoles } from "@/lib/users.functions";
import { generateLabelsPdf, downloadBlob, ordersToCsv, type LabelData } from "@/lib/labels";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const adminSearchSchema = z.object({
  order: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/admin")({
  validateSearch: zodValidator(adminSearchSchema),
  component: AdminPage,
});

const STATUS_FILTERS = ["all", "paid", "printed", "shipped"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const REFERRAL_LABEL_NL: Record<string, string> = {
  bike_shop: "Via mijn fietswinkel",
  friend_family: "Via een vriend of familielid",
  social: "Social media",
  search: "Google / zoekmachine",
  ai: "Via AI (ChatGPT, …)",
  insurance: "Via mijn verzekering",
  roadside: "Via mijn pechhulpverlener",
  other: "Anders",
};
const referralLabel = (key?: string | null) => (key && REFERRAL_LABEL_NL[key]) || "—";

const LEGACY_SKU_MAP: Record<string, string> = {
  frameid_solo_onetime: "VP-FID-1",
  frameid_duo_onetime: "VP-FID-2",
  frameid_family_onetime: "VP-FID-5",
};

function mapLegacyItem(text: string) {
  if (!text) return "—";
  let out = text;
  for (const [k, v] of Object.entries(LEGACY_SKU_MAP)) {
    out = out.replaceAll(k, v);
  }
  return out.replace(/\s*×\s*/g, "×");
}

function formatEur(cents: number) {
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`;
}

// Dark-theme pill badges with leading status dot
function statusDotColor(status: string) {
  switch (status) {
    case "paid": return "#2ECC8A";
    case "printed": return "#E0A33E";
    case "shipped": return "rgba(255,255,255,0.60)";
    case "pending": return "rgba(255,255,255,0.50)";
    case "expired":
    case "failed":
    case "cancelled":
    case "canceled":
      return "#E05252";
    case "refunded": return "rgba(255,255,255,0.50)";
    default: return "rgba(255,255,255,0.40)";
  }
}
function statusLabelNl(status: string) {
  switch (status) {
    case "paid": return "Betaald";
    case "printed": return "Geprint";
    case "shipped": return "Verzonden";
    case "pending": return "Wachtend";
    case "expired": return "Verlopen";
    case "cancelled":
    case "canceled":
      return "Geannuleerd";
    case "failed": return "Mislukt";
    case "refunded": return "Terugbetaald";
    default: return status;
  }
}
function statusPillStyle(status: string): React.CSSProperties {
  switch (status) {
    case "paid":
      return { background: "rgba(46,204,138,0.12)", color: "#2ECC8A", border: "1px solid rgba(46,204,138,0.30)" };
    case "printed":
      return { background: "rgba(224,163,62,0.12)", color: "#E0A33E", border: "1px solid rgba(224,163,62,0.30)" };
    case "shipped":
      return { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.60)", border: "1px solid rgba(255,255,255,0.12)" };
    case "pending":
      return { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.60)", border: "1px solid rgba(255,255,255,0.10)" };
    case "expired":
    case "failed":
    case "cancelled":
    case "canceled":
      return { background: "rgba(224,82,82,0.12)", color: "#E05252", border: "1px solid rgba(224,82,82,0.30)" };
    case "refunded":
      return { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.10)" };
    default:
      return { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.10)" };
  }
}

const NAVY = "#0D1F3C";
const GREEN = "#2ECC8A";
const SURFACE = "rgba(255,255,255,0.04)";
const SURFACE_BORDER = "rgba(255,255,255,0.08)";
const TEXT_PRI = "rgba(255,255,255,0.92)";
const TEXT_SEC = "rgba(255,255,255,0.60)";
const TEXT_MUTED = "rgba(255,255,255,0.40)";

const EYEBROW: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color: TEXT_MUTED,
};

function AdminPage() {
  const navigate = useNavigate({ from: "/admin" });
  const search = Route.useSearch();
  const fetchOrders = useServerFn(listOrders);
  const doPrint = useServerFn(markPrinted);
  const doShip = useServerFn(markShipped);
  const doRevertPaid = useServerFn(revertToPaid);
  const doLogPrintAudit = useServerFn(logPrintAudit);
  const doRevertPrinted = useServerFn(revertToPrinted);
  const doSoftDelete = useServerFn(softDeleteOrder);
  const doRestore = useServerFn(restoreOrder);
  const fetchEvents = useServerFn(listOrderEvents);
  const doSendTestEmail = useServerFn(sendTestOrderConfirmation);
  const [testEmailBusy, setTestEmailBusy] = useState(false);
  const [testEmailMsg, setTestEmailMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  // reset further below once detailOrder is declared
  const fetchRoles = useServerFn(getMyRoles);
  const { data: roleData } = useQuery({
    queryKey: ["my-roles"],
    queryFn: () => fetchRoles({ data: {} as any }),
  });
  const isAdmin = !!roleData?.roles?.includes("admin");



  // Persisted list state (filters + sort + environment) — survives refresh.
  const LIST_STATE_KEY = "vp-admin-list-state-v1";
  const readPersistedState = () => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(LIST_STATE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };
  const persisted = readPersistedState() ?? {};

  const [filter, setFilter] = useState<StatusFilter>(persisted.filter ?? "paid");
  const [statusFilter, setStatusFilter] = useState<string>(persisted.statusFilter ?? "any");
  const [langFilter, setLangFilter] = useState<string>(persisted.langFilter ?? "any");
  const [countryFilter, setCountryFilter] = useState<string>(persisted.countryFilter ?? "any");
  const [stickerFilter, setStickerFilter] = useState<string>(persisted.stickerFilter ?? "any");
  const [searchInput, setSearchInput] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);
  const [environment, setEnvironment] = useState<"live" | "sandbox">(persisted.environment ?? "live");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [sort, setSort] = useState<{ column: "date" | "amount" | "stickers"; dir: "asc" | "desc" }>(
    persisted.sort && ["date", "amount", "stickers"].includes(persisted.sort.column) &&
    ["asc", "desc"].includes(persisted.sort.dir)
      ? persisted.sort
      : { column: "date", dir: "desc" }
  );

  // Write filters + sort to localStorage whenever they change.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        LIST_STATE_KEY,
        JSON.stringify({ filter, statusFilter, langFilter, countryFilter, stickerFilter, sort, environment }),
      );
    } catch {
      /* quota / private mode — ignore */
    }
  }, [filter, statusFilter, langFilter, countryFilter, stickerFilter, sort, environment]);
  const [detailOrder, setDetailOrder] = useState<any>(null);
  useEffect(() => { setTestEmailMsg(null); }, [detailOrder?.id]);
  const [labelCopied, setLabelCopied] = useState(false);
  const [detailBusy, setDetailBusy] = useState(false);
  const [batchStatus, setBatchStatus] = useState<string | null>(null);
  const [batchQueue, setBatchQueue] = useState<string[]>([]);
  const [batchIndex, setBatchIndex] = useState(0);
  const [batchDone, setBatchDone] = useState(false);
  // Read-only browse navigation across the current filtered list
  const [navIds, setNavIds] = useState<string[]>([]);
  const [navIndex, setNavIndex] = useState(0);
  const [undoState, setUndoState] = useState<{ ids: string[]; expiresAt: number } | null>(null);
  const [nowTs, setNowTs] = useState(() => Date.now());
  useEffect(() => {
    if (!undoState) return;
    const tick = setInterval(() => setNowTs(Date.now()), 250);
    return () => clearInterval(tick);
  }, [undoState]);
  useEffect(() => {
    if (undoState && nowTs >= undoState.expiresAt) setUndoState(null);
  }, [undoState, nowTs]);
  useEffect(() => {
    if (!undoState) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "z" || e.key === "Z") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleUndoDelete();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undoState]);

  const initBatchFor = (o: any, source: any[]) => {
    setBatchStatus(o.status);
    const queue = source.filter((x: any) => x.status === o.status).map((x: any) => x.id);
    setBatchQueue(queue);
    setBatchIndex(Math.max(0, queue.indexOf(o.id)));
    setBatchDone(false);
  };

  const openDetail = (o: any, queueSource?: any[]) => {
    const source = queueSource ?? [];
    setDetailOrder(o);
    setNavIds(source.map((x: any) => x.id));
    setNavIndex(Math.max(0, source.findIndex((x: any) => x.id === o.id)));
    initBatchFor(o, source);
  };

  const closeDetail = () => {
    setDetailOrder(null);
    setBatchStatus(null);
    setBatchQueue([]);
    setBatchIndex(0);
    setBatchDone(false);
    setNavIds([]);
    setNavIndex(0);
  };

  const advanceBatch = async () => {
    const res = await refetch();
    if (!batchStatus) return;
    const latest = res.data?.orders ?? [];
    const byId = new Map<string, any>(latest.map((o: any) => [o.id, o]));
    for (let i = batchIndex + 1; i < batchQueue.length; i++) {
      const candidate = byId.get(batchQueue[i]);
      if (candidate && candidate.status === batchStatus) {
        setDetailOrder(candidate);
        setBatchIndex(i);
        return;
      }
    }
    setBatchDone(true);
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-orders", environment],
    queryFn: () => fetchOrders({ data: { environment } }),
  });

  const eventsQuery = useQuery({
    queryKey: ["order-events", detailOrder?.id, detailOrder?.status, detailOrder?.deleted_at],
    queryFn: () => fetchEvents({ data: { orderId: detailOrder.id } }),
    enabled: !!detailOrder?.id,
  });

  const orders = data?.orders ?? [];
  const lines = data?.lines ?? [];
  const linesByOrder = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const l of lines) {
      const arr = m.get(l.order_id) ?? [];
      arr.push(l);
      m.set(l.order_id, arr);
    }
    return m;
  }, [lines]);

  // Total Frame-ID stickers per order (sum of sticker_count across its lines).
  // sticker_count is already bundle_size × quantity in the DB.
  const stickerTotalById = useMemo(() => {
    const m = new Map<string, number>();
    for (const [orderId, ls] of linesByOrder) {
      m.set(orderId, ls.reduce((s, l) => s + (Number(l.sticker_count) || 0), 0));
    }
    return m;
  }, [linesByOrder]);

  // Auto-open order from URL search param (e.g. coming from email-events page)
  useEffect(() => {
    if (!search.order || !data) return;
    const target = orders.find((o: any) => o.id === search.order);
    if (target) {
      openDetail(target, activeOrders);
      // Clear the search param so a refresh doesn't reopen
      navigate({ search: (prev: any) => ({ ...prev, order: undefined }) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.order, data]);

  const activeOrders = useMemo(() => orders.filter((o: any) => !o.deleted_at), [orders]);
  const deletedOrders = useMemo(() => orders.filter((o: any) => !!o.deleted_at), [orders]);

  const counts = useMemo(() => {
    // Paid/Printed: full outstanding work (any age).
    // Shipped: rolling 30-day window (recently shipped).
    // All: active in pipeline = paid + printed + shipped(30d).
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - THIRTY_DAYS_MS;
    const c: Record<string, number> = { all: 0, paid: 0, printed: 0, shipped: 0 };
    for (const o of activeOrders) {
      if (o.status === "paid") c.paid++;
      else if (o.status === "printed") c.printed++;
      else if (o.status === "shipped") {
        const t = new Date(o.updated_at ?? o.created_at).getTime();
        if (t >= cutoff) c.shipped++;
      }
    }
    c.all = c.paid + c.printed + c.shipped;
    return c;
  }, [activeOrders]);

  const availableStatuses = useMemo(() => {
    const s = new Set<string>();
    for (const o of activeOrders) if (o.status) s.add(o.status);
    return Array.from(s).sort();
  }, [activeOrders]);

  const viewingDeleted = statusFilter === "deleted";

  const availableCountries = useMemo(() => {
    const set = new Set<string>();
    for (const o of activeOrders) {
      const c = (o.shipping_country || "").toString().trim().toUpperCase();
      if (c) set.add(c);
    }
    return Array.from(set).sort();
  }, [activeOrders]);

  const availableStickerCounts = useMemo(() => {
    const set = new Set<number>();
    for (const o of activeOrders) {
      const n = stickerTotalById.get(o.id);
      if (n && n > 0) set.add(n);
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [activeOrders, stickerTotalById]);

  const filtered = useMemo(() => {
    const base = viewingDeleted ? deletedOrders : activeOrders;
    const q = searchQuery;
    const arr = base.filter((o: any) => {
      const stagePass = viewingDeleted
        ? true
        : statusFilter !== "any"
          ? o.status === statusFilter
          : filter === "all" || o.status === filter;
      if (!stagePass) return false;
      if (langFilter !== "any") {
        const l = (o.lang || "").toString().trim().toUpperCase();
        if (l !== langFilter) return false;
      }
      if (countryFilter !== "any") {
        const c = (o.shipping_country || "").toString().trim().toUpperCase();
        if (c !== countryFilter) return false;
      }
      if (stickerFilter !== "any") {
        const n = stickerTotalById.get(o.id) ?? 0;
        if (n !== Number(stickerFilter)) return false;
      }
      if (!q) return true;
      const hay = [
        o.shipping_name,
        o.customer_email,
        o.id,
        o.id ? String(o.id).slice(0, 8) : "",
        o.shipping_line1,
        o.shipping_city,
        o.shipping_postal_code,
        o.shipping_country,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
    arr.sort((a: any, b: any) => {
      if (sort.column === "date") {
        const da = new Date(a.created_at).getTime();
        const db = new Date(b.created_at).getTime();
        return sort.dir === "asc" ? da - db : db - da;
      }
      if (sort.column === "amount") {
        return sort.dir === "asc" ? a.amount_total - b.amount_total : b.amount_total - a.amount_total;
      }
      if (sort.column === "stickers") {
        const na = stickerTotalById.get(a.id) ?? 0;
        const nb = stickerTotalById.get(b.id) ?? 0;
        return sort.dir === "asc" ? na - nb : nb - na;
      }
      return 0;
    });
    return arr;
  }, [activeOrders, deletedOrders, viewingDeleted, filter, statusFilter, langFilter, countryFilter, stickerFilter, stickerTotalById, searchQuery, sort]);

  const gotoNav = (delta: number) => {
    if (!detailOrder || navIds.length === 0) return;
    const next = navIndex + delta;
    if (next < 0 || next >= navIds.length) return;
    const targetId = navIds[next];
    const target = orders.find((o: any) => o.id === targetId);
    if (!target) return;
    setDetailOrder(target);
    setNavIndex(next);
    // Re-anchor batch context to the newly displayed order (no status changes)
    initBatchFor(target, filtered);
  };

  useEffect(() => {
    if (!detailOrder) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); gotoNav(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); gotoNav(1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((o: any) => o.id)));
  };

  const handleSort = (column: "date" | "amount" | "stickers") => {
    setSort((prev) => {
      if (prev.column === column) return { column, dir: prev.dir === "asc" ? "desc" : "asc" };
      return { column, dir: "desc" };
    });
  };

  const selectedOrders = filtered.filter((o: any) => selected.has(o.id));

  const [labelItems, setLabelItems] = useState<LabelData[] | null>(null);
  const [labelExcluded, setLabelExcluded] = useState<Set<string>>(new Set());
  const [labelZoomId, setLabelZoomId] = useState<string | null>(null);
  const [zoomDraft, setZoomDraft] = useState<Partial<LabelData> | null>(null);
  const [zoomSaving, setZoomSaving] = useState<boolean>(false);
  type PrintRow = {
    id: string;
    oldStatus: string | null;
    newStatus: string | null;
    rollback?: "not_needed" | "reverted" | "failed";
    rollbackError?: string;
  };
  const [printReport, setPrintReport] = useState<
    | {
        kind: "success" | "error" | "partial";
        message: string;
        error?: string;
        rows: PrintRow[];
      }
    | null
  >(null);
  const [labelDragId, setLabelDragId] = useState<string | null>(null);
  const [labelDragOverId, setLabelDragOverId] = useState<string | null>(null);
  const [labelShowOverlay, setLabelShowOverlay] = useState<boolean>(true);
  const [labelPrinterWidthMm, setLabelPrinterWidthMm] = useState<number>(87);
  const [labelSafePadMm, setLabelSafePadMm] = useState<number>(2);
  const [labelClipColor, setLabelClipColor] = useState<string>("#E74C3C");
  const [labelSafeColor, setLabelSafeColor] = useState<string>("#2ECC8A");
  const [labelCutColor, setLabelCutColor] = useState<string>("#E74C3C");

  const reorderLabel = (dragId: string, dropId: string) => {
    if (dragId === dropId) return;
    setLabelItems((prev) => {
      if (!prev) return prev;
      const from = prev.findIndex((p) => p.id === dragId);
      const to = prev.findIndex((p) => p.id === dropId);
      if (from < 0 || to < 0) return prev;
      const next = prev.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const updateLabelField = (id: string, key: keyof LabelData, value: string) => {
    setLabelItems((prev) => {
      if (!prev) return prev;
      return prev.map((p) => (p.id === id ? { ...p, [key]: value } : p));
    });
  };

  useEffect(() => {
    if (!labelZoomId) {
      setZoomDraft(null);
      return;
    }
    const item = labelItems?.find((l) => l.id === labelZoomId);
    if (!item) return;
    setZoomDraft({
      shipping_name: item.shipping_name,
      shipping_line1: item.shipping_line1,
      shipping_line2: item.shipping_line2,
      shipping_postal_code: item.shipping_postal_code,
      shipping_city: item.shipping_city,
      shipping_country: item.shipping_country,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labelZoomId]);



  const generateLabels = () => {
    const labelData: LabelData[] = selectedOrders.map((o: any) => ({
      shipping_name: o.shipping_name,
      shipping_line1: o.shipping_line1,
      shipping_line2: o.shipping_line2,
      shipping_postal_code: o.shipping_postal_code,
      shipping_city: o.shipping_city,
      shipping_country: o.shipping_country,
      id: o.id,
      lines: (linesByOrder.get(o.id) ?? []).map((l) => ({
        bundle_sku: l.bundle_sku,
        quantity: l.quantity,
      })),
      sticker_count: stickerTotalById.get(o.id) ?? 0,
      lang: o.lang ?? null,
    }));
    if (!labelData.length) return;
    // Sort: country asc → language asc → sticker count asc
    labelData.sort((a, b) => {
      const ca = (a.shipping_country || "").toUpperCase();
      const cb = (b.shipping_country || "").toUpperCase();
      if (ca !== cb) return ca.localeCompare(cb);
      const la = (a.lang || "").toUpperCase();
      const lb = (b.lang || "").toUpperCase();
      if (la !== lb) return la.localeCompare(lb);
      return (Number(a.sticker_count) || 0) - (Number(b.sticker_count) || 0);
    });
    setLabelItems(labelData);
    setLabelExcluded(new Set());
    setLabelZoomId(null);
  };


  const moveLabel = (id: string, dir: -1 | 1) => {
    setLabelItems((prev) => {
      if (!prev) return prev;
      const i = prev.findIndex((p) => p.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = prev.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };
  const toggleExclude = (id: string) => {
    setLabelExcluded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };
  const closeLabelPreview = () => {
    setLabelItems(null);
    setLabelExcluded(new Set());
    setLabelZoomId(null);
  };
  const downloadLabelsPdf = async () => {
    if (!labelItems) return;
    const included = labelItems.filter((l) => !labelExcluded.has(l.id));
    if (!included.length) return;
    const blob = generateLabelsPdf(included);
    const pdfUrl = URL.createObjectURL(blob);
    const filename = `velopass-labels-${new Date().toISOString().slice(0, 10)}.pdf`;
    const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>${filename}</title>
<style>
  *{box-sizing:border-box;}
  html,body{margin:0;height:100%;background:#0E1116;color:#E6EAF2;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased;}
  .bar{position:sticky;position:-webkit-sticky;top:0;left:0;right:0;height:60px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;background:rgba(22,27,34,0.95);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-bottom:1px solid #222831;z-index:10;}
  .meta{display:flex;flex-direction:column;gap:2px;min-width:0;}
  .meta .title{font-size:13px;font-weight:600;color:#E6EAF2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .meta .sub{font-size:11px;color:rgba(230,234,242,0.6);}
  .actions{display:flex;gap:8px;align-items:center;flex-shrink:0;}
  .btn{display:inline-flex;align-items:center;gap:6px;border:0;padding:10px 16px;border-radius:8px;font-weight:600;cursor:pointer;font-size:13px;text-decoration:none;line-height:1;transition:transform 80ms ease, box-shadow 120ms ease, background 120ms ease;font-family:inherit;}
  .btn.secondary{background:transparent;color:#E6EAF2;border:1px solid #2A313B;}
  .btn.secondary:hover{background:rgba(255,255,255,0.06);border-color:#3A4250;}
  .btn.primary{background:#2ECC8A;color:#0E1116;box-shadow:0 1px 0 rgba(0,0,0,0.2), 0 0 0 1px rgba(46,204,138,0.4);}
  .btn.primary:hover{background:#34D896;transform:translateY(-1px);box-shadow:0 4px 12px rgba(46,204,138,0.35);}
  .btn.primary:active{transform:translateY(0);}
  .btn svg{width:14px;height:14px;flex-shrink:0;}
  /* Native tooltip styling via title attr; add a subtle hint label */
  iframe{position:fixed;top:60px;left:0;right:0;bottom:0;width:100%;height:calc(100% - 60px);border:0;background:#fff;}
</style></head><body>
<div class="bar">
  <div class="meta">
    <span class="title">${filename}</span>
    <span class="sub">${included.length} label${included.length === 1 ? "" : "s"} · 89 × 28 mm · DYMO LabelWriter</span>
  </div>
  <div class="actions">
    <a class="btn secondary" href="${pdfUrl}" download="${filename}" title="Bewaar de PDF lokaal">Download</a>
    <button id="printBtn" class="btn primary" type="button" title="Open het printvenster — kies je DYMO LabelWriter en print direct" aria-label="Printen naar DYMO">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
      Printen
    </button>
  </div>
</div>
<iframe id="pdf" src="${pdfUrl}#toolbar=0&view=Fit"></iframe>
<script>
  const f = document.getElementById('pdf');
  const btn = document.getElementById('printBtn');
  function doPrint(){ try { f.contentWindow.focus(); f.contentWindow.print(); } catch(e){ window.print(); } }
  btn.addEventListener('click', doPrint);
  f.addEventListener('load', () => setTimeout(doPrint, 300));
<\/script>
</body></html>`;
    const htmlBlob = new Blob([html], { type: "text/html" });
    const htmlUrl = URL.createObjectURL(htmlBlob);
    const win = window.open(htmlUrl, "_blank");
    if (!win) {
      downloadBlob(blob, filename);
    }
    setTimeout(() => {
      URL.revokeObjectURL(htmlUrl);
      URL.revokeObjectURL(pdfUrl);
    }, 120_000);

    // Mark printed: DB function only updates orders currently in status 'paid',
    // so reprints of already-printed/shipped orders are safely ignored.
    const ids = included.map((l) => l.id);
    // Snapshot which orders were eligible (status 'paid') before the call — only
    // those could have transitioned to 'printed', so only those need rollback.
    const ordersById = new Map<string, any>(
      (data?.orders ?? []).map((o: any) => [o.id, o]),
    );
    const eligibleIds = ids.filter((id) => ordersById.get(id)?.status === "paid");
    try {
      await doPrint({ data: { orderIds: ids } });
      const successRows: PrintRow[] = ids.map((id) => {
        const wasEligible = eligibleIds.includes(id);
        const oldStatus = ordersById.get(id)?.status ?? null;
        return {
          id,
          oldStatus,
          newStatus: wasEligible ? "printed" : oldStatus,
        };
      });
      const changedCount = successRows.filter((r) => r.oldStatus !== r.newStatus).length;
      setPrintReport({
        kind: "success",
        message:
          changedCount === 0
            ? "Geen statuswijziging — alle bestellingen stonden al op 'geprint' of 'verzonden'."
            : changedCount === 1
              ? "1 bestelling op 'geprint' gezet."
              : `${changedCount} bestellingen op 'geprint' gezet.`,
        rows: successRows,
      });
      toast.success(
        changedCount === 1 ? "Bestelling op 'geprint' gezet" : `${changedCount} bestellingen op 'geprint' gezet`,
        {
          description: "Klik 'Details' voor de IDs en oude/nieuwe status.",
          action: { label: "Details", onClick: () => setPrintReport((r) => r) },
          duration: 8_000,
        },
      );
      doLogPrintAudit({
        data: {
          kind: "success",
          message: changedCount === 0
            ? "Geen statuswijziging — alle al geprint/verzonden."
            : `${changedCount} bestelling(en) op 'geprint' gezet`,
          requestedIds: ids,
          rows: successRows,
        },
      }).catch((e) => console.error("logPrintAudit failed:", e));
      await refetch();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Onbekende fout bij het bijwerken van de status.";
      // Best-effort rollback: revertToPaid only flips orders currently in
      // 'printed' back to 'paid', so it's a safe no-op for anything that
      // didn't transition. Run in parallel and surface partial failures.
      const rollbackByMap = new Map<string, PromiseSettledResult<unknown>>();
      if (eligibleIds.length) {
        const results = await Promise.allSettled(
          eligibleIds.map((id) => doRevertPaid({ data: { orderId: id } })),
        );
        eligibleIds.forEach((id, i) => rollbackByMap.set(id, results[i]));
      }
      const rows: PrintRow[] = ids.map((id) => {
        const oldStatus = ordersById.get(id)?.status ?? null;
        const eligible = eligibleIds.includes(id);
        if (!eligible) {
          return { id, oldStatus, newStatus: oldStatus, rollback: "not_needed" };
        }
        const r = rollbackByMap.get(id);
        if (r?.status === "fulfilled") {
          return { id, oldStatus, newStatus: oldStatus, rollback: "reverted" };
        }
        const reason = r?.status === "rejected" ? r.reason : undefined;
        return {
          id,
          oldStatus,
          newStatus: "printed",
          rollback: "failed",
          rollbackError: reason instanceof Error ? reason.message : reason ? String(reason) : undefined,
        };
      });
      const failed = rows.filter((r) => r.rollback === "failed").length;
      const reverted = rows.filter((r) => r.rollback === "reverted").length;
      await refetch().catch(() => undefined);
      const kind: "error" | "partial" = failed > 0 ? "partial" : "error";
      const summary =
        failed > 0
          ? `Rollback onvolledig: ${reverted} hersteld, ${failed} kon niet teruggezet worden — controleer handmatig.`
          : eligibleIds.length
            ? `Wijzigingen teruggedraaid: ${reverted} bestelling(en) terug op 'betaald'.`
            : "Geen statuswijziging om terug te draaien.";
      setPrintReport({ kind, message: summary, error: message, rows });
      doLogPrintAudit({
        data: {
          kind,
          message: summary,
          error: message,
          requestedIds: ids,
          rows,
        },
      }).catch((e) => console.error("logPrintAudit failed:", e));
      toast.error(
        failed > 0 ? "Status bijwerken mislukt — rollback onvolledig" : "Status bijwerken mislukt",
        {
          description: `${message} Klik 'Details' voor IDs en oude/nieuwe status.`,
          action: { label: "Details", onClick: () => setPrintReport((r) => r) },
          duration: 14_000,
        },
      );
    }
  };




  const exportCsv = () => {
    const rows = selectedOrders.map((o: any) => {
      const ls = linesByOrder.get(o.id) ?? [];
      return {
        order_id: o.id,
        created_at: o.created_at,
        status: o.status,
        customer_email: o.customer_email,
        shipping_name: o.shipping_name,
        shipping_line1: o.shipping_line1,
        shipping_postal_code: o.shipping_postal_code,
        shipping_city: o.shipping_city,
        shipping_country: o.shipping_country,
        referral_source: o.referral_source ?? "",
        items: ls.map((l) => `${l.bundle_sku}x${l.quantity}`).join(" "),
        sticker_total: ls.reduce((s, l) => s + l.sticker_count, 0),
        amount_total_eur: (o.amount_total / 100).toFixed(2),
      };
    });
    const csv = ordersToCsv(rows);
    downloadBlob(new Blob([csv], { type: "text/csv" }), `velopass-orders-${Date.now()}.csv`);
  };

  const handleMarkPrinted = async () => {
    if (!selectedOrders.length) return;
    setBusy(true);
    try {
      await doPrint({ data: { orderIds: selectedOrders.map((o: any) => o.id) } });
      setSelected(new Set());
      await refetch();
    } finally {
      setBusy(false);
    }
  };

  const handleMarkShipped = async () => {
    if (!selectedOrders.length) return;
    setBusy(true);
    try {
      await doShip({ data: { orderIds: selectedOrders.map((o: any) => o.id) } });
      setSelected(new Set());
      await refetch();
    } finally {
      setBusy(false);
    }
  };

  const UNDO_WINDOW_MS = 8000;

  const handleBulkDelete = async () => {
    const n = selectedOrders.length;
    if (!n) return;
    if (
      !window.confirm(
        `${n} ${n === 1 ? "order" : "orders"} verwijderen? Je kunt ze later terugvinden en herstellen onder het 'Verwijderd'-filter.`,
      )
    )
      return;
    const ids = selectedOrders.map((o: any) => o.id);
    setBusy(true);
    try {
      await Promise.all(ids.map((id: string) => doSoftDelete({ data: { orderId: id } })));
      setSelected(new Set());
      await refetch();
      setUndoState({ ids, expiresAt: Date.now() + UNDO_WINDOW_MS });
    } finally {
      setBusy(false);
    }
  };

  const handleUndoDelete = async () => {
    const snap = undoState;
    if (!snap || !snap.ids.length) return;
    setUndoState(null);
    setBusy(true);
    try {
      await Promise.all(snap.ids.map((id) => doRestore({ data: { orderId: id } })));
      await refetch();
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const hasSelection = selectedOrders.length > 0;

  const SortIcon = ({ column }: { column: "date" | "amount" | "stickers" }) => {
    if (sort.column !== column) return null;
    return sort.dir === "asc" ? (
      <ArrowUp className="w-3 h-3" style={{ color: GREEN }} />
    ) : (
      <ArrowDown className="w-3 h-3" style={{ color: GREEN }} />
    );
  };

  // Pipeline stage definition
  const PIPELINE: { key: StatusFilter; label: string; caption: string; dot: string }[] = [
    { key: "all", label: "Alle", caption: "actief in pipeline", dot: "rgba(255,255,255,0.35)" },
    { key: "paid", label: "Betaald", caption: "klaar om te printen", dot: "#2ECC8A" },
    { key: "printed", label: "Geprint", caption: "klaar om te verzenden", dot: "#F5B547" },
    { key: "shipped", label: "Verzonden · 30 dgn", caption: "afgerond", dot: "rgba(255,255,255,0.40)" },
  ];

  return (
    <div
      className="min-h-screen vp-pro-page"
      style={{
        backgroundColor: NAVY,
        color: TEXT_PRI,
        fontFamily: "'DM Sans', sans-serif",
        minHeight: "100dvh",
      }}
    >
      <style>{`
        .vp-pro-admin input[type="checkbox"] {
          appearance: none;
          -webkit-appearance: none;
          width: 16px; height: 16px;
          border: 1.5px solid rgba(255,255,255,0.30);
          border-radius: 4px;
          background: rgba(255,255,255,0.04);
          cursor: pointer;
          position: relative;
          transition: all 0.15s;
        }
        .vp-pro-admin input[type="checkbox"]:hover { border-color: ${GREEN}; }
        .vp-pro-admin input[type="checkbox"]:checked {
          background: ${GREEN};
          border-color: ${GREEN};
        }
        .vp-pro-admin input[type="checkbox"]:checked::after {
          content: '';
          position: absolute;
          left: 4px; top: 1px;
          width: 4px; height: 8px;
          border: solid ${NAVY};
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }
        .vp-pro-admin input[type="checkbox"]:focus-visible {
          outline: 2px solid ${GREEN};
          outline-offset: 2px;
        }
        .vp-pro-admin button:focus-visible,
        .vp-pro-admin .stage-card:focus-visible {
          outline: 2px solid ${GREEN};
          outline-offset: 2px;
        }
        .vp-pro-admin .stage-card { transition: all 0.18s ease; }
        .vp-pro-page { background-color: #0D1F3C !important; min-height: 100dvh; }
        .vp-pro-admin .stage-card:hover { background: rgba(255,255,255,0.06); }
        .vp-pro-admin .stage-card.active {
          background: rgba(46,204,138,0.08);
          border-color: rgba(46,204,138,0.45);
        }
        .vp-pro-admin .row-link:hover { background: rgba(255,255,255,0.03); }
        .vp-pro-admin .btn-ghost {
          background: transparent;
          color: ${TEXT_PRI};
          border: 1px solid ${SURFACE_BORDER};
          transition: all 0.15s;
        }
        .vp-pro-admin .btn-ghost:hover:not(:disabled) {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.18);
        }
        .vp-pro-admin .btn-primary {
          background: ${GREEN};
          color: ${NAVY};
          border: 1px solid ${GREEN};
          transition: all 0.15s;
          font-weight: 600;
        }
        .vp-pro-admin .btn-primary:hover:not(:disabled) {
          background: #25b277;
          border-color: #25b277;
        }
        .vp-pro-admin .btn-primary:disabled,
        .vp-pro-admin .btn-ghost:disabled { opacity: 0.35; cursor: not-allowed; }
      `}</style>

      <div className="vp-pro-admin max-w-[1280px] mx-auto px-5 py-6 md:px-10 md:py-10">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div style={EYEBROW}>Velopass · Back-office</div>
            <h1
              className="mt-2"
              style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 700,
                fontSize: "clamp(28px, 3.2vw, 36px)",
                lineHeight: 1.05,
                letterSpacing: "-0.6px",
                color: TEXT_PRI,
              }}
            >
              Fulfillment
            </h1>
            <p className="mt-1.5 text-[13px]" style={{ color: TEXT_SEC }}>
              Beheer betaalde bestellingen en print verzendlabels
              {isAdmin && (
                <>
                  {" · "}
                  <a
                    href="/admin-webhooks"
                    style={{ color: GREEN, textDecoration: "none", borderBottom: `1px dashed ${GREEN}` }}
                  >
                    Webhook status
                  </a>
                  {" · "}
                  <a
                    href="/admin-users"
                    style={{ color: GREEN, textDecoration: "none", borderBottom: `1px dashed ${GREEN}` }}
                  >
                    Gebruikers
                  </a>
                  {" · "}
                  <a
                    href="/admin-audit"
                    style={{ color: GREEN, textDecoration: "none", borderBottom: `1px dashed ${GREEN}` }}
                  >
                    Audit log
                  </a>
                  {" · "}
                  <a
                    href="/admin-email-events"
                    style={{ color: GREEN, textDecoration: "none", borderBottom: `1px dashed ${GREEN}` }}
                  >
                    E-mail events
                  </a>
                  {" · "}
                  <a
                    href="/admin-email-log"
                    style={{ color: GREEN, textDecoration: "none", borderBottom: `1px dashed ${GREEN}` }}
                  >
                    Verzendlog
                  </a>
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Live/Sandbox segmented pill */}
            <div
              className="inline-flex p-1 rounded-full"
              style={{
                background: SURFACE,
                border: `1px solid ${SURFACE_BORDER}`,
              }}
              role="tablist"
              aria-label="Environment"
            >
              {(["live", "sandbox"] as const).map((env) => {
                const active = environment === env;
                return (
                  <button
                    key={env}
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setEnvironment(env);
                      setSelected(new Set());
                    }}
                    className="px-4 py-1.5 rounded-full text-[12px] font-semibold transition"
                    style={{
                      background: active ? GREEN : "transparent",
                      color: active ? NAVY : TEXT_SEC,
                      letterSpacing: "0.02em",
                    }}
                  >
                    {env === "live" ? "Live" : "Sandbox"}
                  </button>
                );
              })}
            </div>
            <button
              onClick={signOut}
              className="text-[12px] transition"
              style={{ color: TEXT_SEC, letterSpacing: "0.02em" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = TEXT_PRI)}
              onMouseLeave={(e) => (e.currentTarget.style.color = TEXT_SEC)}
            >
              Uitloggen
            </button>
          </div>
        </header>

        {/* Pipeline */}
        <section className="mb-6" aria-label="Fulfillment pipeline">
          <div style={{ ...EYEBROW, marginBottom: 12 }}>Pipeline</div>
          <div className="flex flex-wrap items-stretch gap-3 md:gap-2">
            {PIPELINE.map((stage, idx) => {
              const active = filter === stage.key;
              const count = counts[stage.key] ?? 0;
              return (
                <div key={stage.key} className="flex items-center gap-2 md:gap-3 flex-1 min-w-[220px]">
                  <button
                    type="button"
                    onClick={() => {
                      setFilter(stage.key);
                      setStatusFilter("any");
                      setSelected(new Set());
                    }}
                    aria-pressed={active}
                    className={`stage-card text-left w-full p-5 rounded-[18px] ${active ? "active" : ""}`}
                    style={{
                      background: active ? "rgba(46,204,138,0.08)" : SURFACE,
                      border: `1px solid ${active ? "rgba(46,204,138,0.45)" : SURFACE_BORDER}`,
                      cursor: "pointer",
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span style={{ ...EYEBROW, color: active ? GREEN : TEXT_MUTED }}>
                        {stage.label}
                      </span>
                      <span
                        aria-hidden
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: stage.dot,
                          boxShadow: stage.key === "paid" ? "0 0 0 4px rgba(46,204,138,0.12)" : undefined,
                        }}
                      />
                    </div>
                    <div
                      style={{
                        fontFamily: "'Syne', sans-serif",
                        fontWeight: 700,
                        fontSize: 44,
                        lineHeight: 1,
                        letterSpacing: "-1.5px",
                        color: active ? GREEN : TEXT_PRI,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {count}
                    </div>
                    <div
                      className="mt-2 text-[12px]"
                      style={{ color: TEXT_SEC, lineHeight: 1.4 }}
                    >
                      {stage.caption}
                    </div>
                  </button>
                  {idx < PIPELINE.length - 1 && (
                    <ArrowRight
                      className="shrink-0 hidden md:block"
                      style={{ color: "rgba(255,255,255,0.20)" }}
                      strokeWidth={1.5}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {isLoading && (
          <p className="text-sm" style={{ color: TEXT_SEC }}>Laden…</p>
        )}
        {error && (
          <div
            className="rounded-[18px] p-4 text-sm"
            style={{
              background: "rgba(244,82,82,0.08)",
              border: "1px solid rgba(244,82,82,0.30)",
              color: "#FF8A8A",
            }}
          >
            {(error as Error).message || "Fout bij laden"}
          </div>
        )}

        {!isLoading && !error && (
          <div
            className="rounded-[18px] overflow-hidden"
            style={{
              background: SURFACE,
              border: `1px solid ${SURFACE_BORDER}`,
            }}
          >
            {/* Toolbar Row 1 — Filters & Search */}
            <div
              className="flex flex-col sm:flex-row sm:items-center gap-3 px-6 py-4"
              style={{ borderBottom: `1px solid ${SURFACE_BORDER}` }}
            >
              <div className="flex flex-wrap items-center gap-3">
                <span style={EYEBROW}>Bestellingen</span>
                <span className="text-[12px]" style={{ color: TEXT_MUTED }}>
                  {selectedOrders.length > 0
                    ? `${selectedOrders.length} geselecteerd`
                    : `${filtered.length} weergegeven`}
                </span>
                <label className="inline-flex items-center gap-2">
                  <span className="text-[11px]" style={{ color: TEXT_MUTED, letterSpacing: "0.02em" }}>
                    Status:
                  </span>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setSelected(new Set());
                    }}
                    className="h-7 px-2 rounded-[8px] text-[12px]"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      color: TEXT_PRI,
                      border: `1px solid ${SURFACE_BORDER}`,
                      outline: "none",
                    }}
                    aria-label="Filter op status"
                  >
                    <option value="any" style={{ background: NAVY }}>Alle statussen</option>
                    {availableStatuses.map((s) => (
                      <option key={s} value={s} style={{ background: NAVY }}>
                        {statusLabelNl(s)}
                      </option>
                    ))}
                    <option value="deleted" style={{ background: NAVY }}>
                      Verwijderd{deletedOrders.length ? ` (${deletedOrders.length})` : ""}
                    </option>
                  </select>
                </label>
                <label className="inline-flex items-center gap-2">
                  <span className="text-[11px]" style={{ color: TEXT_MUTED, letterSpacing: "0.02em" }}>
                    Taal:
                  </span>
                  <select
                    value={langFilter}
                    onChange={(e) => { setLangFilter(e.target.value); setSelected(new Set()); }}
                    className="h-7 px-2 rounded-[8px] text-[12px]"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      color: TEXT_PRI,
                      border: `1px solid ${SURFACE_BORDER}`,
                      outline: "none",
                    }}
                    aria-label="Filter op taal"
                  >
                    <option value="any" style={{ background: NAVY }}>Alle talen</option>
                    {["NL", "FR", "DE", "EN"].map((l) => (
                      <option key={l} value={l} style={{ background: NAVY }}>{l}</option>
                    ))}
                  </select>
                </label>
                <label className="inline-flex items-center gap-2">
                  <span className="text-[11px]" style={{ color: TEXT_MUTED, letterSpacing: "0.02em" }}>
                    Land:
                  </span>
                  <select
                    value={countryFilter}
                    onChange={(e) => { setCountryFilter(e.target.value); setSelected(new Set()); }}
                    className="h-7 px-2 rounded-[8px] text-[12px]"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      color: TEXT_PRI,
                      border: `1px solid ${SURFACE_BORDER}`,
                      outline: "none",
                    }}
                    aria-label="Filter op land"
                  >
                    <option value="any" style={{ background: NAVY }}>Alle landen</option>
                    {availableCountries.map((c) => (
                      <option key={c} value={c} style={{ background: NAVY }}>{c}</option>
                    ))}
                  </select>
                </label>
                <label className="inline-flex items-center gap-2">
                  <span className="text-[11px]" style={{ color: TEXT_MUTED, letterSpacing: "0.02em" }}>
                    Frame-IDs:
                  </span>
                  <select
                    value={stickerFilter}
                    onChange={(e) => { setStickerFilter(e.target.value); setSelected(new Set()); }}
                    className="h-7 px-2 rounded-[8px] text-[12px]"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      color: TEXT_PRI,
                      border: `1px solid ${SURFACE_BORDER}`,
                      outline: "none",
                    }}
                    aria-label="Filter op exact aantal Frame-IDs"
                  >
                    <option value="any" style={{ background: NAVY }}>Alle aantallen</option>
                    {availableStickerCounts.map((n) => (
                      <option key={n} value={String(n)} style={{ background: NAVY }}>
                        {n} {n === 1 ? "sticker" : "stickers"}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex-1 min-w-[0]" />
              <div className="relative inline-flex items-center">
                <Search
                  className="absolute left-2 pointer-events-none"
                  style={{ width: 13, height: 13, color: TEXT_MUTED }}
                  strokeWidth={2}
                />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Zoek op naam, e-mail of order…"
                  aria-label="Zoeken in bestellingen"
                  className="h-7 pl-7 pr-7 rounded-[8px] text-[12px] w-[240px] focus:outline-none"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    color: TEXT_PRI,
                    border: `1px solid ${SURFACE_BORDER}`,
                  }}
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => { setSearchInput(""); setSearchQuery(""); }}
                    aria-label="Zoekopdracht wissen"
                    className="absolute right-1 inline-flex items-center justify-center rounded-[6px]"
                    style={{ width: 18, height: 18, color: TEXT_MUTED }}
                  >
                    <X style={{ width: 12, height: 12 }} strokeWidth={2.25} />
                  </button>
                )}
              </div>
            </div>

            {/* Toolbar Row 2 — Bulk Actions */}
            <div
              className="flex flex-col sm:flex-row sm:items-center gap-3 px-6 py-3"
              style={{ borderBottom: `1px solid ${SURFACE_BORDER}` }}
            >
              {/* Fulfillment actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleMarkPrinted}
                  disabled={busy || !hasSelection || viewingDeleted}
                  className="btn-ghost h-8 px-3 rounded-[10px] text-[12px] font-medium"
                >
                  Markeer geprint
                </button>
                <button
                  onClick={handleMarkShipped}
                  disabled={busy || !hasSelection || viewingDeleted}
                  className="btn-ghost h-8 px-3 rounded-[10px] text-[12px] font-medium"
                >
                  Markeer verzonden
                </button>
              </div>

              <div aria-hidden="true" className="w-px self-stretch hidden sm:block" style={{ background: SURFACE_BORDER }} />

              {/* Output actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={generateLabels}
                  disabled={!hasSelection || viewingDeleted}
                  title={!hasSelection ? "Selecteer eerst minstens één bestelling" : undefined}
                  aria-describedby="labels-pdf-hint"
                  className="btn-primary h-8 px-3 rounded-[10px] text-[12px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Labels PDF ({viewingDeleted ? 0 : selectedOrders.length})
                </button>
                {!hasSelection && !viewingDeleted && (
                  <span
                    id="labels-pdf-hint"
                    role="status"
                    className="text-[12px]"
                    style={{ color: "rgba(255,255,255,0.7)" }}
                  >
                    Selecteer eerst minstens één bestelling.
                  </span>
                )}
                <button
                  onClick={exportCsv}
                  disabled={!hasSelection || viewingDeleted}
                  className="btn-ghost h-8 px-3 rounded-[10px] text-[12px] font-medium"
                >
                  CSV export
                </button>
              </div>


              <div className="flex-1 min-w-[0]" />

              {/* Destructive action */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleBulkDelete}
                  disabled={busy || !hasSelection || viewingDeleted}
                  className="h-8 px-3 rounded-[10px] text-[12px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: "transparent",
                    color: "rgba(248, 113, 113, 0.85)",
                    border: "1px solid rgba(248, 113, 113, 0.35)",
                  }}
                  title="Geselecteerde orders verwijderen"
                >
                  Verwijderen ({viewingDeleted ? 0 : selectedOrders.length})
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-[14px]">
                <thead style={{ background: "rgba(255,255,255,0.02)" }}>
                  <tr style={{ borderBottom: `1px solid ${SURFACE_BORDER}` }}>
                    <th className="px-6 py-3 w-8">
                      <input
                        type="checkbox"
                        checked={filtered.length > 0 && selected.size === filtered.length}
                        onChange={toggleAll}
                        aria-label="Selecteer alle bestellingen"
                      />
                    </th>
                    <th
                      className="px-6 py-3 text-left cursor-pointer select-none"
                      style={EYEBROW}
                      onClick={() => handleSort("date")}
                    >
                      <span className="inline-flex items-center gap-1">
                        Datum <SortIcon column="date" />
                      </span>
                    </th>
                    <th className="px-6 py-3 text-left" style={EYEBROW}>Status</th>
                    <th className="px-6 py-3 text-left" style={EYEBROW}>Klant</th>
                    <th className="px-6 py-3 text-left hidden md:table-cell" style={EYEBROW}>Adres</th>
                    <th className="px-6 py-3 text-left hidden md:table-cell" style={EYEBROW}>Items</th>
                    <th
                      className="px-6 py-3 text-right cursor-pointer select-none"
                      style={EYEBROW}
                      onClick={() => handleSort("stickers")}
                    >
                      <span
                        className="inline-flex items-center gap-1 justify-end"
                        title="Sorteer op totaal aantal Frame-IDs"
                      >
                        Frame-IDs <SortIcon column="stickers" />
                      </span>
                    </th>
                    <th
                      className="px-6 py-3 text-right cursor-pointer select-none"
                      style={EYEBROW}
                      onClick={() => handleSort("amount")}
                    >
                      <span className="inline-flex items-center gap-1 justify-end">
                        € Order <SortIcon column="amount" />
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o: any, idx: number) => {
                    const ls = linesByOrder.get(o.id) ?? [];
                    const isLast = idx === filtered.length - 1;
                    const items = ls.length
                      ? ls.map((l) => `${l.bundle_sku}×${l.quantity}`).join(", ")
                      : mapLegacyItem(o.product_name || "—");
                    return (
                      <tr
                        key={o.id}
                        onClick={() => openDetail(o, filtered)}
                        className="row-link cursor-pointer"
                        style={{
                          borderBottom: isLast ? "none" : `1px solid ${SURFACE_BORDER}`,
                        }}
                      >
                        <td className="px-6 py-4 align-middle" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selected.has(o.id)}
                            onChange={() => toggle(o.id)}
                            aria-label={`Selecteer order ${o.id.slice(0, 8)}`}
                          />
                        </td>
                        <td
                          className="px-6 py-4 whitespace-nowrap text-[13px] align-middle"
                          style={{ color: TEXT_SEC, fontVariantNumeric: "tabular-nums" }}
                        >
                          {new Date(o.created_at).toLocaleString("nl-BE", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="px-6 py-4 align-middle">
                          <span
                            className="inline-flex items-center gap-1.5 h-[24px] px-2.5 rounded-full text-[11px] font-semibold"
                            style={statusPillStyle(o.status)}
                          >
                            <span
                              aria-hidden
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: statusDotColor(o.status),
                              }}
                            />
                            {statusLabelNl(o.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 align-middle">
                          <div className="flex items-center gap-2">
                            <div className="text-[14px] font-medium leading-[1.4]" style={{ color: TEXT_PRI }}>
                              {o.shipping_name || <span style={{ color: TEXT_MUTED }}>—</span>}
                            </div>
                            <span
                              className="text-[10px] px-1.5 py-[1px] rounded-[4px] font-medium"
                              style={{
                                color: TEXT_MUTED,
                                border: `1px solid ${SURFACE_BORDER}`,
                                background: "rgba(255,255,255,0.03)",
                                letterSpacing: "0.04em",
                              }}
                              title="Taal"
                            >
                              {o.lang ? String(o.lang).toUpperCase() : "—"}
                            </span>
                          </div>
                          <div className="text-[12px] leading-[1.4]" style={{ color: TEXT_SEC }}>
                            {o.customer_email}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[13px] hidden md:table-cell align-middle">
                          <div style={{ color: TEXT_PRI }}>{o.shipping_line1 || "—"}</div>
                          <div className="flex items-center gap-2">
                            <span style={{ color: TEXT_SEC }}>
                              {o.shipping_postal_code} {o.shipping_city}
                            </span>
                            {o.shipping_country && (
                              <span
                                className="text-[10px] px-1.5 py-[1px] rounded-[4px] font-medium"
                                style={{
                                  color: TEXT_MUTED,
                                  border: `1px solid ${SURFACE_BORDER}`,
                                  background: "rgba(255,255,255,0.03)",
                                  letterSpacing: "0.04em",
                                }}
                                title="Land"
                              >
                                {String(o.shipping_country).toUpperCase()}
                              </span>
                            )}
                          </div>
                        </td>
                        <td
                          className="px-6 py-4 text-[13px] hidden md:table-cell align-middle"
                          style={{ color: TEXT_SEC }}
                        >
                          {items}
                        </td>
                        <td
                          className="px-6 py-4 text-right align-middle"
                          style={{ color: TEXT_PRI, fontVariantNumeric: "tabular-nums" }}
                        >
                          {(() => {
                            const n = stickerTotalById.get(o.id) ?? 0;
                            return (
                              <span
                                className="inline-flex items-center justify-center h-[22px] min-w-[28px] px-2 rounded-full text-[12px] font-semibold"
                                style={{
                                  background: "rgba(255,255,255,0.05)",
                                  border: `1px solid ${SURFACE_BORDER}`,
                                  color: n > 0 ? TEXT_PRI : TEXT_MUTED,
                                }}
                                title={`${n} ${n === 1 ? "Frame-ID" : "Frame-IDs"} in deze bestelling`}
                              >
                                {n}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 text-right align-middle">
                          <div
                            className="text-[15px] font-semibold"
                            style={{ color: TEXT_PRI, fontVariantNumeric: "tabular-nums" }}
                          >
                            {formatEur(o.amount_total)}
                          </div>
                          <div
                            className="text-[11px] font-mono mt-0.5"
                            style={{ color: TEXT_MUTED, fontVariantNumeric: "tabular-nums" }}
                          >
                            #{o.id.slice(0, 8)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!filtered.length && (
                    <tr>
                      <td colSpan={8}>
                        <div className="flex flex-col items-center justify-center text-center" style={{ padding: "80px 24px" }}>
                          <Inbox className="w-10 h-10 mb-4" strokeWidth={1.5} style={{ color: TEXT_MUTED }} />
                          <p className="text-[15px] font-semibold" style={{ color: TEXT_PRI }}>
                            {searchQuery
                              ? `Geen bestellingen gevonden voor "${searchInput.trim()}"`
                              : "Geen bestellingen in deze status"}
                          </p>
                          <p className="text-[13px] mt-1 max-w-sm" style={{ color: TEXT_SEC }}>
                            {searchQuery
                              ? "Probeer een andere zoekterm of wis de zoekopdracht."
                              : "Orders verschijnen hier zodra ze betaald zijn en gemarkeerd worden."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Order Detail Modal */}
            <Dialog open={!!detailOrder} onOpenChange={(open) => !open && closeDetail()}>
              {detailOrder && (
                <DialogContent
                  className="max-w-lg p-0 overflow-hidden rounded-[18px]"
                  style={{
                    background: "#13294D",
                    border: `1px solid ${SURFACE_BORDER}`,
                    color: TEXT_PRI,
                  }}
                >
                  <div
                    className="px-6 py-5"
                    style={{
                      borderBottom: `1px solid ${SURFACE_BORDER}`,
                      background: "rgba(255,255,255,0.02)",
                    }}
                  >
                    <DialogHeader>
                      <DialogTitle
                        className="text-[18px]"
                        style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: TEXT_PRI }}
                      >
                        <span className="flex items-center gap-2">
                          {(() => {
                            const atFirst = navIndex <= 0;
                            const atLast = navIndex >= navIds.length - 1;
                            const arrowBase: React.CSSProperties = {
                              width: 28, height: 28, borderRadius: 8,
                              display: "inline-flex", alignItems: "center", justifyContent: "center",
                              border: `1px solid ${SURFACE_BORDER}`,
                              background: "rgba(255,255,255,0.04)",
                              color: TEXT_PRI,
                            };
                            return (
                              <>
                                <button
                                  type="button"
                                  aria-label="Vorige order"
                                  onClick={() => gotoNav(-1)}
                                  disabled={atFirst}
                                  style={{ ...arrowBase, opacity: atFirst ? 0.35 : 1, cursor: atFirst ? "not-allowed" : "pointer" }}
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </button>
                                <Hash className="w-4 h-4" style={{ color: GREEN }} />
                                <span>Order {detailOrder.id.slice(0, 8)}</span>
                                <button
                                  type="button"
                                  aria-label="Volgende order"
                                  onClick={() => gotoNav(1)}
                                  disabled={atLast}
                                  style={{ ...arrowBase, opacity: atLast ? 0.35 : 1, cursor: atLast ? "not-allowed" : "pointer" }}
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                                {navIds.length > 0 && (
                                  <span className="ml-2 text-[11px] font-normal" style={{ color: TEXT_MUTED, fontFamily: "Inter, sans-serif" }}>
                                    {navIndex + 1} / {navIds.length}
                                  </span>
                                )}
                              </>
                            );
                          })()}
                        </span>
                      </DialogTitle>
                    </DialogHeader>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className="inline-flex items-center gap-1.5 h-[24px] px-2.5 rounded-full text-[11px] font-semibold"
                        style={statusPillStyle(detailOrder.status)}
                      >
                        <span
                          aria-hidden
                          style={{
                            width: 6, height: 6, borderRadius: "50%",
                            background: statusDotColor(detailOrder.status),
                          }}
                        />
                        {statusLabelNl(detailOrder.status)}
                      </span>
                      {detailOrder.deleted_at && (
                        <span
                          className="inline-flex items-center gap-1.5 h-[24px] px-2.5 rounded-full text-[11px] font-semibold"
                          style={{ background: "rgba(224,82,82,0.12)", color: "#E05252", border: "1px solid rgba(224,82,82,0.30)" }}
                        >
                          <Trash2 className="w-3 h-3" /> Verwijderd
                        </span>
                      )}
                      {!detailOrder.deleted_at && detailOrder.status === "printed" && (
                        <button
                          type="button"
                          disabled={detailBusy}
                          onClick={async () => {
                            setDetailBusy(true);
                            try {
                              await doRevertPaid({ data: { orderId: detailOrder.id } });
                              const res = await refetch();
                              const updated = res.data?.orders.find((x: any) => x.id === detailOrder.id);
                              if (updated) setDetailOrder(updated);
                            } finally {
                              setDetailBusy(false);
                            }
                          }}
                          className="text-[11px] inline-flex items-center gap-1 transition-colors"
                          style={{ color: TEXT_MUTED, textDecoration: "underline", textUnderlineOffset: 3 }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = TEXT_SEC)}
                          onMouseLeave={(e) => (e.currentTarget.style.color = TEXT_MUTED)}
                        >
                          <Undo2 className="w-3 h-3" /> Terug naar betaald
                        </button>
                      )}
                      {!detailOrder.deleted_at && detailOrder.status === "shipped" && (
                        <button
                          type="button"
                          disabled={detailBusy}
                          onClick={async () => {
                            setDetailBusy(true);
                            try {
                              await doRevertPrinted({ data: { orderId: detailOrder.id } });
                              const res = await refetch();
                              const updated = res.data?.orders.find((x: any) => x.id === detailOrder.id);
                              if (updated) setDetailOrder(updated);
                            } finally {
                              setDetailBusy(false);
                            }
                          }}
                          className="text-[11px] inline-flex items-center gap-1 transition-colors"
                          style={{ color: TEXT_MUTED, textDecoration: "underline", textUnderlineOffset: 3 }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = TEXT_SEC)}
                          onMouseLeave={(e) => (e.currentTarget.style.color = TEXT_MUTED)}
                        >
                          <Undo2 className="w-3 h-3" /> Terug naar geprint
                        </button>
                      )}
                      <span className="text-[11px]" style={{ color: TEXT_MUTED }}>
                        {detailOrder.environment === "live" ? "Live" : "Sandbox"}
                      </span>
                      {batchStatus && batchQueue.length > 1 && !detailOrder.deleted_at && (
                        <span className="ml-auto text-[11px]" style={{ color: TEXT_MUTED }}>
                          Order {Math.min(batchIndex + 1, batchQueue.length)} van {batchQueue.length} {statusLabelNl(batchStatus).toLowerCase()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="px-6 py-5 space-y-5">
                    <div>
                      <h4 className="mb-2 flex items-center gap-1.5" style={EYEBROW}>
                        <User className="w-3.5 h-3.5" /> Klant
                      </h4>
                      <p className="text-[14px] font-medium" style={{ color: TEXT_PRI }}>
                        {detailOrder.shipping_name || "—"}
                      </p>
                      <p className="text-[13px]" style={{ color: TEXT_SEC }}>{detailOrder.customer_email}</p>
                      <p className="text-[12px] mt-1 flex items-center gap-1.5" style={{ color: TEXT_MUTED }}>
                        <Languages className="w-3 h-3" />
                        Taal: <span style={{ color: TEXT_SEC, fontWeight: 600 }}>
                          {detailOrder.lang ? String(detailOrder.lang).toUpperCase() : "—"}
                        </span>
                      </p>
                      <p className="text-[12px] mt-1" style={{ color: TEXT_MUTED }}>
                        Hoe gevonden: <span style={{ color: TEXT_SEC, fontWeight: 600 }}>
                          {referralLabel((detailOrder as any).referral_source)}
                        </span>
                      </p>
                    </div>

                    <div>
                      <h4 className="mb-2 flex items-center gap-1.5" style={EYEBROW}>
                        <MapPin className="w-3.5 h-3.5" /> Verzendadres
                      </h4>
                      <p className="text-[14px]" style={{ color: TEXT_PRI }}>{detailOrder.shipping_line1 || "—"}</p>
                      {detailOrder.shipping_line2 && (
                        <p className="text-[14px]" style={{ color: TEXT_PRI }}>{detailOrder.shipping_line2}</p>
                      )}
                      <p className="text-[13px]" style={{ color: TEXT_SEC }}>
                        {detailOrder.shipping_postal_code} {detailOrder.shipping_city}
                        {detailOrder.shipping_state && `, ${detailOrder.shipping_state}`}
                      </p>
                      <p className="text-[13px]" style={{ color: TEXT_SEC }}>{detailOrder.shipping_country}</p>

                      {(() => {
                        const labelLines = [
                          detailOrder.shipping_name,
                          detailOrder.shipping_line1,
                          detailOrder.shipping_line2,
                          [detailOrder.shipping_postal_code, detailOrder.shipping_city].filter(Boolean).join(" "),
                          detailOrder.shipping_country ? String(detailOrder.shipping_country).toUpperCase() : null,
                        ].filter((l) => l && String(l).trim().length > 0) as string[];
                        const labelText = labelLines.join("\n");
                        return (
                          <div
                            className="mt-3 rounded-[10px] p-3"
                            style={{
                              background: "rgba(255,255,255,0.03)",
                              border: `1px solid ${SURFACE_BORDER}`,
                            }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <pre
                                className="text-[13px] leading-[1.45] m-0 whitespace-pre-wrap"
                                style={{
                                  color: TEXT_PRI,
                                  fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
                                }}
                              >{labelText}</pre>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(labelText);
                                    setLabelCopied(true);
                                    setTimeout(() => setLabelCopied(false), 1600);
                                  } catch {}
                                }}
                                className="inline-flex items-center gap-1.5 h-[28px] px-2.5 rounded-[8px] text-[11px] font-medium shrink-0 transition-colors focus:outline-none focus-visible:ring-2"
                                style={{
                                  background: "transparent",
                                  border: `1px solid ${SURFACE_BORDER}`,
                                  color: labelCopied ? GREEN : TEXT_SEC,
                                }}
                                aria-label="Kopieer adreslabel"
                              >
                                {labelCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                {labelCopied ? "Gekopieerd" : "Kopieer adreslabel"}
                              </button>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Contextual status transition */}
                      {(() => {
                        if (detailOrder.deleted_at) return null;
                        if (batchDone && batchStatus) {
                          return (
                            <div className="flex items-center gap-2 mt-3 text-[12px]" style={{ color: TEXT_MUTED }}>
                              <Check className="w-3.5 h-3.5" style={{ color: GREEN }} />
                              Alle {statusLabelNl(batchStatus).toLowerCase()} orders verwerkt
                            </div>
                          );
                        }
                        if (detailOrder.status === "paid") {
                          return (
                            <button
                              type="button"
                              disabled={detailBusy}
                              onClick={async () => {
                                setDetailBusy(true);
                                try {
                                  await doPrint({ data: { orderIds: [detailOrder.id] } });
                                  await advanceBatch();
                                } finally {
                                  setDetailBusy(false);
                                }
                              }}
                              className="btn-primary h-10 px-4 rounded-[12px] text-[13px] font-semibold w-full mt-3"
                            >
                              Markeer als geprint
                            </button>
                          );
                        }
                        if (detailOrder.status === "printed") {
                          return (
                            <button
                              type="button"
                              disabled={detailBusy}
                              onClick={async () => {
                                setDetailBusy(true);
                                try {
                                  await doShip({ data: { orderIds: [detailOrder.id] } });
                                  await advanceBatch();
                                } finally {
                                  setDetailBusy(false);
                                }
                              }}
                              className="btn-primary h-10 px-4 rounded-[12px] text-[13px] font-semibold w-full mt-3"
                            >
                              Markeer als verzonden
                            </button>
                          );
                        }
                        if (detailOrder.status === "shipped") {
                          return (
                            <div className="flex items-center gap-2 mt-3 text-[12px]" style={{ color: TEXT_MUTED }}>
                              <Check className="w-3.5 h-3.5" style={{ color: GREEN }} />
                              Afgerond — verzonden
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {!detailOrder.deleted_at && (
                        <div className="mt-3 space-y-2">
                          <button
                            type="button"
                            disabled={testEmailBusy}
                            onClick={async () => {
                              setTestEmailBusy(true);
                              setTestEmailMsg(null);
                              try {
                                const res: any = await doSendTestEmail({ data: { orderId: detailOrder.id } });
                                setTestEmailMsg({
                                  kind: "ok",
                                  text: `Testmail verstuurd naar ${res.to} — klantnaam: ${res.shippingName || "(leeg)"}`,
                                });
                              } catch (e: any) {
                                setTestEmailMsg({ kind: "err", text: e?.message || "Versturen mislukt" });
                              } finally {
                                setTestEmailBusy(false);
                              }
                            }}
                            className="h-9 px-3 rounded-[10px] text-[12px] font-medium w-full"
                            style={{
                              background: SURFACE,
                              border: `1px solid ${SURFACE_BORDER}`,
                              color: TEXT_PRI,
                            }}
                          >
                            {testEmailBusy ? "Verzenden…" : "Stuur testmail naar mij"}
                          </button>
                          {(() => {
                            const customerEmail = (detailOrder as any).customer_email as string | undefined;
                            return (
                              <button
                                type="button"
                                disabled={testEmailBusy || !customerEmail}
                                onClick={async () => {
                                  if (!customerEmail) return;
                                  const ok = window.confirm(
                                    `Bevestigingsemail opnieuw versturen naar ${customerEmail}?`,
                                  );
                                  if (!ok) return;
                                  setTestEmailBusy(true);
                                  setTestEmailMsg(null);
                                  try {
                                    const res: any = await doSendTestEmail({
                                      data: { orderId: detailOrder.id, to: customerEmail },
                                    });
                                    setTestEmailMsg({
                                      kind: "ok",
                                      text: `Bevestigingsemail opnieuw verstuurd naar ${res.to}`,
                                    });
                                  } catch (e: any) {
                                    setTestEmailMsg({ kind: "err", text: e?.message || "Versturen mislukt" });
                                  } finally {
                                    setTestEmailBusy(false);
                                  }
                                }}
                                className="h-9 px-3 rounded-[10px] text-[12px] font-medium w-full"
                                style={{
                                  background: GREEN,
                                  border: `1px solid ${GREEN}`,
                                  color: "#fff",
                                  opacity: !customerEmail ? 0.5 : 1,
                                }}
                              >
                                {testEmailBusy
                                  ? "Verzenden…"
                                  : customerEmail
                                  ? `Stuur bevestiging opnieuw naar klant (${customerEmail})`
                                  : "Geen klant-e-mail bekend"}
                              </button>
                            );
                          })()}
                          {testEmailMsg && (
                            <p
                              className="mt-2 text-[12px]"
                              style={{ color: testEmailMsg.kind === "ok" ? GREEN : "#E05252" }}
                            >
                              {testEmailMsg.text}
                            </p>
                          )}
                        </div>
                      )}
                    </div>


                    <div>
                      <h4 className="mb-2 flex items-center gap-1.5" style={EYEBROW}>
                        <Package className="w-3.5 h-3.5" /> Items
                      </h4>
                      {(linesByOrder.get(detailOrder.id) ?? []).length > 0 ? (
                        <ul className="space-y-1">
                          {(linesByOrder.get(detailOrder.id) ?? []).map((l: any) => (
                            <li key={l.id} className="text-[14px] flex justify-between" style={{ color: TEXT_PRI }}>
                              <span>{mapLegacyItem(l.bundle_sku)} × {l.quantity}</span>
                              <span className="text-[13px]" style={{ color: TEXT_SEC }}>{l.sticker_count} stickers</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[14px]" style={{ color: TEXT_PRI }}>
                          {mapLegacyItem(detailOrder.product_name || "—")}
                        </p>
                      )}
                    </div>

                    <div>
                      <h4 className="mb-2 flex items-center gap-1.5" style={EYEBROW}>
                        <CreditCard className="w-3.5 h-3.5" /> Betaling
                      </h4>
                      <div className="flex justify-between text-[14px]">
                        <span style={{ color: TEXT_SEC }}>Subtotaal</span>
                        <span style={{ color: TEXT_PRI, fontVariantNumeric: "tabular-nums" }}>
                          {formatEur(detailOrder.amount_subtotal)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[14px]">
                        <span style={{ color: TEXT_SEC }}>Verzending</span>
                        <span style={{ color: TEXT_PRI, fontVariantNumeric: "tabular-nums" }}>
                          {formatEur(detailOrder.amount_shipping ?? 0)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[14px]">
                        <span style={{ color: TEXT_SEC }}>BTW (21%, incl.)</span>
                        <span style={{ color: TEXT_PRI, fontVariantNumeric: "tabular-nums" }}>
                          {formatEur(detailOrder.amount_tax)}
                        </span>
                      </div>
                      <div
                        className="flex justify-between text-[15px] font-semibold mt-1 pt-2"
                        style={{ borderTop: `1px solid ${SURFACE_BORDER}` }}
                      >
                        <span style={{ color: TEXT_PRI }}>Totaal</span>
                        <span style={{ color: GREEN, fontVariantNumeric: "tabular-nums" }}>
                          {formatEur(detailOrder.amount_total)}
                        </span>
                      </div>
                      {detailOrder.mollie_payment_id && (
                        <p className="text-[11px] mt-2 font-mono" style={{ color: TEXT_MUTED }}>
                          Mollie:{" "}
                          <a
                            href={`https://my.mollie.com/dashboard/payments/${detailOrder.mollie_payment_id}${detailOrder.environment === "sandbox" ? "?testmode=true" : ""}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="vp-pro inline-flex items-center gap-1 underline decoration-dotted underline-offset-2 hover:opacity-80"
                            style={{ color: TEXT_PRI }}
                            title={detailOrder.environment === "sandbox" ? "Open in Mollie dashboard (testmode)" : "Open in Mollie dashboard"}
                          >
                            {detailOrder.mollie_payment_id}
                            <ExternalLink size={10} />
                          </a>
                        </p>
                      )}
                      {detailOrder.stripe_session_id && (
                        <p className="text-[11px] mt-1 font-mono" style={{ color: TEXT_MUTED }}>
                          Stripe: {detailOrder.stripe_session_id}
                        </p>
                      )}
                    </div>

                    <div>
                      <h4 className="mb-2 flex items-center gap-1.5" style={EYEBROW}>
                        <History className="w-3.5 h-3.5" /> Geschiedenis
                      </h4>
                      {(() => {
                        const events = eventsQuery.data?.events ?? [];
                        if (eventsQuery.isLoading) {
                          return <p className="text-[12px]" style={{ color: TEXT_MUTED }}>Laden…</p>;
                        }
                        if (!events.length) {
                          return (
                            <p className="text-[12px]" style={{ color: TEXT_MUTED }}>
                              Geen eerdere gebeurtenissen geregistreerd
                            </p>
                          );
                        }
                        const labelFor = (e: any): string => {
                          switch (e.event_type) {
                            case "paid": return "Betaling bevestigd";
                            case "printed": return "Gemarkeerd als geprint";
                            case "shipped": return "Gemarkeerd als verzonden";
                            case "reverted":
                              return `Teruggezet naar ${statusLabelNl(e.to_status || "")}`;
                            case "deleted": return "Verwijderd";
                            case "restored": return "Hersteld";
                            case "expired": return "Verlopen";
                            case "failed": return "Mislukt";
                            case "canceled":
                            case "cancelled": return "Geannuleerd";
                            case "refunded": return "Terugbetaald";
                            case "confirmation_email_resent": return "Bevestigingsemail opnieuw verstuurd";
                            case "confirmation_email_test_sent": return "Testmail verstuurd";
                            default: return e.event_type;
                          }
                        };
                        const actorFor = (e: any): string => {
                          if (e.actor_type === "system") return `via ${e.actor || "systeem"}`;
                          return `door ${e.actor || "admin"}`;
                        };
                        return (
                          <ul className="space-y-2">
                            {events.map((e: any) => (
                              <li key={e.id} className="text-[13px] leading-[1.45]">
                                <div style={{ color: TEXT_PRI }}>{labelFor(e)}</div>
                                {e.note && (
                                  <div className="text-[11px]" style={{ color: TEXT_MUTED }}>
                                    {e.note}
                                  </div>
                                )}
                                <div className="text-[11px]" style={{ color: TEXT_MUTED }}>
                                  {actorFor(e)} ·{" "}
                                  {new Date(e.created_at).toLocaleString("nl-BE", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
                              </li>
                            ))}
                          </ul>
                        );
                      })()}
                    </div>


                    <div className="pt-2" style={{ borderTop: `1px solid ${SURFACE_BORDER}` }}>
                      <div className="flex items-center gap-1.5 text-[11px]" style={{ color: TEXT_MUTED }}>
                        <Calendar className="w-3 h-3" />
                        {new Date(detailOrder.created_at).toLocaleString("nl-BE", {
                          dateStyle: "full",
                          timeStyle: "short",
                        })}
                      </div>
                    </div>

                    <div className="pt-4 mt-2 flex justify-end" style={{ borderTop: `1px solid ${SURFACE_BORDER}` }}>
                      {detailOrder.deleted_at ? (
                        <button
                          type="button"
                          disabled={detailBusy}
                          onClick={async () => {
                            setDetailBusy(true);
                            try {
                              await doRestore({ data: { orderId: detailOrder.id } });
                              const res = await refetch();
                              const updated = res.data?.orders.find((x: any) => x.id === detailOrder.id);
                              if (updated) setDetailOrder(updated);
                            } finally {
                              setDetailBusy(false);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[10px] text-[12px] font-medium transition-colors"
                          style={{
                            background: "rgba(46,204,138,0.10)",
                            color: GREEN,
                            border: "1px solid rgba(46,204,138,0.30)",
                          }}
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Herstellen
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={detailBusy}
                          onClick={async () => {
                            if (!window.confirm("Order verwijderen? Je kunt 'm later terugvinden en herstellen.")) return;
                            setDetailBusy(true);
                            try {
                              await doSoftDelete({ data: { orderId: detailOrder.id } });
                              await refetch();
                              closeDetail();
                            } finally {
                              setDetailBusy(false);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[10px] text-[12px] font-medium transition-colors"
                          style={{
                            background: "transparent",
                            color: "rgba(224,82,82,0.80)",
                            border: "1px solid rgba(224,82,82,0.25)",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(224,82,82,0.10)";
                            e.currentTarget.style.color = "#E05252";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = "rgba(224,82,82,0.80)";
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Verwijderen
                        </button>
                      )}
                    </div>
                  </div>
                </DialogContent>
              )}
            </Dialog>

            <Dialog open={!!printReport} onOpenChange={(open) => !open && setPrintReport(null)}>
              {printReport && (
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {printReport.kind === "success"
                        ? "Print — statusupdate geslaagd"
                        : printReport.kind === "partial"
                          ? "Print — statusupdate mislukt, rollback onvolledig"
                          : "Print — statusupdate mislukt, wijzigingen teruggedraaid"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 text-sm">
                    <div
                      className="p-3 rounded-md"
                      style={{
                        background:
                          printReport.kind === "success"
                            ? "rgba(46,204,138,0.12)"
                            : printReport.kind === "partial"
                              ? "rgba(245,158,11,0.12)"
                              : "rgba(224,82,82,0.12)",
                        border: `1px solid ${
                          printReport.kind === "success"
                            ? "rgba(46,204,138,0.35)"
                            : printReport.kind === "partial"
                              ? "rgba(245,158,11,0.4)"
                              : "rgba(224,82,82,0.4)"
                        }`,
                      }}
                    >
                      <div className="font-medium">{printReport.message}</div>
                      {printReport.error && (
                        <div className="mt-1 text-xs opacity-80">
                          Fout: <code>{printReport.error}</code>
                        </div>
                      )}
                    </div>
                    <div className="max-h-[50vh] overflow-auto rounded-md border border-border">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-muted">
                          <tr className="text-left">
                            <th className="px-2 py-1.5 font-semibold">Order ID</th>
                            <th className="px-2 py-1.5 font-semibold">Oude status</th>
                            <th className="px-2 py-1.5 font-semibold">Nieuwe status</th>
                            <th className="px-2 py-1.5 font-semibold">Rollback</th>
                          </tr>
                        </thead>
                        <tbody>
                          {printReport.rows.map((r) => {
                            const changed = r.oldStatus !== r.newStatus;
                            const rb = r.rollback;
                            const rbLabel =
                              rb === "reverted"
                                ? "✓ teruggezet"
                                : rb === "failed"
                                  ? "✕ mislukt"
                                  : rb === "not_needed"
                                    ? "— niet nodig"
                                    : "—";
                            const rbColor =
                              rb === "reverted"
                                ? "#2ECC8A"
                                : rb === "failed"
                                  ? "#E05252"
                                  : "rgba(230,234,242,0.6)";
                            return (
                              <tr key={r.id} className="border-t border-border align-top">
                                <td className="px-2 py-1.5 font-mono text-[11px] break-all">{r.id}</td>
                                <td className="px-2 py-1.5">{r.oldStatus ?? "—"}</td>
                                <td
                                  className="px-2 py-1.5"
                                  style={{
                                    color: changed ? "#2ECC8A" : "rgba(230,234,242,0.7)",
                                    fontWeight: changed ? 600 : 400,
                                  }}
                                >
                                  {r.newStatus ?? "—"}
                                </td>
                                <td className="px-2 py-1.5" style={{ color: rbColor }}>
                                  {rbLabel}
                                  {r.rollbackError && (
                                    <div className="text-[10px] opacity-70 mt-0.5">{r.rollbackError}</div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        className="text-xs underline opacity-80 hover:opacity-100"
                        onClick={() => {
                          const text = printReport.rows
                            .map(
                              (r) =>
                                `${r.id}\t${r.oldStatus ?? ""}\t${r.newStatus ?? ""}\t${r.rollback ?? ""}${r.rollbackError ? `\t${r.rollbackError}` : ""}`,
                            )
                            .join("\n");
                          navigator.clipboard.writeText(text).then(
                            () => toast.success("Gekopieerd naar klembord"),
                            () => toast.error("Kopiëren mislukt"),
                          );
                        }}
                      >
                        Kopieer rapport
                      </button>
                      <button
                        type="button"
                        className="btn-ghost h-8 px-3 rounded-md text-xs"
                        onClick={() => setPrintReport(null)}
                      >
                        Sluiten
                      </button>
                    </div>
                  </div>
                </DialogContent>
              )}
            </Dialog>



            <Dialog
              open={!!labelItems}
              onOpenChange={(open) => {
                if (!open) closeLabelPreview();
              }}
            >
              {labelItems && (() => {
                const includedCount = labelItems.filter((l) => !labelExcluded.has(l.id)).length;
                const zoomItem = labelZoomId ? labelItems.find((l) => l.id === labelZoomId) : null;
                // 1 mm = 4 px for thumbs, 8 px for zoom
                const hexToRgba = (hex: string, a: number) => {
                  const h = hex.replace("#", "");
                  const n = h.length === 3
                    ? h.split("").map((c) => c + c).join("")
                    : h.padEnd(6, "0").slice(0, 6);
                  const r = parseInt(n.slice(0, 2), 16);
                  const g = parseInt(n.slice(2, 4), 16);
                  const b = parseInt(n.slice(4, 6), 16);
                  return `rgba(${r},${g},${b},${a})`;
                };
                const renderLabel = (l: LabelData, mm: number) => {
                  const W = 89 * mm;
                  const H = 28 * mm;
                  const SAFE = Math.max(0, labelSafePadMm) * mm;
                  const PAD = SAFE; // left/top/bottom safe margin
                  const clipMm = Math.max(0, 89 - labelPrinterWidthMm);
                  const PAD_R = Math.max(SAFE, clipMm * mm + SAFE); // right safe margin includes printer clip strip
                  const lines = [
                    l.shipping_name?.trim(),
                    l.shipping_line1?.trim(),
                    l.shipping_line2?.trim(),
                    `${l.shipping_postal_code ?? ""} ${l.shipping_city ?? ""}`.trim(),
                    (l.shipping_country || "").toUpperCase().trim(),
                  ].filter(Boolean) as string[];
                  // 1 mm grid (lighter every mm, stronger every 5 mm)
                  const gridBg = `
                    repeating-linear-gradient(to right, rgba(0,0,0,0.06) 0 1px, transparent 1px ${mm}px),
                    repeating-linear-gradient(to bottom, rgba(0,0,0,0.06) 0 1px, transparent 1px ${mm}px),
                    repeating-linear-gradient(to right, rgba(0,0,0,0.14) 0 1px, transparent 1px ${5 * mm}px),
                    repeating-linear-gradient(to bottom, rgba(0,0,0,0.14) 0 1px, transparent 1px ${5 * mm}px),
                    #fff
                  `;
                  return (
                    <div
                      style={{
                        position: "relative",
                        width: W,
                        height: H,
                        background: gridBg,
                        color: "#000",
                        border: "1px solid #d4d4d4",
                        borderRadius: 4,
                        boxSizing: "border-box",
                        fontFamily: "Helvetica, Arial, sans-serif",
                        fontSize: mm * 3,
                        lineHeight: 1.25,
                        overflow: "hidden",
                      }}
                    >
                      {/* Safe-area / margin indicator (dashed inset) */}
                      {labelShowOverlay && (
                        <div
                          aria-hidden
                          style={{
                            position: "absolute",
                            left: PAD,
                            top: PAD,
                            width: Math.max(0, W - PAD - PAD_R),
                            height: Math.max(0, H - PAD * 2),
                            border: `1px dashed ${labelSafeColor}`,
                            pointerEvents: "none",
                            boxSizing: "border-box",
                          }}
                        />
                      )}
                      {/* Printer clip strip (right edge the printer physically cuts) */}
                      {labelShowOverlay && clipMm > 0 && (
                        <div
                          aria-hidden
                          title={`Printer clip: rechts ${clipMm.toFixed(1)} mm wordt afgesneden`}
                          style={{
                            position: "absolute",
                            top: 0,
                            right: 0,
                            width: clipMm * mm,
                            height: H,
                            background: `repeating-linear-gradient(135deg, ${hexToRgba(labelClipColor, 0.22)} 0 4px, ${hexToRgba(labelClipColor, 0)} 4px 8px)`,
                            borderLeft: `1px dashed ${hexToRgba(labelClipColor, 0.7)}`,
                            pointerEvents: "none",
                          }}
                        />
                      )}
                      {/* Cut marks at each corner */}
                      {labelShowOverlay && [
                        { top: 0, left: 0, bt: `2px solid ${labelCutColor}`, bl: `2px solid ${labelCutColor}` },
                        { top: 0, right: 0, bt: `2px solid ${labelCutColor}`, br: `2px solid ${labelCutColor}` },
                        { bottom: 0, left: 0, bb: `2px solid ${labelCutColor}`, bl: `2px solid ${labelCutColor}` },
                        { bottom: 0, right: 0, bb: `2px solid ${labelCutColor}`, br: `2px solid ${labelCutColor}` },
                      ].map((c, i) => (
                        <div
                          key={i}
                          aria-hidden
                          style={{
                            position: "absolute",
                            width: Math.max(6, mm * 2),
                            height: Math.max(6, mm * 2),
                            top: (c as any).top,
                            left: (c as any).left,
                            right: (c as any).right,
                            bottom: (c as any).bottom,
                            borderTop: (c as any).bt,
                            borderBottom: (c as any).bb,
                            borderLeft: (c as any).bl,
                            borderRight: (c as any).br,
                            pointerEvents: "none",
                          }}
                        />
                      ))}
                      {/* Address content, anchored top-left like the PDF */}
                      <div
                        style={{
                          position: "absolute",
                          left: PAD,
                          top: PAD,
                          right: PAD_R,
                          bottom: PAD,
                          textAlign: "left",
                        }}
                      >
                        {lines.map((t, i) => (
                          <div
                            key={i}
                            style={{
                              fontWeight: i === 0 ? 700 : 400,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {t}
                          </div>
                        ))}
                      </div>
                      {/* Caption: sticker count · language (bottom-right).
                          Mirrors the PDF shrink logic exactly: start at 5pt,
                          step down by 0.5pt to a 3pt floor until the rendered
                          width fits inside the 85 mm safe area. */}
                      {(() => {
                        const sc = Number(l.sticker_count ?? 0);
                        const lc = (l.lang || "").toString().trim().toUpperCase();
                        const parts = [sc > 0 ? String(sc) : null, lc || null].filter(Boolean) as string[];
                        if (!parts.length) return null;
                        const caption = parts.join(" \u00B7 ");
                        const PT_TO_MM = 0.3528;
                        const availMm = 89 - 2 - 4; // W - PAD - PAD_R (mm)
                        const ptToPx = (pt: number) => pt * PT_TO_MM * mm;
                        let captionPt = 7.5;
                        const minPt = 4;
                        if (typeof document !== "undefined") {
                          const canvas = document.createElement("canvas");
                          const ctx = canvas.getContext("2d");
                          if (ctx) {
                            const fitsAt = (pt: number) => {
                              ctx.font = `700 ${ptToPx(pt)}px Helvetica, Arial, sans-serif`;
                              const widthMm = ctx.measureText(caption).width / mm;
                              return widthMm <= availMm;
                            };
                            while (captionPt > minPt && !fitsAt(captionPt)) {
                              captionPt -= 0.5;
                            }
                          }
                        }
                        const captionPx = ptToPx(captionPt);
                        const descPx = ptToPx(captionPt) * 0.25;
                        return (
                          <div
                            style={{
                              position: "absolute",
                              right: PAD_R,
                              // Match PDF: descender bottom sits at safe-area edge.
                              bottom: PAD - descPx,
                              maxWidth: availMm * mm,
                              fontSize: captionPx,
                              color: "rgb(70,70,70)",
                              lineHeight: 1,
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              fontFamily: "Helvetica, Arial, sans-serif",
                            }}
                          >
                            {caption}
                          </div>
                        );
                      })()}
                    </div>
                  );
                };

                return (
                  <DialogContent className="vp-pro max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>
                        Preview labels — {includedCount}/{labelItems.length} × 89 × 28 mm
                      </DialogTitle>
                    </DialogHeader>
                    <div className="text-[12px] mb-3" style={{ color: "rgba(255,255,255,0.7)" }}>
                      Klik op een label om groter te bekijken. Gebruik ↑↓ om te herordenen en ✕ om uit te sluiten.
                    </div>
                    <div
                      className="flex flex-wrap items-center gap-3 mb-3 p-2 rounded-[8px]"
                      style={{
                        background: "#0E1116",
                        border: "1px solid rgba(255,255,255,0.12)",
                        color: "#E6EAF2",
                        fontSize: 12,
                      }}
                    >
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={labelShowOverlay}
                          onChange={(e) => setLabelShowOverlay(e.target.checked)}
                        />
                        Overlay tonen
                      </label>
                      <label className="flex items-center gap-2">
                        Printer-breedte
                        <input
                          type="number"
                          min={40}
                          max={89}
                          step={0.5}
                          value={labelPrinterWidthMm}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            if (Number.isFinite(v)) setLabelPrinterWidthMm(Math.min(89, Math.max(40, v)));
                          }}
                          style={{
                            width: 64,
                            background: "rgba(0,0,0,0.3)",
                            border: "1px solid rgba(255,255,255,0.15)",
                            borderRadius: 6,
                            padding: "2px 6px",
                            color: "inherit",
                          }}
                        />
                        mm
                      </label>
                      <label className="flex items-center gap-2">
                        Veilige marge
                        <input
                          type="number"
                          min={0}
                          max={10}
                          step={0.5}
                          value={labelSafePadMm}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            if (Number.isFinite(v)) setLabelSafePadMm(Math.min(10, Math.max(0, v)));
                          }}
                          style={{
                            width: 56,
                            background: "rgba(0,0,0,0.3)",
                            border: "1px solid rgba(255,255,255,0.15)",
                            borderRadius: 6,
                            padding: "2px 6px",
                            color: "inherit",
                          }}
                        />
                        mm
                      </label>
                      <span style={{ color: "rgba(255,255,255,0.55)" }}>
                        Clip-zone rechts: {Math.max(0, 89 - labelPrinterWidthMm).toFixed(1)} mm
                      </span>
                    </div>
                    {labelShowOverlay && (() => {
                      const swatch = (bg: string, border?: string) => ({
                        width: 18,
                        height: 12,
                        borderRadius: 3,
                        background: bg,
                        border: border ?? "1px solid rgba(255,255,255,0.2)",
                        flexShrink: 0,
                      });
                      const clipBg = `repeating-linear-gradient(135deg, ${labelClipColor}55 0 4px, transparent 4px 8px)`;
                      const items = [
                        {
                          label: "Clip-zone (printer snijdt af)",
                          hint: "Rechterstrook die de 87 mm-printer fysiek wegsnijdt",
                          preview: <div style={swatch(clipBg, `1px dashed ${labelClipColor}`)} />,
                          color: labelClipColor,
                          onChange: setLabelClipColor,
                        },
                        {
                          label: "Veilige marge",
                          hint: "Binnen deze gestippelde rand blijft alles zichtbaar",
                          preview: <div style={swatch("transparent", `1px dashed ${labelSafeColor}`)} />,
                          color: labelSafeColor,
                          onChange: setLabelSafeColor,
                        },
                        {
                          label: "Afsnij-rand (cut marks)",
                          hint: "Hoekmarkeringen op de fysieke labelrand",
                          preview: (
                            <div style={{ position: "relative", ...swatch("transparent") }}>
                              <span style={{ position: "absolute", top: 0, left: 0, width: 6, height: 6, borderTop: `2px solid ${labelCutColor}`, borderLeft: `2px solid ${labelCutColor}` }} />
                              <span style={{ position: "absolute", bottom: 0, right: 0, width: 6, height: 6, borderBottom: `2px solid ${labelCutColor}`, borderRight: `2px solid ${labelCutColor}` }} />
                            </div>
                          ),
                          color: labelCutColor,
                          onChange: setLabelCutColor,
                        },
                      ];
                      return (
                        <div
                          className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-3 p-2 rounded-[8px]"
                          style={{
                            background: "#0E1116",
                            border: "1px solid rgba(255,255,255,0.12)",
                            color: "#E6EAF2",
                            fontSize: 12,
                          }}
                        >
                          <span style={{ color: "rgba(230,234,242,0.7)", fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase", fontSize: 10 }}>
                            Legenda
                          </span>
                          {items.map((it) => (
                            <div key={it.label} className="flex items-center gap-2" title={it.hint}>
                              {it.preview}
                              <span>{it.label}</span>
                              <input
                                type="color"
                                value={it.color}
                                onChange={(e) => it.onChange(e.target.value)}
                                aria-label={`Kleur voor ${it.label}`}
                                style={{
                                  width: 22,
                                  height: 18,
                                  padding: 0,
                                  border: "1px solid rgba(255,255,255,0.15)",
                                  borderRadius: 4,
                                  background: "transparent",
                                  cursor: "pointer",
                                }}
                              />
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              setLabelClipColor("#E74C3C");
                              setLabelSafeColor("#2ECC8A");
                              setLabelCutColor("#E74C3C");
                            }}
                            className="btn-ghost h-6 px-2 rounded-[6px] text-[11px]"
                          >
                            Reset
                          </button>
                        </div>
                      );
                    })()}




                    {zoomItem ? (() => {
                      const previewItem = zoomDraft ? { ...zoomItem, ...zoomDraft } : zoomItem;
                      const isDirty = !!zoomDraft && (
                        (zoomDraft.shipping_name ?? "") !== (zoomItem.shipping_name ?? "") ||
                        (zoomDraft.shipping_line1 ?? "") !== (zoomItem.shipping_line1 ?? "") ||
                        (zoomDraft.shipping_line2 ?? "") !== (zoomItem.shipping_line2 ?? "") ||
                        (zoomDraft.shipping_postal_code ?? "") !== (zoomItem.shipping_postal_code ?? "") ||
                        (zoomDraft.shipping_city ?? "") !== (zoomItem.shipping_city ?? "") ||
                        (zoomDraft.shipping_country ?? "") !== (zoomItem.shipping_country ?? "")
                      );
                      const fields: { key: keyof LabelData; label: string; col: number }[] = [
                        { key: "shipping_name", label: "Naam", col: 2 },
                        { key: "shipping_line1", label: "Straat + nr", col: 2 },
                        { key: "shipping_line2", label: "Adres regel 2", col: 2 },
                        { key: "shipping_postal_code", label: "Postcode", col: 1 },
                        { key: "shipping_city", label: "Gemeente", col: 1 },
                        { key: "shipping_country", label: "Land", col: 2 },
                      ];
                      const inputStyle: React.CSSProperties = {
                        width: "100%",
                        background: "#0E1116",
                        color: "#E6EAF2",
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: 6,
                        padding: "6px 8px",
                        fontSize: 13,
                        fontFamily: "inherit",
                      };
                      const handleSave = async () => {
                        if (!zoomDraft || zoomSaving) return;
                        setZoomSaving(true);
                        try {
                          // Mimic async save to prevent race conditions and double-clicks
                          await new Promise((r) => setTimeout(r, 350));
                          setLabelItems((prev) => {
                            if (!prev) return prev;
                            return prev.map((p) => (p.id === zoomItem.id ? { ...p, ...zoomDraft } : p));
                          });
                          toast.success("Adres bijgewerkt", {
                            description: "Wijzigingen zijn opgeslagen voor deze PDF.",
                          });
                        } catch (err) {
                          toast.error("Opslaan mislukt", {
                            description: err instanceof Error ? err.message : "Probeer opnieuw.",
                          });
                        } finally {
                          setZoomSaving(false);
                        }
                      };
                      const handleReset = () => {
                        if (zoomSaving) return;
                        setZoomDraft({
                          shipping_name: zoomItem.shipping_name,
                          shipping_line1: zoomItem.shipping_line1,
                          shipping_line2: zoomItem.shipping_line2,
                          shipping_postal_code: zoomItem.shipping_postal_code,
                          shipping_city: zoomItem.shipping_city,
                          shipping_country: zoomItem.shipping_country,
                        });
                      };
                      const canSave = isDirty && !zoomSaving;
                      const canReset = isDirty && !zoomSaving;
                      return (
                        <div className="flex flex-col items-center gap-3" style={{ maxHeight: "60vh", overflow: "auto" }}>
                          {renderLabel(previewItem as LabelData, 8)}
                          <div
                            className="w-full p-3 rounded-[8px]"
                            style={{
                              background: "#0E1116",
                              border: "1px solid rgba(255,255,255,0.12)",
                              color: "#E6EAF2",
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: 10,
                              maxWidth: 720,
                            }}
                          >
                            <div style={{ gridColumn: "1 / -1", fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase", color: "rgba(230,234,242,0.7)", fontWeight: 600 }}>
                              Adres bewerken (alleen deze PDF — order blijft ongewijzigd)
                            </div>
                            {fields.map((f) => (
                              <label
                                key={f.key}
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 4,
                                  gridColumn: f.col === 2 ? "1 / -1" : "auto",
                                  fontSize: 11,
                                  color: "rgba(230,234,242,0.75)",
                                }}
                              >
                                <span>{f.label}</span>
                                <input
                                  type="text"
                                  value={(zoomDraft?.[f.key] as string | null | undefined) ?? ""}
                                  disabled={zoomSaving}
                                  onChange={(e) =>
                                    setZoomDraft((prev) => ({ ...(prev ?? {}), [f.key]: e.target.value }))
                                  }
                                  style={{ ...inputStyle, opacity: zoomSaving ? 0.6 : 1 }}
                                />
                              </label>
                            ))}
                            <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
                              <button
                                type="button"
                                onClick={handleReset}
                                disabled={!canReset}
                                className="btn-ghost h-8 px-3 rounded-[8px] text-[12px] font-medium"
                                style={{ opacity: canReset ? 1 : 0.5, cursor: canReset ? "pointer" : "not-allowed" }}
                              >
                                Herstellen
                              </button>
                              <button
                                type="button"
                                onClick={handleSave}
                                disabled={!canSave}
                                aria-busy={zoomSaving}
                                className="h-8 px-4 rounded-[8px] text-[12px] font-semibold inline-flex items-center gap-2"
                                style={{
                                  background: canSave ? "#2ECC8A" : "rgba(46,204,138,0.35)",
                                  color: "#0E1116",
                                  cursor: canSave ? "pointer" : "not-allowed",
                                  border: "none",
                                }}
                              >
                                {zoomSaving && (
                                  <span
                                    aria-hidden
                                    className="animate-spin"
                                    style={{
                                      width: 12,
                                      height: 12,
                                      borderRadius: "50%",
                                      border: "2px solid rgba(14,17,22,0.35)",
                                      borderTopColor: "#0E1116",
                                      display: "inline-block",
                                    }}
                                  />
                                )}
                                {zoomSaving ? "Opslaan…" : isDirty ? "Wijzigingen opslaan" : "Opgeslagen"}
                              </button>
                            </div>
                          </div>

                          <button
                            onClick={() => setLabelZoomId(null)}
                            disabled={zoomSaving}
                            className="btn-ghost h-8 px-3 rounded-[10px] text-[12px] font-medium"
                            style={{ opacity: zoomSaving ? 0.5 : 1, cursor: zoomSaving ? "not-allowed" : "pointer" }}
                          >
                            ← Terug naar overzicht
                          </button>
                        </div>
                      );
                    })() : (
                      <div
                        className="grid gap-3"
                        style={{
                          gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
                          maxHeight: "60vh",
                          overflow: "auto",
                          paddingRight: 4,
                        }}
                      >
                        {labelItems.map((l, idx) => {
                          const excluded = labelExcluded.has(l.id);
                          const isDragging = labelDragId === l.id;
                          const isDragOver = labelDragOverId === l.id && labelDragId && labelDragId !== l.id;
                          return (
                            <div
                              key={l.id}
                              draggable
                              onDragStart={(e) => {
                                setLabelDragId(l.id);
                                e.dataTransfer.effectAllowed = "move";
                                try { e.dataTransfer.setData("text/plain", l.id); } catch {}
                              }}
                              onDragOver={(e) => {
                                if (!labelDragId || labelDragId === l.id) return;
                                e.preventDefault();
                                e.dataTransfer.dropEffect = "move";
                                if (labelDragOverId !== l.id) setLabelDragOverId(l.id);
                              }}
                              onDragLeave={() => {
                                if (labelDragOverId === l.id) setLabelDragOverId(null);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (labelDragId) reorderLabel(labelDragId, l.id);
                                setLabelDragId(null);
                                setLabelDragOverId(null);
                              }}
                              onDragEnd={() => {
                                setLabelDragId(null);
                                setLabelDragOverId(null);
                              }}
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 6,
                                padding: 8,
                                borderRadius: 8,
                                background: "rgba(255,255,255,0.04)",
                                border: isDragOver
                                  ? "1px dashed #2ECC8A"
                                  : "1px solid rgba(255,255,255,0.08)",
                                opacity: excluded ? 0.4 : isDragging ? 0.5 : 1,
                                cursor: "grab",
                                transition: "border-color 120ms",
                              }}
                            >
                              <div className="flex items-center justify-between text-[11px]" style={{ color: "rgba(255,255,255,0.7)" }}>
                                <span title="Sleep om te herschikken" style={{ cursor: "grab" }}>⋮⋮ Pagina {idx + 1}{excluded ? " (uitgesloten)" : ""}</span>

                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => moveLabel(l.id, -1)}
                                    disabled={idx === 0}
                                    title="Omhoog"
                                    className="btn-ghost h-6 px-1.5 rounded text-[11px] disabled:opacity-40"
                                  >↑</button>
                                  <button
                                    onClick={() => moveLabel(l.id, 1)}
                                    disabled={idx === labelItems.length - 1}
                                    title="Omlaag"
                                    className="btn-ghost h-6 px-1.5 rounded text-[11px] disabled:opacity-40"
                                  >↓</button>
                                  <button
                                    onClick={() => toggleExclude(l.id)}
                                    title={excluded ? "Opnieuw opnemen" : "Uitsluiten"}
                                    className="btn-ghost h-6 px-1.5 rounded text-[11px]"
                                  >{excluded ? "+" : "✕"}</button>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setLabelZoomId(l.id)}
                                title="Klik om te vergroten"
                                style={{ background: "transparent", border: 0, padding: 0, cursor: "zoom-in" }}
                              >
                                {renderLabel(l, 4)}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex justify-end gap-2 mt-3">
                      <button
                        onClick={closeLabelPreview}
                        className="btn-ghost h-9 px-3 rounded-[10px] text-[13px] font-medium"
                      >
                        Sluiten
                      </button>
                      <button
                        onClick={downloadLabelsPdf}
                        disabled={includedCount === 0}
                        className="btn-primary h-9 px-3 rounded-[10px] text-[13px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Printen ({includedCount}) →
                      </button>
                    </div>
                  </DialogContent>
                );
              })()}
            </Dialog>



          </div>
        )}
      </div>
      {undoState && (() => {
        const remaining = Math.max(0, undoState.expiresAt - nowTs);
        const secs = Math.ceil(remaining / 1000);
        const pct = Math.max(0, Math.min(100, (remaining / UNDO_WINDOW_MS) * 100));
        const n = undoState.ids.length;
        return (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-6 right-6 z-50 vp-pro"
            style={{
              minWidth: 320,
              background: "rgba(15,23,42,0.96)",
              border: `1px solid ${SURFACE_BORDER}`,
              borderRadius: 14,
              boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
              backdropFilter: "blur(8px)",
              overflow: "hidden",
            }}
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <Trash2 size={16} style={{ color: "rgba(248,113,113,0.85)" }} />
              <div className="text-[13px] flex-1" style={{ color: "rgba(255,255,255,0.92)" }}>
                {n} {n === 1 ? "order" : "orders"} verwijderd
                <span className="ml-2" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {secs}s
                </span>
              </div>
              <button
                onClick={handleUndoDelete}
                disabled={busy}
                className="h-8 px-3 rounded-[10px] text-[12px] font-medium inline-flex items-center gap-1.5 disabled:opacity-50"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.18)",
                }}
                autoFocus
              >
                <Undo2 size={14} /> Ongedaan maken
              </button>
              <button
                onClick={() => setUndoState(null)}
                aria-label="Sluiten"
                className="h-8 w-8 rounded-[10px] text-[14px] inline-flex items-center justify-center"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                ×
              </button>
            </div>
            <div style={{ height: 2, background: "rgba(255,255,255,0.06)" }}>
              <div
                style={{
                  height: "100%",
                  width: `${pct}%`,
                  background: "rgba(248,113,113,0.7)",
                  transition: "width 250ms linear",
                }}
              />
            </div>
          </div>
        );
      })()}
    </div>
  );
}
