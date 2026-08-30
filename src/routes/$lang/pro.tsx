import { createFileRoute, Link } from "@tanstack/react-router";
import { useCurrentLang } from "@/i18n/useCurrentLang";
import { VelopassMark } from "@/components/VelopassMark";
import { buildLocalizedHead } from "@/i18n/seo";
import { isLang, DEFAULT_LANG, type Lang } from "@/i18n/config";

const PRO_META: Record<Lang, { title: string; description: string }> = {
  nl: {
    title: "Velopass Pro — Partnerportaal",
    description: "Log in om toegang te krijgen tot jouw Velopass-werkomgeving.",
  },
  en: {
    title: "Velopass Pro — Partner portal",
    description: "Log in to access your Velopass workspace.",
  },
  fr: {
    title: "Velopass Pro — Portail partenaire",
    description: "Connecte-toi pour accéder à ton espace de travail Velopass.",
  },
  de: {
    title: "Velopass Pro — Partnerportal",
    description: "Melde dich an, um auf deinen Velopass-Arbeitsbereich zuzugreifen.",
  },
  es: {
    title: "Velopass Pro — Portal de socios",
    description: "Inicia sesión para acceder a tu espacio de trabajo Velopass.",
  },
};

export const Route = createFileRoute("/$lang/pro")({
  head: ({ params }) => {
    const lang: Lang = isLang(params.lang) ? params.lang : DEFAULT_LANG;
    const m = PRO_META[lang];
    return buildLocalizedHead({
      lang,
      path: "pro",
      title: m.title,
      description: m.description,
      noindex: true,
    });
  },
  component: PartnerLogin,
});

function PartnerLogin() {
  const lang = useCurrentLang();
  return (
    <div className="partner-login">
      <div className="pl-card">
        <Link to="/$lang" params={{ lang }} className="pl-logo" aria-label="Velopass Pro">
          <div className="pl-logo-mark"><VelopassMark /></div>
          <span className="pl-logo-text">velopass<span className="pl-logo-pro">pro</span></span>
        </Link>
        <h1 className="pl-title">Partnerportaal</h1>
        <p className="pl-sub">Log in om toegang te krijgen tot jouw Velopass-werkomgeving.</p>
        <a href="https://app.velopass.pro" className="pl-btn">Inloggen →</a>
        <a href={`/${lang}/shop`} className="pl-foot">Nog geen partner? Lees meer op velopass.com/shop →</a>
      </div>
    </div>
  );
}
