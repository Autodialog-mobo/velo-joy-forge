import { useEffect, useMemo, useState } from "react";
import { useCurrentLang } from "@/i18n/useCurrentLang";
import { useTranslation } from "react-i18next";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import {
  HelpCircle,
  Package,
  ScanLine,
  MessageCircle,
  ArrowUpRight,
  ArrowLeft,
  CalendarCheck,
  Monitor,
  type LucideIcon,
} from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { VelopassMark } from "@/components/VelopassMark";
import { LangSwitcher } from "@/components/LangSwitcher";
import { buildLocalizedHead } from "@/i18n/seo";

const searchSchema = z.object({
  type: fallback(z.enum(["rider", "shop"]), "rider").default("rider"),
});

export const Route = createFileRoute("/$lang/contact")({
  validateSearch: zodValidator(searchSchema),
  head: ({ params }) =>
    buildLocalizedHead({
      lang: params.lang,
      path: "contact",
      title: "Contact — Velopass",
      description:
        "Hulp nodig bij activatie, je Frame-ID of een gevonden fiets? Stuur het Velopass-team een bericht via WhatsApp.",
      ogDescription: "Kies een onderwerp en chat met het Velopass-team via WhatsApp.",
    }),
  component: ContactPage,
});

const WA_NUMBER = "32471601573";

const RIDER_ICONS: LucideIcon[] = [HelpCircle, Package, ScanLine];
const SHOP_ICONS: LucideIcon[] = [CalendarCheck, Monitor, HelpCircle];

type Suggestion = { title: string; desc: string; prefill: string };
type Shortcut = { title: string; desc: string; prefill: string };

type WaErrors = Partial<Record<"name" | "email", string>>;
type ShopErrors = Partial<Record<"name" | "company" | "email" | "subject" | "message", string>>;

const cardStyle: React.CSSProperties = {
  background: "var(--white)",
  border: "1px solid var(--border)",
  borderRadius: "var(--r-lg)",
  padding: "14px 16px",
  textAlign: "left",
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  gap: 6,
  transition: "transform 0.2s, box-shadow 0.2s, border-color 0.2s",
  fontFamily: "'DM Sans', sans-serif",
};

const iconBox: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 10,
  background: "rgba(46,204,138,0.12)",
  border: "1px solid rgba(46,204,138,0.25)",
  color: "var(--green-mid)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const waLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: 1.1,
  textTransform: "uppercase",
  color: "rgba(245,243,238,0.55)",
  marginBottom: 4,
};

const waInputStyle: React.CSSProperties = {
  width: "100%",
  background: "transparent",
  border: "1.5px solid rgba(245,243,238,0.18)",
  borderRadius: 8,
  padding: "8px 12px",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 14,
  color: "#F5F3EE",
  outline: "none",
  boxSizing: "border-box",
};

