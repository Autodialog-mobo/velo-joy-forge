import { Link } from "@tanstack/react-router";
import { VelopassMark } from "@/components/VelopassMark";
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
        <div className="stk-soon">Binnenkort beschikbaar</div>
        <div className="stk-actions">
          <Link to="/$lang/shop" params={{ lang }} className="stk-btn-ghost">← Alle stakeholders</Link>
          <a href="mailto:info@velopass.com" className="stk-btn">Praat met ons →</a>
        </div>
      </div>
    </main>
  );
}
