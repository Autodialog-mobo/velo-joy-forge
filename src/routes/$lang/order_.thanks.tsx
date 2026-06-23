import { createFileRoute, Link } from "@tanstack/react-router";
import { useCurrentLang } from "@/i18n/useCurrentLang";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Truck, Mail, ArrowLeft, AlertTriangle, Loader2 } from "lucide-react";
import { VelopassMark } from "@/components/VelopassMark";
import { Footer } from "@/components/Footer";
import { LangSwitcher } from "@/components/LangSwitcher";
import { getOrderByMolliePayment, retryOrderPayment } from "@/utils/mollie.functions";
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

type OrderView = {
  status: string | null;
  paymentStatus: string | null;
  email: string | null;
  amountTotal: number;
  items: Array<{ priceId: string; quantity: number }>;
};

function BedanktPage() {
  const lang = useCurrentLang();
  const { t } = useTranslation("order-thanks");
  const { payment_id } = Route.useSearch();
  const [order, setOrder] = useState<OrderView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

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
            paymentStatus: res.paymentStatus,
            email: res.email,
            amountTotal: res.amountTotal,
            items: res.items,
          });
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : unknownErr))
      .finally(() => setLoading(false));
  }, [payment_id, t]);

  const totalStickers =
    order?.items.reduce((sum, i) => {
      const n =
        i.priceId === "frameid_family_onetime" ? 5 : i.priceId === "frameid_duo_onetime" ? 2 : 1;
      return sum + n * i.quantity;
    }, 0) ?? 0;

  const handleRetry = async () => {
    if (!payment_id) return;
    setRetrying(true);
    setRetryError(null);
    try {
      const res = await retryOrderPayment({
        data: { paymentId: payment_id, origin: window.location.origin },
      });
      if ("error" in res) {
        setRetryError(res.error);
        setRetrying(false);
      } else {
        window.location.href = res.checkoutUrl;
      }
    } catch (e) {
      setRetryError(e instanceof Error ? e.message : t("states.error_unknown"));
      setRetrying(false);
    }
  };

  const status = order?.status ?? null;
  const isPaid = status === "paid" || status === "printed" || status === "shipped";
  const isPending =
    status === "open" || status === "pending" || status === "authorized" || status === null;
  // expired / failed / canceled → unpaid retry state

  return (
    <div
      className="vp-com"
      style={{
        background: "#F5F3EE",
        minHeight: "100vh",
        color: "#0D1F3C",
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      <header
        style={{
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        <Link
          to="/$lang"
          params={{ lang }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
            color: "#0D1F3C",
          }}
        >
          <VelopassMark size={28} />
          <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 18 }}>
            Velopass
          </span>
        </Link>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
          <LangSwitcher currentLang={lang} tone="light" />
          <Link
            to="/$lang"
            params={{ lang }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 14,
              color: "rgba(13,31,60,0.7)",
              textDecoration: "none",
            }}
          >
            <ArrowLeft size={16} /> {t("header.back_home")}
          </Link>
        </div>
      </header>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 72px" }}>
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: 36,
            boxShadow: "0 4px 20px rgba(13,31,60,0.08)",
            textAlign: "center",
          }}
        >
          {loading ? (
            <p>{t("states.loading")}</p>
          ) : error ? (
            <>
              <h1
                style={{
                  fontFamily: "Syne, sans-serif",
                  fontWeight: 700,
                  fontSize: 26,
                  margin: 0,
                }}
              >
                {t("states.error_title")}
              </h1>
              <p style={{ color: "rgba(13,31,60,0.7)", marginTop: 12 }}>{error}</p>
            </>
          ) : !order ? (
            <p>{t("states.no_order")}</p>
          ) : isPaid ? (
            <>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 999,
                  background: "rgba(46,204,138,0.15)",
                  margin: "0 auto 20px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CheckCircle2 size={40} color="#2ECC8A" strokeWidth={2} />
              </div>
              <p
                style={{
                  color: "#2ECC8A",
                  fontWeight: 600,
                  fontSize: 12,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  margin: 0,
                }}
              >
                {t("success.eyebrow")}
              </p>
              <h1
                style={{
                  fontFamily: "Syne, sans-serif",
                  fontWeight: 700,
                  fontSize: 30,
                  margin: "10px 0 12px",
                  color: "#0D1F3C",
                }}
              >
                {t("success.title")}
              </h1>
              <div
                style={{
                  color: "rgba(13,31,60,0.75)",
                  fontSize: 15,
                  margin: "0 0 28px",
                  lineHeight: 1.6,
                }}
              >
                <p style={{ margin: "0 0 8px" }}>{t("success.intro")}</p>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: "0 0 12px",
                    display: "grid",
                    gap: 4,
                  }}
                >
                  {order.items.map((i) => (
                    <li key={i.priceId}>
                      <strong>{t(`bundles.${i.priceId}`, { defaultValue: i.priceId })}</strong> ×{" "}
                      {i.quantity}
                    </li>
                  ))}
                </ul>
                <p style={{ margin: 0 }}>
                  {totalStickers > 1
                    ? t("success.shipping_note_many")
                    : t("success.shipping_note_one")}
                </p>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  textAlign: "left",
                  margin: "0 0 24px",
                }}
              >
                <div style={{ background: "#F5F3EE", borderRadius: 12, padding: 16 }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      color: "rgba(13,31,60,0.6)",
                      textTransform: "uppercase",
                      letterSpacing: 1.5,
                    }}
                  >
                    <Mail size={14} /> {t("success.card_confirmation")}
                  </div>
                  <p
                    style={{
                      margin: "6px 0 0",
                      fontWeight: 600,
                      fontSize: 14,
                      color: "#0D1F3C",
                      wordBreak: "break-word",
                    }}
                  >
                    {order.email ?? "—"}
                  </p>
                </div>
                <div style={{ background: "#F5F3EE", borderRadius: 12, padding: 16 }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      color: "rgba(13,31,60,0.6)",
                      textTransform: "uppercase",
                      letterSpacing: 1.5,
                    }}
                  >
                    <Truck size={14} /> {t("success.card_shipping")}
                  </div>
                  <p
                    style={{ margin: "6px 0 0", fontWeight: 600, fontSize: 14, color: "#0D1F3C" }}
                  >
                    {t("success.shipping_value")}
                  </p>
                </div>
              </div>

              <p
                style={{
                  fontFamily: "Syne, sans-serif",
                  fontWeight: 700,
                  fontSize: 22,
                  margin: 0,
                  color: "#0D1F3C",
                }}
              >
                {t("success.amount_paid", {
                  amount: new Intl.NumberFormat(`${lang}-BE`, {
                    style: "currency",
                    currency: "EUR",
                  }).format(order.amountTotal / 100),
                })}
              </p>

              <Link
                to="/$lang"
                params={{ lang }}
                style={{
                  display: "inline-block",
                  marginTop: 24,
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
          ) : isPending ? (
            <>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 999,
                  background: "rgba(13,31,60,0.08)",
                  margin: "0 auto 20px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Loader2 size={40} color="#0D1F3C" strokeWidth={2} className="animate-spin" />
              </div>
              <p
                style={{
                  color: "rgba(13,31,60,0.6)",
                  fontWeight: 600,
                  fontSize: 12,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  margin: 0,
                }}
              >
                {t("pending.eyebrow")}
              </p>
              <h1
                style={{
                  fontFamily: "Syne, sans-serif",
                  fontWeight: 700,
                  fontSize: 28,
                  margin: "10px 0 12px",
                  color: "#0D1F3C",
                }}
              >
                {t("pending.title")}
              </h1>
              <p style={{ color: "rgba(13,31,60,0.75)", fontSize: 15, lineHeight: 1.6, margin: "0 0 24px" }}>
                {t("pending.body")}
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  display: "inline-block",
                  padding: "12px 24px",
                  borderRadius: 12,
                  background: "#0D1F3C",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                {t("pending.refresh")}
              </button>
            </>
          ) : (
            <>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 999,
                  background: "rgba(232,168,56,0.15)",
                  margin: "0 auto 20px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AlertTriangle size={40} color="#E8A838" strokeWidth={2} />
              </div>
              <p
                style={{
                  color: "#E8A838",
                  fontWeight: 600,
                  fontSize: 12,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  margin: 0,
                }}
              >
                {t("unpaid.eyebrow")}
              </p>
              <h1
                style={{
                  fontFamily: "Syne, sans-serif",
                  fontWeight: 700,
                  fontSize: 28,
                  margin: "10px 0 12px",
                  color: "#0D1F3C",
                }}
              >
                {t("unpaid.title")}
              </h1>
              <p style={{ color: "rgba(13,31,60,0.75)", fontSize: 15, lineHeight: 1.6, margin: "0 0 8px" }}>
                {t("unpaid.body")}
              </p>
              <p
                style={{
                  fontFamily: "Syne, sans-serif",
                  fontWeight: 700,
                  fontSize: 20,
                  margin: "12px 0 24px",
                  color: "#0D1F3C",
                }}
              >
                {new Intl.NumberFormat(`${lang}-BE`, {
                  style: "currency",
                  currency: "EUR",
                }).format(order.amountTotal / 100)}
              </p>
              <button
                type="button"
                onClick={handleRetry}
                disabled={retrying}
                style={{
                  display: "inline-block",
                  padding: "12px 24px",
                  borderRadius: 12,
                  background: retrying ? "rgba(13,31,60,0.6)" : "#0D1F3C",
                  color: "#fff",
                  border: "none",
                  cursor: retrying ? "default" : "pointer",
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                {retrying ? t("unpaid.retrying") : t("unpaid.retry_button")}
              </button>
              {retryError && (
                <p style={{ color: "#C0392B", marginTop: 16, fontSize: 13 }}>{retryError}</p>
              )}
            </>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