function ContactPage() {
  const lang = useCurrentLang();
  const { t } = useTranslation(["contact", "common"]);
  const { type } = useSearch({ from: "/$lang/contact" });
  const [activeTab, setActiveTab] = useState<"rider" | "shop">(type);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setActiveTab(type);
  }, [type]);

  const waSchema = useMemo(
    () =>
      z.object({
        name: z.string().trim().min(1, { message: t("errors.name_required") }).max(100),
        email: z
          .string()
          .trim()
          .min(1, { message: t("errors.email_required") })
          .email({ message: t("errors.email_invalid") })
          .max(255),
        phone: z.string().trim().max(30).optional(),
        note: z.string().trim().max(2000).optional(),
      }),
    [t],
  );

  const shopFormSchema = useMemo(
    () =>
      z.object({
        name: z.string().trim().min(1, { message: t("errors.name_required") }).max(100),
        company: z
          .string()
          .trim()
          .min(1, { message: t("errors.company_required") })
          .max(150),
        email: z
          .string()
          .trim()
          .min(1, { message: t("errors.email_required") })
          .email({ message: t("errors.email_invalid") })
          .max(255),
        phone: z.string().trim().max(30).optional(),
        subject: z.string().min(1, { message: t("errors.subject_required") }).max(120),
        message: z.string().trim().min(1, { message: t("errors.message_required") }).max(2000),
      }),
    [t],
  );

  // RIDER form state
  const [wa, setWa] = useState({ name: "", email: "", phone: "", note: "" });
  const [errors, setErrors] = useState<WaErrors>({});

  // SHOP form state
  const [shop, setShop] = useState({ name: "", company: "", email: "", phone: "", subject: "", message: "" });
  const [shopErrors, setShopErrors] = useState<ShopErrors>({});
  const [shopSent, setShopSent] = useState(false);

  const suggestionsRaw = t("rider.suggestions", { returnObjects: true });
  const suggestions: Suggestion[] = Array.isArray(suggestionsRaw) ? (suggestionsRaw as Suggestion[]) : [];

  const shortcutsRaw = t("shop.shortcuts", { returnObjects: true });
  const shortcuts: Shortcut[] = Array.isArray(shortcutsRaw) ? (shortcutsRaw as Shortcut[]) : [];

  const subjectsRaw = t("shop.subjects", { returnObjects: true });
  const subjects: string[] = Array.isArray(subjectsRaw) ? (subjectsRaw as string[]) : [];

  const sendWa = (e?: React.MouseEvent<HTMLAnchorElement>) => {
    const result = waSchema.safeParse(wa);
    if (!result.success) {
      e?.preventDefault();
      const fieldErrors: WaErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof WaErrors;
        if ((key === "name" || key === "email") && !fieldErrors[key]) {
          fieldErrors[key] = issue.message;
        }
      }
      setErrors(fieldErrors);
      toast.error(result.error.issues[0]?.message ?? t("errors.form_check"));
      const focusId = fieldErrors.name ? "wa-name" : fieldErrors.email ? "wa-email" : null;
      if (focusId) document.getElementById(focusId)?.focus();
      return;
    }
    setErrors({});
    // Anchor with target=_blank handles the navigation; nothing else to do.
  };

  const waHref = useMemo(() => {
    const text =
      `${t("rider.wa_message_intro")}\n\n` +
      `${t("rider.wa_message_name")}: ${wa.name}\n` +
      `${t("rider.wa_message_email")}: ${wa.email}\n` +
      (wa.phone ? `${t("rider.wa_message_phone")}: ${wa.phone}\n` : "") +
      (wa.note ? `\n${wa.note}\n` : "");
    return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
  }, [wa, t]);


  const pickSuggestion = (prefill: string) => {
    setWa((w) => ({ ...w, note: prefill }));
    const el = document.getElementById("wa-form");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => document.getElementById("wa-name")?.focus(), 400);
  };

  const sendShop = () => {
    const result = shopFormSchema.safeParse(shop);
    if (!result.success) {
      const fe: ShopErrors = {};
      for (const issue of result.error.issues) {
        const k = issue.path[0] as keyof ShopErrors;
        if (!fe[k]) fe[k] = issue.message;
      }
      setShopErrors(fe);
      toast.error(result.error.issues[0]?.message ?? t("errors.form_check"));
      return;
    }
    setShopErrors({});
    setShopSent(true);
    setShop({ name: "", company: "", email: "", phone: "", subject: "", message: "" });
  };

  // Map shop shortcut index -> subject index in the shop.subjects list.
  // 0 = Request a demo (subjects[0]), 1 = POS/integration (subjects[1]),
  // 2 = Already a partner — tech question (subjects[3]).
  const SHOP_SUBJECT_INDEX = [0, 1, 3];
  const pickShopShortcut = (idx: number) => {
    const subjectIdx = SHOP_SUBJECT_INDEX[idx] ?? 0;
    setShop((s) => ({
      ...s,
      subject: subjects[subjectIdx] ?? s.subject,
      message: shortcuts[idx]?.prefill ?? s.message,
    }));
    setShopErrors({});
    const el = document.getElementById("shop-form");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => document.getElementById("s-name")?.focus(), 400);
  };

  return (
    <>
      <div className={`nav-backdrop${navOpen ? " open" : ""}`} onClick={() => setNavOpen(false)} aria-hidden="true" />
      <nav className="vp-nav">
        <Link to="/$lang" params={{ lang }} className="nav-logo">
          <div className="logo-mark"><VelopassMark /></div>
          <span className="logo-text">velopass</span>
        </Link>
        <ul className={`nav-links${navOpen ? " open" : ""}`} onClick={() => setNavOpen(false)}>
          <li><Link to="/$lang" params={{ lang }} hash="wat-je-krijgt" hashScrollIntoView={{ behavior: "smooth", block: "start" }}>{t("common:nav.what_you_get")}</Link></li>
          <li><Link to="/$lang" params={{ lang }} hash="already-have-one" hashScrollIntoView={{ behavior: "smooth", block: "start" }}>{t("common:nav.already_have_one")}</Link></li>
          <li><Link to="/$lang" params={{ lang }} hash="order-sticker" hashScrollIntoView={{ behavior: "smooth", block: "start" }}>{t("common:nav.order_sticker")}</Link></li>
          <li><Link to="/$lang" params={{ lang }} hash="community" hashScrollIntoView={{ behavior: "smooth", block: "start" }}>{t("common:nav.community")}</Link></li>
          <li><Link to="/$lang/bike-check" params={{ lang }}>{t("common:nav.bike_check")}</Link></li>
          <li><Link to="/$lang/shop" params={{ lang }} style={{ color: "var(--green-mid)", display: "inline-flex", alignItems: "center", gap: 6 }}><ArrowUpRight size={15} strokeWidth={2.2} />{t("common:nav.for_professionals")}</Link></li>
        </ul>
        <div className="nav-actions" style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <LangSwitcher currentLang={lang} tone="light" />
          <a href="https://login.velopass.com/login?state=hKFo2SB5ODJtdjhZMGxXRGlPN1NVWFdQM3pqV3JUS1pFQTlkSaFupWxvZ2luo3RpZNkgM3R1ZXU4M2FxM3RqUk1FYVR3UUZCSTRhZV92dTlhRzmjY2lk2SBWak0xVFBUQUFFcG11aWhGNndYeEdGdVFybE5hVTY5MQ&client=VjM1TPTAAEpmuihF6wXxGFuQrlNaU691&protocol=oauth2&scope=openid%20profile%20email&audience=https%3A%2F%2Fcyclistapi.prod.velopass.com&redirect_uri=https%3A%2F%2Fapp.velopass.com%2Fdashboard&response_type=code&response_mode=query&nonce=a3hmZVl5aENNeU95d1U0SUlBaEM3NV9MbkZXNFdXRkg2c3RpOXJlMW5BUQ%3D%3D&code_challenge=5vSSWCjxdP-6B0z5HV38kaBGFWP4KSmv4gORKjvtzi0&code_challenge_method=S256&auth0Client=eyJuYW1lIjoiYXV0aDAtcmVhY3QiLCJ2ZXJzaW9uIjoiMi45LjAifQ%3D%3D#page=cyclist/login&method=standard&lng=nl-nl" className="btn-login">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M2 13c0-2.5 2.7-4 6-4s6 1.5 6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {t("common:nav.login")}
          </a>
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

      {/* BACK BUTTON */}
      <div className="back-btn-wrap">
        <button
          type="button"
          onClick={() => { if (window.history.length > 1) { window.history.back(); } else { window.location.href = "/"; } }}
          className="back-btn"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          {t("back")}
        </button>
      </div>
      <div style={{ background: "var(--bg)", paddingTop: 8, minHeight: "100vh" }}>
        {/* HEADER */}
        <section style={{ padding: "8px 6vw 8px", maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <h1
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(24px, 3vw, 36px)",
              lineHeight: 1.05,
              letterSpacing: "-1px",
              color: "var(--navy)",
              marginBottom: 6,
            }}
          >
            {t("header.title")}
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", maxWidth: 560, margin: "0 auto", lineHeight: 1.5 }}>
            {t("header.subtitle")}
          </p>
        </section>

        {/* TABS */}
        <section style={{ padding: "4px 6vw 0", maxWidth: 720, margin: "0 auto" }}>
          <div className="contact-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "rider"}
              onClick={() => setActiveTab("rider")}
              className={`contact-tab${activeTab === "rider" ? " active" : ""}`}
            >
              {t("tabs.rider")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "shop"}
              onClick={() => setActiveTab("shop")}
              className={`contact-tab${activeTab === "shop" ? " active" : ""}`}
            >
              {t("tabs.shop")}
            </button>
          </div>
        </section>

        {activeTab === "rider" ? (
          <RiderTab
            wa={wa}
            setWa={setWa}
            errors={errors}
            setErrors={setErrors}
            sendWa={sendWa}
            waHref={waHref}
            pickSuggestion={pickSuggestion}
            suggestions={suggestions}
            t={t}
          />
        ) : (
          <ShopTab
            shop={shop}
            setShop={setShop}
            shopErrors={shopErrors}
            setShopErrors={setShopErrors}
            sendShop={sendShop}
            shopSent={shopSent}
            shortcuts={shortcuts}
            subjects={subjects}
            pickShopShortcut={pickShopShortcut}
            t={t}
          />
        )}
        {/* WETTELIJKE GEGEVENS */}
        <section style={{ padding: "0 6vw 20px", maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.55, margin: 0 }}>
            {t("legal.line", { email: activeTab === "shop" ? "info@velopass.com" : "support@velopass.com" })}
          </p>
        </section>
      </div>

      <style>{`
        .back-btn-wrap { padding: 88px 6vw 0; max-width: 1100px; margin: 0 auto; }
        .back-btn { display: inline-flex; align-items: center; gap: 6px; font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 500; color: var(--text-muted); background: none; border: none; cursor: pointer; padding: 0; text-decoration: underline; text-underline-offset: 3px; }
        .contact-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; background: rgba(13,31,60,0.05); padding: 4px; border-radius: 10px; margin-bottom: 8px; }
        .contact-tab { padding: 8px 14px; border: none; background: transparent; font-family: 'DM Sans', sans-serif; font-weight: 500; font-size: 13px; color: rgba(13,31,60,0.55); border-radius: 8px; cursor: pointer; transition: all 0.18s ease; }
        .contact-tab.active { background: #2ECC8A; color: #0D1F3C; font-weight: 600; box-shadow: 0 4px 12px rgba(46,204,138,0.25); }
        .contact-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .contact-card { border: 1px solid var(--border); text-decoration: none; color: inherit; }
        .contact-card:hover { transform: translateY(-3px); box-shadow: 0 20px 40px rgba(13,31,60,0.08); border-color: rgba(46,204,138,0.4); }
        .wa-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .wa-grid input::placeholder, .wa-grid textarea::placeholder, .wa-grid select { color: rgba(245,243,238,0.55); }
        .wa-grid input:focus, .wa-grid textarea:focus, .wa-grid select:focus { border-color: #2ECC8A; }
        @media (max-width: 768px) {
          .back-btn-wrap { padding-top: 72px; }
          .back-btn { font-size: 12px; }
          .contact-cards { grid-template-columns: 1fr; }
          .wa-grid { grid-template-columns: 1fr; }
          .contact-tabs { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
}

type TFn = ReturnType<typeof useTranslation>["t"];

/* ============== RIDER TAB ============== */
function RiderTab({
  wa, setWa, errors, setErrors, sendWa, waHref, pickSuggestion, suggestions, t,
}: {
  wa: { name: string; email: string; phone: string; note: string };
  setWa: React.Dispatch<React.SetStateAction<{ name: string; email: string; phone: string; note: string }>>;
  errors: WaErrors;
  setErrors: React.Dispatch<React.SetStateAction<WaErrors>>;
  sendWa: (e?: React.MouseEvent<HTMLAnchorElement>) => void;
  waHref: string;
  pickSuggestion: (prefill: string) => void;
  suggestions: Suggestion[];
  t: TFn;
}) {
  return (
    <>
      {/* SUGGESTIES */}
      <section style={{ padding: "4px 6vw 12px", maxWidth: 1100, margin: "0 auto" }}>
        <p style={{ textAlign: "center", fontSize: 11, letterSpacing: 1.3, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
          {t("cards_eyebrow")}
        </p>
        <div className="contact-cards">
          {suggestions.map((s, idx) => {
            const Icon = RIDER_ICONS[idx] ?? HelpCircle;
            return (
              <button
                key={s.title}
                type="button"
                onClick={() => pickSuggestion(s.prefill)}
                style={cardStyle}
                className="contact-card"
              >
                <div style={iconBox}><Icon size={18} strokeWidth={1.8} /></div>
                <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: "var(--navy)", letterSpacing: "-0.2px", margin: 0 }}>
                  {s.title}
                </h3>
                <p style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.45, flex: 1, margin: 0 }}>
                  {s.desc}
                </p>
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--green-mid)" }}>{t("rider.pick_subject")}</span>
              </button>
            );
          })}
        </div>
      </section>
      {/* WHATSAPP FORM */}
      <section id="wa-form" style={{ padding: "8px 6vw 16px", maxWidth: 720, margin: "0 auto" }}>
        <div
          style={{
            background: "#0D1F3C",
            color: "#F5F3EE",
            borderRadius: 14,
            padding: "20px 24px",
            boxShadow: "0 20px 50px rgba(13,31,60,0.15)",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: "-0.5px", marginBottom: 4, marginTop: 0 }}>
            {t("rider.form_title")}
          </h2>
          <p style={{ fontSize: 13, color: "rgba(245,243,238,0.7)", lineHeight: 1.45, marginBottom: 14, marginTop: 0 }}>
            {t("rider.form_subtitle")}
          </p>

          <div className="wa-grid">
            <div>
              <label htmlFor="wa-name" style={waLabelStyle}>{t("form.name")} <span style={{ color: "#2ECC8A" }}>*</span></label>
              <input
                id="wa-name"
                type="text"
                required
                maxLength={100}
                value={wa.name}
                onChange={(e) => {
                  setWa({ ...wa, name: e.target.value });
                  if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
                }}
                placeholder={t("form.name_placeholder")}
                aria-invalid={!!errors.name}
                style={waInputStyle}
              />
              {errors.name && <p style={{ marginTop: 6, fontSize: 13, color: "#ff8a8a" }}>{errors.name}</p>}
            </div>
            <div>
              <label htmlFor="wa-phone" style={waLabelStyle}>{t("form.phone")}</label>
              <input
                id="wa-phone"
                type="tel"
                maxLength={30}
                value={wa.phone}
                onChange={(e) => setWa({ ...wa, phone: e.target.value })}
                placeholder={t("form.phone_placeholder")}
                style={waInputStyle}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="wa-email" style={waLabelStyle}>{t("form.email")} <span style={{ color: "#2ECC8A" }}>*</span></label>
              <input
                id="wa-email"
                type="email"
                required
                maxLength={255}
                value={wa.email}
                onChange={(e) => {
                  setWa({ ...wa, email: e.target.value });
                  if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
                }}
                placeholder={t("form.email_placeholder_rider")}
                aria-invalid={!!errors.email}
                style={waInputStyle}
              />
              {errors.email && <p style={{ marginTop: 6, fontSize: 13, color: "#ff8a8a" }}>{errors.email}</p>}
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="wa-note" style={waLabelStyle}>{t("form.note")}</label>
              <textarea
                id="wa-note"
                rows={3}
                maxLength={2000}
                value={wa.note}
                onChange={(e) => setWa({ ...wa, note: e.target.value })}
                placeholder={t("form.note_placeholder")}
                style={{ ...waInputStyle, resize: "vertical", lineHeight: 1.5 }}
              />
            </div>
          </div>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={sendWa}
            style={{
              marginTop: 14,
              width: "100%",
              boxSizing: "border-box",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              background: "#2ECC8A",
              color: "#0D1F3C",
              border: "none",
              padding: "11px 20px",
              borderRadius: 10,
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: "1.4px",
              textTransform: "uppercase",
              cursor: "pointer",
              textDecoration: "none",
            }}
          >
            <MessageCircle size={16} strokeWidth={2.2} />
            {t("form.send_whatsapp")}
          </a>

          <p style={{ marginTop: 10, textAlign: "center", fontSize: 12, color: "rgba(245,243,238,0.6)" }}>
            {t("rider.email_alt_prefix")}{" "}
            <a href="mailto:support@velopass.com" style={{ color: "#2ECC8A", textDecoration: "none", fontWeight: 500 }}>
              support@velopass.com
            </a>
          </p>
        </div>
      </section>
    </>
  );
}

/* ============== SHOP TAB ============== */
function ShopTab({
  shop, setShop, shopErrors, setShopErrors, sendShop, shopSent, shortcuts, subjects, pickShopShortcut, t,
}: {
  shop: { name: string; company: string; email: string; phone: string; subject: string; message: string };
  setShop: React.Dispatch<React.SetStateAction<{ name: string; company: string; email: string; phone: string; subject: string; message: string }>>;
  shopErrors: ShopErrors;
  setShopErrors: React.Dispatch<React.SetStateAction<ShopErrors>>;
  sendShop: () => void;
  shopSent: boolean;
  shortcuts: Shortcut[];
  subjects: string[];
  pickShopShortcut: (idx: number) => void;
  t: TFn;
}) {
  return (
    <>
      <section style={{ padding: "4px 6vw 12px", maxWidth: 1100, margin: "0 auto" }}>
        <p style={{ textAlign: "center", fontSize: 11, letterSpacing: 1.3, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
          {t("cards_eyebrow")}
        </p>
        <div className="contact-cards">
          {shortcuts.map((s, idx) => {
            const Icon = SHOP_ICONS[idx] ?? HelpCircle;
            return (
              <button
                key={s.title}
                type="button"
                onClick={() => pickShopShortcut(idx)}
                style={cardStyle}
                className="contact-card"
              >
                <div style={iconBox}><Icon size={18} strokeWidth={1.8} /></div>
                <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: "var(--navy)", letterSpacing: "-0.2px", margin: 0 }}>
                  {s.title}
                </h3>
                <p style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.45, flex: 1, margin: 0 }}>
                  {s.desc}
                </p>
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--green-mid)" }}>{t("shop.pick_subject")}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section id="shop-form" style={{ padding: "8px 6vw 16px", maxWidth: 720, margin: "0 auto" }}>

        <div
          style={{
            background: "#0D1F3C",
            color: "#F5F3EE",
            borderRadius: 14,
            padding: "20px 24px",
            boxShadow: "0 20px 50px rgba(13,31,60,0.15)",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: "-0.5px", marginBottom: 4, marginTop: 0 }}>
            {t("shop.form_title")}
          </h2>
          <p style={{ fontSize: 13, color: "rgba(245,243,238,0.7)", lineHeight: 1.45, marginBottom: 14, marginTop: 0 }}>
            {t("shop.form_subtitle")}
          </p>

          {shopSent && (
            <div
              role="status"
              style={{
                background: "rgba(46,204,138,0.18)",
                border: "1px solid rgba(46,204,138,0.5)",
                color: "#F5F3EE",
                padding: "14px 16px",
                borderRadius: 10,
                marginBottom: 20,
                fontSize: 14,
              }}
            >
              {t("shop.success")}
            </div>
          )}

          <div className="wa-grid">
            <div>
              <label htmlFor="s-name" style={waLabelStyle}>{t("form.name")} <span style={{ color: "#2ECC8A" }}>*</span></label>
              <input
                id="s-name" type="text" required maxLength={100} value={shop.name}
                onChange={(e) => { setShop({ ...shop, name: e.target.value }); if (shopErrors.name) setShopErrors((p) => ({ ...p, name: undefined })); }}
                placeholder={t("form.name_placeholder")} style={waInputStyle}
              />
              {shopErrors.name && <p style={{ marginTop: 6, fontSize: 13, color: "#ff8a8a" }}>{shopErrors.name}</p>}
            </div>
            <div>
              <label htmlFor="s-company" style={{ ...waLabelStyle, whiteSpace: "nowrap", letterSpacing: 0.8 }}>{t("form.company")} <span style={{ color: "#2ECC8A" }}>*</span></label>
              <input
                id="s-company" type="text" required maxLength={150} value={shop.company}
                onChange={(e) => { setShop({ ...shop, company: e.target.value }); if (shopErrors.company) setShopErrors((p) => ({ ...p, company: undefined })); }}
                placeholder={t("form.company_placeholder")} style={waInputStyle}
              />
              {shopErrors.company && <p style={{ marginTop: 6, fontSize: 13, color: "#ff8a8a" }}>{shopErrors.company}</p>}
            </div>
            <div>
              <label htmlFor="s-email" style={waLabelStyle}>{t("form.email")} <span style={{ color: "#2ECC8A" }}>*</span></label>
              <input
                id="s-email" type="email" required maxLength={255} value={shop.email}
                onChange={(e) => { setShop({ ...shop, email: e.target.value }); if (shopErrors.email) setShopErrors((p) => ({ ...p, email: undefined })); }}
                placeholder={t("form.email_placeholder_shop")} style={waInputStyle}
              />
              {shopErrors.email && <p style={{ marginTop: 6, fontSize: 13, color: "#ff8a8a" }}>{shopErrors.email}</p>}
            </div>
            <div>
              <label htmlFor="s-phone" style={waLabelStyle}>{t("form.phone")}</label>
              <input
                id="s-phone" type="tel" maxLength={30} value={shop.phone}
                onChange={(e) => setShop({ ...shop, phone: e.target.value })}
                placeholder={t("form.phone_placeholder")} style={waInputStyle}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="s-subject" style={waLabelStyle}>{t("form.subject")} <span style={{ color: "#2ECC8A" }}>*</span></label>
              <select
                id="s-subject" value={shop.subject}
                onChange={(e) => { setShop({ ...shop, subject: e.target.value }); if (shopErrors.subject) setShopErrors((p) => ({ ...p, subject: undefined })); }}
                style={waInputStyle}
              >
                <option value="" style={{ background: "#0D1F3C" }}>{t("shop.subject_placeholder")}</option>
                {subjects.map((s) => (
                  <option key={s} value={s} style={{ background: "#0D1F3C" }}>{s}</option>
                ))}
              </select>
              {shopErrors.subject && <p style={{ marginTop: 6, fontSize: 13, color: "#ff8a8a" }}>{shopErrors.subject}</p>}
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="s-message" style={waLabelStyle}>{t("form.message")} <span style={{ color: "#2ECC8A" }}>*</span></label>
              <textarea
                id="s-message" rows={3} maxLength={2000} required value={shop.message}
                onChange={(e) => { setShop({ ...shop, message: e.target.value }); if (shopErrors.message) setShopErrors((p) => ({ ...p, message: undefined })); }}
                placeholder={t("form.note_placeholder")}
                style={{ ...waInputStyle, resize: "vertical", lineHeight: 1.5 }}
              />
              {shopErrors.message && <p style={{ marginTop: 6, fontSize: 13, color: "#ff8a8a" }}>{shopErrors.message}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={sendShop}
            style={{
              marginTop: 14,
              width: "100%",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              background: "#2ECC8A",
              color: "#0D1F3C",
              border: "none",
              padding: "11px 20px",
              borderRadius: 10,
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: "1.4px",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            <MessageCircle size={16} strokeWidth={2.2} />
            {t("form.send_whatsapp")}
          </button>
        </div>
      </section>
    </>
  );
}
