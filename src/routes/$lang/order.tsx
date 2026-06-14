import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCurrentLang } from "@/i18n/useCurrentLang";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Truck, ShieldCheck, ArrowLeft, Plus, Minus, ShoppingBag, Lightbulb, Droplets, Eye, ArrowUpRight } from "lucide-react";
import { VelopassMark } from "@/components/VelopassMark";
import { Footer } from "@/components/Footer";
import { LangSwitcher } from "@/components/LangSwitcher";
import { createMolliePayment } from "@/utils/mollie.functions";

type BundleKey = "frameid_solo_onetime" | "frameid_duo_onetime" | "frameid_family_onetime";

type Bundle = {
  key: BundleKey;
  name: string;
  stickers: number;
  price: number; // cents
  pricePerUnit: number;
  discountKey?: "discount_15" | "discount_23";
  featured?: boolean;
};

const BUNDLES: Bundle[] = [
  {
    key: "frameid_solo_onetime",
    name: "1 Frame-ID",
    stickers: 1,
    price: 1295,
    pricePerUnit: 1295,
  },
  {
    key: "frameid_duo_onetime",
    name: "2 Frame-ID's",
    stickers: 2,
    price: 2195,
    pricePerUnit: 1098,
    discountKey: "discount_15",
    featured: true,
  },
  {
    key: "frameid_family_onetime",
    name: "5 Frame-ID's",
    stickers: 5,
    price: 4995,
    pricePerUnit: 999,
    discountKey: "discount_23",
  },
];


const eur = (cents: number) =>
  new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(cents / 100);

import { buildLocalizedHead } from "@/i18n/seo";
import { isLang } from "@/i18n/config";
import nlOrder from "@/i18n/locales/nl/order.json";
import enOrder from "@/i18n/locales/en/order.json";
import frOrder from "@/i18n/locales/fr/order.json";
import deOrder from "@/i18n/locales/de/order.json";

const ORDER_META = {
  nl: nlOrder.meta,
  en: enOrder.meta,
  fr: frOrder.meta,
  de: deOrder.meta,
} as const;

export const Route = createFileRoute("/$lang/order")({
  head: ({ params }) => {
    const lang = isLang(params.lang) ? params.lang : "en";
    const m = ORDER_META[lang];
    return buildLocalizedHead({
      lang,
      path: "order",
      title: m.title,
      description: m.description,
      ogDescription: m.ogDescription,
      ogType: "product",
    });
  },
  component: BestellenPage,
});

