import { createFileRoute } from "@tanstack/react-router";
import { useCurrentLang } from "@/i18n/useCurrentLang";
import { VelopassMark } from "@/components/VelopassMark";

export const Route = createFileRoute("/$lang/pro")({
  head: () => ({
    meta: [
      { title: "Velopass Pro — Partnerportaal" },
      {
        name: "description",
        content: "Log in om toegang te krijgen tot jouw Velopass-werkomgeving.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: PartnerLogin,
});

function PartnerLogin() {
  return (
    <main className="partner-login">
      <div className="pl-card">
        <a href={`/${lang}`} className="pl-logo" aria-label="Velopass Pro">
          <div className="pl-logo-mark"><VelopassMark /></div>
          <span className="pl-logo-text">velopass<span className="pl-logo-pro">pro</span></span>
        </a>
        <h1 className="pl-title">Partnerportaal</h1>
        <p className="pl-sub">Log in om toegang te krijgen tot jouw Velopass-werkomgeving.</p>
        <a href="https://app.velopass.pro" className="pl-btn">Inloggen →</a>
        <a href={`/${lang}/shop`} className="pl-foot">Nog geen partner? Lees meer op velopass.com/shop →</a>
      </div>
    </main>
  );
}
