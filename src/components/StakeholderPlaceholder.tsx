import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { VelopassMark } from "@/components/VelopassMark";
import { LangSwitcher } from "@/components/LangSwitcher";
import { useCurrentLang } from "@/i18n/useCurrentLang";

export function StakeholderPlaceholder({
  eyebrow,
  title,
  intro,
}: {
  eyebrow: string;
  title: string;
  intro: string;
}) {
  const lang = useCurrentLang();
  const { t } = useTranslation("common");

  return (
    <main className="stk-placeholder">
      <Link to="/$lang" params={{ lang }} className="stk-logo" aria-label="Velopass">
        <div className="stk-logo-mark"><VelopassMark /></div>
        <span className="stk-logo-text">velopass</span>
      </Link>
      <div className="stk-card">
        <span className="stk-eyebrow">{eyebrow}</span>
        <h1 className="stk-title">{title}</h1>
        <p className="stk-intro">{intro}</p>
        <div className="stk-soon">{t("placeholders.soon")}</div>
        <div className="stk-actions">
          <Link to="/$lang/shop" params={{ lang }} className="stk-btn-ghost">{t("placeholders.back_to_stakeholders")}</Link>
          <a href="mailto:info@velopass.com" className="stk-btn">{t("placeholders.talk_to_us")}</a>
        </div>
      </div>
    </main>
  );
}
