import { createFileRoute, Link } from "@tanstack/react-router";
import { useCurrentLang } from "@/i18n/useCurrentLang";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Truck, Mail, ArrowLeft } from "lucide-react";
import { VelopassMark } from "@/components/VelopassMark";
import { Footer } from "@/components/Footer";
import { LangSwitcher } from "@/components/LangSwitcher";
import { getOrderByMolliePayment } from "@/utils/mollie.functions";
import { buildLocalizedHead } from "@/i18n/seo";

export const Route = createFileRoute("/$lang/order_/thanks")({
  validateSearch: (search: Record<string, unknown>): { payment_id?: string } => ({
    payment_id: typeof search.payment_id === "string" ? search.payment_id : undefined,
  }),
  head: ({ params }) =>
    buildLocalizedHead({
      lang: params.lang,
      path: "order/thanks",
      title: "Bedankt voor je bestelling — Velopass",
      description: "Je Velopass-bestelling is bevestigd.",
      noindex: true,
    }),
  component: BedanktPage,
});

function BedanktPage() {
  const lang = useCurrentLang();
  const { t } = useTranslation("order-thanks");
  const { payment_id } = Route.useSearch();
  const [order, setOrder] = useState<{
    status: string | null;
    paymentStatus: string | null;
    email: string | null;
    amountTotal: number;
    items: Array<{ priceId: string; quantity: number }>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!payment_id) {
      setLoading(false);
      return;
    }
    const unknownErr = t("states.error_unknown");
    getOrderByMolliePayment({ data: { paymentId: payment_id } })
      .then((res) => {
        if ("error" in res) setError(res.error ?? unknownErr);
        else
          setOrder({
            status: res.status,
            paymentStatus: res.status,
            email: res.email,
            amountTotal: res.amountTotal,
            items: res.items,
          });
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : unknownErr))
      .finally(() => setLoading(false));
  }, [payment_id, t]);

  const totalStickers = order?.items.reduce((sum, i) => {
    const n = i.priceId === "frameid_family_onetime" ? 5 : i.priceId === "frameid_duo_onetime" ? 2 : 1;
    return sum + n * i.quantity;
  }, 0) ?? 0;

  return (
    <div style={{ background: "#F5F3EE", minHeight: "100vh", color: "#0D1F3C", fontFamily: "DM Sans, sans-serif" }}>
      <header style={{ padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 1200, margin: "0 auto" }}>
        <Link to="/$lang" params={{ lang }} style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", color: "#0D1F3C" }}>
          <VelopassMark size={28} />
          <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 18 }}>Velopass</span>
        </Link>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
          <LangSwitcher currentLang={lang} tone="light" />
          <Link to="/$lang" params={{ lang }} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, color: "rgba(13,31,60,0.7)", textDecoration: "none" }}>
            <ArrowLeft size={16} /> {t("header.back_home")}
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 72px" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 36, boxShadow: "0 4px 20px rgba(13,31,60,0.08)", textAlign: "center" }}>
          {loading ? (
            <p>{t("states.loading")}</p>
          ) : error ? (
            <>
              <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 26, margin: 0 }}>{t("states.error_title")}</h1>
              <p style={{ color: "rgba(13,31,60,0.7)", marginTop: 12 }}>{error}</p>
            </>
          ) : !order ? (
            <p>{t("states.no_order")}</p>
          ) : (
            <>
              <div style={{ width: 72, height: 72, borderRadius: 999, background: "rgba(46,204,138,0.15)", margin: "0 auto 20px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <CheckCircle2 size={40} color="#2ECC8A" strokeWidth={2} />
              </div>
              <p style={{ color: "#2ECC8A", fontWeight: 600, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", margin: 0 }}>
                {t("success.eyebrow")}
              </p>
              <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 30, margin: "10px 0 12px", color: "#0D1F3C" }}>
                {t("success.title")}
              </h1>
              <div style={{ color: "rgba(13,31,60,0.75)", fontSize: 15, margin: "0 0 28px", lineHeight: 1.6 }}>
                <p style={{ margin: "0 0 8px" }}>{t("success.intro")}</p>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px", display: "grid", gap: 4 }}>
                  {order.items.map((i) => (
                    <li key={i.priceId}><strong>{t(`bundles.${i.priceId}`, { defaultValue: i.priceId })}</strong> × {i.quantity}</li>
                  ))}
                </ul>
                <p style={{ margin: 0 }}>
                  {totalStickers > 1 ? t("success.shipping_note_many") : t("success.shipping_note_one")}
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, textAlign: "left", margin: "0 0 24px" }}>
                <div style={{ background: "#F5F3EE", borderRadius: 12, padding: 16 }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(13,31,60,0.6)", textTransform: "uppercase", letterSpacing: 1.5 }}>
                    <Mail size={14} /> {t("success.card_confirmation")}
                  </div>
                  <p style={{ margin: "6px 0 0", fontWeight: 600, fontSize: 14, color: "#0D1F3C", wordBreak: "break-word" }}>
                    {order.email ?? "—"}
                  </p>
                </div>
                <div style={{ background: "#F5F3EE", borderRadius: 12, padding: 16 }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(13,31,60,0.6)", textTransform: "uppercase", letterSpacing: 1.5 }}>
                    <Truck size={14} /> {t("success.card_shipping")}
                  </div>
                  <p style={{ margin: "6px 0 0", fontWeight: 600, fontSize: 14, color: "#0D1F3C" }}>{t("success.shipping_value")}</p>
                </div>
              </div>

              <p style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 22, margin: 0, color: "#0D1F3C" }}>
                {t("success.amount_paid", {
                  amount: new Intl.NumberFormat(`${lang}-BE`, { style: "currency", currency: "EUR" }).format(order.amountTotal / 100),
                })}
              </p>
              <p style={{ fontSize: 13, color: "rgba(13,31,60,0.55)", margin: "6px 0 28px" }}>
                {t("success.status_line", { status: order.paymentStatus })}
              </p>

              <Link
                to="/$lang"
                params={{ lang }}
                style={{
                  display: "inline-block",
                  padding: "12px 24px",
                  borderRadius: 12,
                  background: "#0D1F3C",
                  color: "#fff",
                  textDecoration: "none",
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                {t("success.back_button")}
              </Link>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
