import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

interface FooterProps {
  variant?: "default" | "pro";
}

export function Footer({ variant = "default" }: FooterProps) {
  if (variant === "pro") {
    return (
      <footer className="vp-footer darker">
        <div>
          <div className="flogo">
            velopass<span style={{ color: "var(--green)" }}>pro</span>
          </div>
          <div className="ftagline">Every bike. A customer. For life.</div>
        </div>
        <ul className="flinks">
          <li><a href="#">Privacy</a></li>
          <li><a href="#">Voorwaarden</a></li>
          <li><Link to="/contact">Contact</Link></li>
          <li><Link to="/" hash="faq">Veelgestelde vragen</Link></li>
          <li><a href="#">Inloggen</a></li>
        </ul>
        <div className="fswitch">
          <Link
            to="/"
            style={{ color: "var(--green)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <ArrowUpRight size={15} strokeWidth={2.2} />
            Voor fietsers
          </Link>
        </div>
        <div className="fcopy">© 2026 Velopass</div>
        <div
          style={{
            gridColumn: "1 / -1",
            textAlign: "center",
            fontSize: 12,
            color: "rgba(255,255,255,0.25)",
            marginTop: 16,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Velopass BV · Stokerijstraat 29/bus a1, 2110 Wijnegem · BTW BE0777.359.681
        </div>
      </footer>
    );
  }

  return (
    <footer className="vp-footer">
      <div>
        <div className="flogo">velopass</div>
        <div className="ftagline">Altijd op de fiets. Alles geregeld.</div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 3 }}>
          Frame-ID&apos;s beschikbaar in heel Europa · Fietswinkels actief in BE, NL en FR
        </div>
      </div>
      <ul className="flinks">
        <li><a href="#">Privacy</a></li>
        <li><a href="#">Voorwaarden</a></li>
        <li><Link to="/contact">Contact</Link></li>
        <li><Link to="/bikesearch">Fiets controleren</Link></li>
        <li><Link to="/" hash="faq">Veelgestelde vragen</Link></li>
      </ul>
      <div className="fcopy">© 2026 Velopass</div>
      <div
        style={{
          gridColumn: "1 / -1",
          textAlign: "center",
          fontSize: 12,
          color: "rgba(255,255,255,0.25)",
          marginTop: 16,
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        Velopass BV · Stokerijstraat 29/bus a1, 2110 Wijnegem · BTW BE0777.359.681
      </div>
    </footer>
  );
}
