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
          <li><Link to="/privacy">Privacy</Link></li>
          <li><a href="#">Voorwaarden</a></li>
          <li><Link to="/contact">Contact</Link></li>
          <li><Link to="/" hash="faq">Veelgestelde vragen</Link></li>
          <li><a href="https://login.velopass.com/login?state=hKFo2SB5ODJtdjhZMGxXRGlPN1NVWFdQM3pqV3JUS1pFQTlkSaFupWxvZ2luo3RpZNkgM3R1ZXU4M2FxM3RqUk1FYVR3UUZCSTRhZV92dTlhRzmjY2lk2SBWak0xVFBUQUFFcG11aWhGNndYeEdGdVFybE5hVTY5MQ&client=VjM1TPTAAEpmuihF6wXxGFuQrlNaU691&protocol=oauth2&scope=openid%20profile%20email&audience=https%3A%2F%2Fcyclistapi.prod.velopass.com&redirect_uri=https%3A%2F%2Fapp.velopass.com%2Fdashboard&response_type=code&response_mode=query&nonce=a3hmZVl5aENNeU95d1U0SUlBaEM3NV9MbkZXNFdXRkg2c3RpOXJlMW5BUQ%3D%3D&code_challenge=5vSSWCjxdP-6B0z5HV38kaBGFWP4KSmv4gORKjvtzi0&code_challenge_method=S256&auth0Client=eyJuYW1lIjoiYXV0aDAtcmVhY3QiLCJ2ZXJzaW9uIjoiMi45LjAifQ%3D%3D#page=cyclist/login&method=standard&lng=nl-nl">Inloggen</a></li>
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
        <li><Link to="/privacy">Privacy</Link></li>
        <li><a href="#">Voorwaarden</a></li>
        <li><Link to="/contact">Contact</Link></li>
        <li><Link to="/bike-check">Fiets controleren</Link></li>
        <li><Link to="/stolen">Fiets gestolen?</Link></li>
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
