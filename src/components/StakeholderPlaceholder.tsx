import { Link } from "@tanstack/react-router";
import { VelopassMark } from "@/components/VelopassMark";

export function StakeholderPlaceholder({
  eyebrow,
  title,
  intro,
}: {
  eyebrow: string;
  title: string;
  intro: string;
}) {
  return (
    <main className="stk-placeholder">
      <Link to="/" className="stk-logo" aria-label="Velopass">
        <div className="stk-logo-mark"><VelopassMark /></div>
        <span className="stk-logo-text">velopass</span>
      </Link>
      <div className="stk-card">
        <span className="stk-eyebrow">{eyebrow}</span>
        <h1 className="stk-title">{title}</h1>
        <p className="stk-intro">{intro}</p>
        <div className="stk-soon">Binnenkort beschikbaar</div>
        <div className="stk-actions">
          <Link to="/professionals" className="stk-btn-ghost">← Alle stakeholders</Link>
          <a href="mailto:info@velopass.com" className="stk-btn">Praat met ons →</a>
        </div>
      </div>
    </main>
  );
}
