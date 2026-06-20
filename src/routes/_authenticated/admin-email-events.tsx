import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { ArrowLeft, RefreshCw, Mail, Send, Search, X } from "lucide-react";
import { listEmailEvents } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin-email-events")({
  ssr: false,
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id)
      .in("role", ["admin", "staff"])
      .maybeSingle();
    if (!roles) throw redirect({ to: "/admin" });
  },
  component: EmailEventsPage,
  head: () => ({ meta: [{ title: "E-mail events — Velopass admin" }] }),
});

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
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: TEXT_MUTED,
};

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("nl-BE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

const EVENT_LABELS: Record<string, string> = {
  confirmation_email_resent: "Bevestiging opnieuw",
  confirmation_email_test_sent: "Testmail",
};

const EVENT_PILL: Record<string, React.CSSProperties> = {
  confirmation_email_resent: {
    background: "rgba(46,204,138,0.12)",
    color: GREEN,
    border: "1px solid rgba(46,204,138,0.30)",
  },
  confirmation_email_test_sent: {
    background: "rgba(255,255,255,0.07)",
    color: "rgba(255,255,255,0.60)",
    border: "1px solid rgba(255,255,255,0.12)",
  },
};

function extractRecipient(note: string | null): string {
  if (!note) return "—";
  const m = note.match(/Verzonden naar\s+(.+)$/i);
  return m ? m[1].trim() : note;
}

function EmailEventsPage() {
  const fetchEvents = useServerFn(listEmailEvents);
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-email-events"],
    queryFn: () => fetchEvents({ data: { limit: 500 } }),
  });

  const events = data?.events ?? [];

  const [typeFilter, setTypeFilter] = useState<"all" | "confirmation_email_resent" | "confirmation_email_test_sent">("all");
  const [orderIdInput, setOrderIdInput] = useState("");
  const [orderIdQuery, setOrderIdQuery] = useState("");
  const [recipientInput, setRecipientInput] = useState("");
  const [recipientQuery, setRecipientQuery] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setOrderIdQuery(orderIdInput.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [orderIdInput]);

  useEffect(() => {
    const t = setTimeout(() => setRecipientQuery(recipientInput.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [recipientInput]);

  const filtered = useMemo(() => {
    return events.filter((e: any) => {
      if (typeFilter !== "all" && e.event_type !== typeFilter) return false;
      if (orderIdQuery && !String(e.order_id).toLowerCase().includes(orderIdQuery)) return false;
      if (recipientQuery) {
        const note = (e.note || "").toLowerCase();
        if (!note.includes(recipientQuery)) return false;
      }
      return true;
    });
  }, [events, typeFilter, orderIdQuery, recipientQuery]);

  const hasFilters = typeFilter !== "all" || orderIdQuery || recipientQuery;

  return (
    <div style={{ minHeight: "100vh", background: NAVY, color: TEXT_PRI }}>
      <div className="mx-auto max-w-7xl px-6 py-10">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 text-sm"
          style={{ color: TEXT_SEC }}
        >
          <ArrowLeft size={14} /> Terug naar fulfillment
        </Link>

        <div className="mt-4 flex items-center justify-between">
          <div>
            <div style={EYEBROW}>Velopass · Back-office</div>
            <h1
              className="mt-2"
              style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 700,
                fontSize: 32,
                letterSpacing: "-0.6px",
              }}
            >
              E-mail events
            </h1>
            <p className="mt-1 text-[13px]" style={{ color: TEXT_SEC }}>
              Overzicht van alle testmails en handmatige resends.{