function BestellenPage() {
  const lang = useCurrentLang();
  const { t } = useTranslation("order");
  const [quantities, setQuantities] = useState<Record<BundleKey, number>>({
    frameid_solo_onetime: 0,
    frameid_duo_onetime: 0,
    frameid_family_onetime: 0,
  });
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("BE");
  const [stage, setStage] = useState<"select" | "checkout">("select");
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);


  const items = useMemo(
    () =>
      BUNDLES.filter((b) => quantities[b.key] > 0).map((b) => ({
        priceId: b.key,
        quantity: quantities[b.key],
        bundle: b,
      })),
    [quantities],
  );
  const total = items.reduce((sum, i) => sum + i.bundle.price * i.quantity, 0);
  const hasItems = items.length > 0;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const shippingValid =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    address.trim().length > 0 &&
    postalCode.trim().length > 0 &&
    city.trim().length > 0 &&
    /^(BE|NL|FR|LU|DE)$/.test(country);
  const canCheckout = hasItems && emailValid && shippingValid;

  const updateQty = (key: BundleKey, delta: number) =>
    setQuantities((q) => ({ ...q, [key]: Math.max(0, Math.min(20, q[key] + delta)) }));

  const startCheckout = async () => {
    setStage("checkout");
    setCheckoutError(null);
    try {
      const result = await createMolliePayment({
        data: {
          items: items.map((i) => ({ priceId: i.priceId, quantity: i.quantity })),
          customerEmail: email,
          origin: window.location.origin,
          lang: lang as "nl" | "en" | "fr" | "de",
          shipping: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            address: address.trim(),
            postalCode: postalCode.trim(),
            city: city.trim(),
            country,
          },
        },
      });
      if ("error" in result) {
        setCheckoutError(result.error);
        return;
      }
      window.location.href = result.checkoutUrl;
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : t("checkout_stage.unknown_error"));
    }
  };


  return (
    <div style={{ background: "#F5F3EE", minHeight: "100vh", color: "#0D1F3C" }}>
      <div className={`nav-backdrop${navOpen ? " open" : ""}`} onClick={() => setNavOpen(false)} aria-hidden="true" />
      <nav className="vp-nav">
        <Link to="/$lang" params={{ lang }} className="nav-logo">
          <div className="logo-mark"><VelopassMark /></div>
          <span className="logo-text">velopass</span>
        </Link>
        <ul className={`nav-links${navOpen ? " open" : ""}`} onClick={() => setNavOpen(false)}>
          <li><Link to="/$lang" params={{ lang }} hash="wat-je-krijgt">{t("common:nav.what_you_get")}</Link></li>
          <li><Link to="/$lang" params={{ lang }} hash="already-have-one">{t("common:nav.already_have_one")}</Link></li>
          <li><Link to="/$lang" params={{ lang }} hash="community">{t("common:nav.community")}</Link></li>
          <li><Link to="/$lang/bike-check" params={{ lang }}>{t("common:nav.bike_check")}</Link></li>
          <li><Link to="/$lang/contact" params={{ lang }} search={{ type: "rider" }}>{t("common:nav.contact")}</Link></li>
          <li><Link to="/$lang/shop" params={{ lang }} style={{ color: "var(--green-mid)", display: "inline-flex", alignItems: "center", gap: 6 }}><ArrowUpRight size={15} strokeWidth={2.2} />{t("common:nav.for_professionals")}</Link></li>
        </ul>
        <div className="nav-actions" style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <LangSwitcher currentLang={lang} tone="light" />
          <button
            type="button"
            className="nav-toggle"
            aria-label={t("common:nav.menu")}
            aria-expanded={navOpen}
            onClick={() => setNavOpen((o) => !o)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              {navOpen ? (
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ background: "#0D1F3C", color: "#fff", padding: "56px 24px 72px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <p style={{ color: "#2ECC8A", fontFamily: "DM Sans, sans-serif", fontWeight: 600, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", margin: 0 }}>
            {t("hero.eyebrow")}
          </p>
          <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 36, lineHeight: 1.15, margin: "12px 0 14px", maxWidth: 720 }}>
            {t("hero.title")}
          </h1>
          <p style={{ fontFamily: "DM Sans, sans-serif", color: "rgba(255,255,255,0.72)", fontSize: 14, lineHeight: 1.6, margin: 0, maxWidth: 620 }}>
            {t("hero.subtitle")}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 18, marginTop: 24, fontSize: 13, color: "rgba(255,255,255,0.8)" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Truck size={16} color="#2ECC8A" /> {t("hero.feature_shipping")}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><ShieldCheck size={16} color="#2ECC8A" /> {t("hero.feature_secure")}</span>
          </div>

        </div>
      </section>

      <div style={{ maxWidth: 1100, margin: "-40px auto 0", padding: "0 24px 72px", position: "relative" }}>
        {stage === "select" && (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 360px", gap: 24, alignItems: "start" }} className="bestel-grid">
            {/* Cards column */}
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
                {BUNDLES.map((b) => {
                  const qty = quantities[b.key];
                  const isFeatured = b.featured;
                  return (
                    <div
                      key={b.key}
                      style={{
                        background: isFeatured ? "rgba(46,204,138,0.06)" : "#fff",
                        borderRadius: "0 16px 16px 0",
                        padding: 24,
                        border: isFeatured ? "2px solid #2ECC8A" : "1px solid rgba(13,31,60,0.06)",
                        borderLeft: `${b.stickers === 1 ? 4 : b.stickers === 2 ? 10 : 22}px solid #2ECC8A`,
                        boxShadow: "0 4px 20px rgba(13,31,60,0.08)",
                        position: "relative",
                        fontFamily: "DM Sans, sans-serif",
                        color: "#0D1F3C",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      {isFeatured && (
                        <span style={{ position: "absolute", top: -14, right: 12, zIndex: 2, background: "#2ECC8A", color: "#0D1F3C", fontFamily: "DM Sans, sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", padding: "4px 12px", borderRadius: 999, boxShadow: "0 2px 8px rgba(46,204,138,0.4)" }}>
                          {t("bundles.popular_badge")}
                        </span>
                      )}
                      <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 56, lineHeight: 1, color: "#2ECC8A" }}>
                        {b.stickers}
                      </div>
                      <div style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 500, fontSize: 16, color: "#0D1F3C", marginTop: 2 }}>
                        {b.stickers === 1 ? t("bundles.single_label") : t("bundles.plural_label")}
                      </div>
                      <p style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 30, margin: "4px 0 4px", color: "#0D1F3C" }}>
                        {eur(b.price)}
                      </p>
                      <p style={{ fontSize: 13, color: "rgba(13,31,60,0.6)", margin: 0 }}>
                        {t("bundles.per_unit_template", { price: eur(b.pricePerUnit) })}
                      </p>
                      {b.discountKey && (
                        <span style={{ display: "inline-block", marginTop: 10, background: "rgba(46,204,138,0.18)", color: "#0F8A5C", fontWeight: 700, fontSize: 11, padding: "4px 8px", borderRadius: 999, alignSelf: "flex-start" }}>
                          {t(`bundles.${b.discountKey}` as const)}
                        </span>
                      )}

                      <div style={{ marginTop: "auto", paddingTop: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ display: "inline-flex", alignItems: "center", border: "1px solid rgba(13,31,60,0.15)", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
                          <button type="button" aria-label={t("bundles.qty_decrease_aria")} onClick={() => updateQty(b.key, -1)} style={qtyBtn} disabled={qty === 0}>
                            <Minus size={14} />
                          </button>
                          <span style={{ minWidth: 32, textAlign: "center", fontWeight: 600, color: "#0D1F3C" }}>{qty}</span>
                          <button type="button" aria-label={t("bundles.qty_increase_aria")} onClick={() => updateQty(b.key, 1)} style={qtyBtn}>
                            <Plus size={14} />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateQty(b.key, 1)}
                          style={{
                            background: qty > 0 ? "rgba(13,31,60,0.06)" : "#0D1F3C",
                            color: qty > 0 ? "#0D1F3C" : "#fff",
                            border: "none",
                            padding: "10px 14px",
                            borderRadius: 10,
                            fontFamily: "DM Sans, sans-serif",
                            fontWeight: 600,
                            fontSize: 13,
                            cursor: "pointer",
                          }}
                        >
                          {qty > 0 ? t("bundles.add_one_more") : t("bundles.add")}
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>

              <p style={{ fontSize: 12, color: "rgba(13,31,60,0.55)", margin: 0, fontFamily: "DM Sans, sans-serif" }}>
                {t("info.combine_note")}
              </p>

              {/* PRO TIP — klevinstructies */}
              <div style={{ background: "rgba(46,204,138,0.06)", border: "1px solid rgba(46,204,138,0.2)", borderRadius: 12, padding: "20px 24px", fontFamily: "DM Sans, sans-serif" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <Lightbulb size={16} color="#2ECC8A" />
                  <span style={{ color: "#2ECC8A", fontWeight: 700, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" }}>{t("pro_tip.label")}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 18 }}>
                  <div>
                    <Droplets size={28} color="#2ECC8A" strokeWidth={1.8} />
                    <p style={{ fontWeight: 600, fontSize: 13, color: "#0D1F3C", margin: "8px 0 4px" }}>{t("pro_tip.degrease_title")}</p>
                    <p style={{ fontSize: 12, color: "rgba(13,31,60,0.6)", margin: 0, lineHeight: 1.55 }}>{t("pro_tip.degrease_body")}</p>
                  </div>
                  <div>
                    <Eye size={28} color="#2ECC8A" strokeWidth={1.8} />
                    <p style={{ fontWeight: 600, fontSize: 13, color: "#0D1F3C", margin: "8px 0 4px" }}>{t("pro_tip.visible_title")}</p>
                    <p style={{ fontSize: 12, color: "rgba(13,31,60,0.6)", margin: 0, lineHeight: 1.55 }}>{t("pro_tip.visible_body")}</p>
                  </div>
                  <div>
                    <ShieldCheck size={28} color="#2ECC8A" strokeWidth={1.8} />
                    <p style={{ fontWeight: 600, fontSize: 13, color: "#0D1F3C", margin: "8px 0 4px" }}>{t("pro_tip.deterrent_title")}</p>
                    <p style={{ fontSize: 12, color: "rgba(13,31,60,0.6)", margin: 0, lineHeight: 1.55 }}>{t("pro_tip.deterrent_body")}</p>
                  </div>
                </div>
              </div>

            </div>

            {/* Cart sidebar */}
            <aside style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 4px 20px rgba(13,31,60,0.08)", fontFamily: "DM Sans, sans-serif", position: "sticky", top: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <ShoppingBag size={18} color="#0D1F3C" />
                <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 18, margin: 0, color: "#0D1F3C" }}>{t("cart.title")}</h2>
              </div>

              {!hasItems ? (
                <p style={{ fontSize: 13, color: "rgba(13,31,60,0.6)", margin: "0 0 16px" }}>
                  {t("cart.empty")}
                </p>

              ) : (
                <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
                  {items.map((i) => (
                    <div key={i.priceId} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14, color: "#0D1F3C" }}>
                      <span>
                        <span style={{ fontWeight: 600 }}>{i.bundle.stickers} {i.bundle.stickers === 1 ? t("bundles.single_label") : t("bundles.plural_label")}</span>
                        <span style={{ color: "rgba(13,31,60,0.6)" }}> × {i.quantity}</span>
                      </span>

                      <span style={{ fontWeight: 600 }}>{eur(i.bundle.price * i.quantity)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", fontSize: 13, color: "rgba(13,31,60,0.7)", borderTop: "1px solid rgba(13,31,60,0.08)" }}>
                <span>{t("cart.shipping")}</span>
                <span style={{ color: "#2ECC8A", fontWeight: 600 }}>{t("cart.shipping_free")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid rgba(13,31,60,0.08)" }}>
                <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 16, color: "#0D1F3C" }}>{t("cart.total")}</span>
                <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 20, color: "#0D1F3C" }}>{eur(total)}</span>
              </div>

              <div style={{ display: "grid", gap: 6, margin: "16px 0 12px" }}>
                <label htmlFor="email" style={{ fontSize: 12, fontWeight: 500, color: "rgba(13,31,60,0.75)" }}>
                  {t("cart.email_label")}
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("cart.email_placeholder")}
                  style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(13,31,60,0.15)", fontSize: 14, fontFamily: "inherit", color: "#0D1F3C", background: "#fff", width: "100%", boxSizing: "border-box", minWidth: 0 }}
                />
              </div>

              <div style={{ display: "grid", gap: 10, margin: "0 0 12px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <LabeledInput label={t("cart.first_name")} value={firstName} onChange={setFirstName} placeholder={t("cart.first_name_placeholder")} />
                  <LabeledInput label={t("cart.last_name")} value={lastName} onChange={setLastName} placeholder={t("cart.last_name_placeholder")} />
                </div>
                <LabeledInput label={t("cart.address")} value={address} onChange={setAddress} placeholder={t("cart.address_placeholder")} />
                <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8 }}>
                  <LabeledInput label={t("cart.postal_code")} value={postalCode} onChange={setPostalCode} placeholder={t("cart.postal_code_placeholder")} />
                  <LabeledInput label={t("cart.city")} value={city} onChange={setCity} placeholder={t("cart.city_placeholder")} />
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  <label htmlFor="country" style={{ fontSize: 12, fontWeight: 500, color: "rgba(13,31,60,0.75)" }}>{t("cart.country")}</label>
                  <select
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(13,31,60,0.15)", fontSize: 14, fontFamily: "inherit", color: "#0D1F3C", background: "#fff", width: "100%", boxSizing: "border-box", minWidth: 0 }}
                  >
                    <option value="BE">{t("cart.country_be")}</option>
                    <option value="NL">{t("cart.country_nl")}</option>
                    <option value="FR">{t("cart.country_fr")}</option>
                    <option value="LU">{t("cart.country_lu")}</option>
                    <option value="DE">{t("cart.country_de")}</option>
                  </select>
                </div>
              </div>


              <div style={{ position: "relative" }} className={`pay-btn-wrap${tooltipOpen ? " pay-btn-wrap--open" : ""}`}>
                <button
                  type="button"
                  onClick={() => {
                    if (!canCheckout) {
                      setTooltipOpen(true);
                      window.setTimeout(() => setTooltipOpen(false), 2500);
                      return;
                    }
                    void startCheckout();
                  }}
                  aria-disabled={!canCheckout}
                  style={{
                    width: "100%",
                    padding: "14px 18px",
                    borderRadius: 12,
                    border: "none",
                    background: !canCheckout ? "rgba(46,204,138,0.25)" : "#2ECC8A",
                    color: "#0D1F3C",
                    fontFamily: "DM Sans, sans-serif",
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: !canCheckout ? "not-allowed" : "pointer",
                    opacity: !canCheckout ? 0.7 : 1,
                  }}
                >
                  {hasItems ? t("cart.pay_with_total_template", { total: eur(total) }) : t("cart.pay_arrow")}
                </button>
                {!canCheckout && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: "calc(100% + 8px)",
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "#0D1F3C",
                      color: "#fff",
                      fontSize: 12,
                      fontFamily: "DM Sans, sans-serif",
                      fontWeight: 500,
                      padding: "8px 12px",
                      borderRadius: 8,
                      whiteSpace: "nowrap",
                      zIndex: 10,
                      pointerEvents: "none",
                      opacity: 0,
                      transition: "opacity 150ms ease",
                    }}
                    className="pay-tooltip"
                  >
                    {!hasItems
                      ? t("tooltips.need_bundle")
                      : !emailValid
                      ? t("tooltips.need_email")
                      : t("tooltips.need_shipping")}
                    <span
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: "50%",
                        transform: "translateX(-50%)",
                        borderWidth: 6,
                        borderStyle: "solid",
                        borderColor: "#0D1F3C transparent transparent transparent",
                      }}
                    />
                  </span>
                )}
              </div>
              <p style={{ fontSize: 11, color: "rgba(13,31,60,0.55)", margin: "8px 0 0", textAlign: "center" }}>
                {t("cart.secure_note")}
              </p>

            </aside>
          </div>
        )}

        {stage === "checkout" && (
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 4px 20px rgba(13,31,60,0.08)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
              <div>
                <p style={{ margin: 0, fontSize: 12, color: "rgba(13,31,60,0.6)", fontFamily: "DM Sans, sans-serif", textTransform: "uppercase", letterSpacing: 1.5 }}>
                  {t("checkout_stage.label")}
                </p>
                <h2 style={{ margin: "4px 0 0", fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 22, color: "#0D1F3C" }}>
                  {t("checkout_stage.total_template", { total: eur(total) })}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setStage("select")}
                style={{ background: "transparent", border: "none", color: "rgba(13,31,60,0.65)", cursor: "pointer", fontSize: 13, fontFamily: "DM Sans, sans-serif", display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <ArrowLeft size={14} /> {t("checkout_stage.edit_order")}
              </button>
            </div>
            {checkoutError ? (
              <div style={{ color: "#b00020", fontFamily: "DM Sans, sans-serif", fontSize: 14 }}>
                {t("checkout_stage.error_prefix")} {checkoutError}
              </div>
            ) : (
              <p style={{ margin: 0, color: "rgba(13,31,60,0.7)", fontFamily: "DM Sans, sans-serif", fontSize: 14 }}>
                {t("checkout_stage.redirecting")}
              </p>
            )}

          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 900px) {
          .bestel-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <Footer />
    </div>
  );
}

const qtyBtn: React.CSSProperties = {
  width: 32,
  height: 36,
  border: "none",
  background: "transparent",
  cursor: "pointer",
  color: "#0D1F3C",
  fontFamily: "inherit",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: "rgba(13,31,60,0.75)" }}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(13,31,60,0.15)", fontSize: 14, fontFamily: "inherit", color: "#0D1F3C", background: "#fff", width: "100%", boxSizing: "border-box", minWidth: 0 }}
      />
    </div>
  );
}
