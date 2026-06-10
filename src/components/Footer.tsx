import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCurrentLang } from "@/i18n/useCurrentLang";

interface FooterProps {
  variant?: "default" | "pro";
}

const APP_LOGIN = "https://login.velopass.com/login?state=hKFo2SB5ODJtdjhZMGxXRGlPN1NVWFdQM3pqV3JUS1pFQTlkSaFupWxvZ2luo3RpZNkgM3R1ZXU4M2FxM3RqUk1FYVR3UUZCSTRhZV92dTlhRzmjY2lk2SBWak0xVFBUQUFFcG11aWhGNndYeEdGdVFybE5hVTY5MQ&client=VjM1TPTAAEpmuihF6wXxGFuQrlNaU691&protocol=oauth2&scope=openid%20profile%20email&audience=https%3A%2F%2Fcyclistapi.prod.velopass.com&redirect_uri=https%3A%2F%2Fapp.velopass.com%2Fdashboard&response_type=code&response_mode=query&nonce=a3hmZVl5aENNeU95d1U0SUlBaEM3NV9MbkZXNFdXRkg2c3RpOXJlMW5BUQ%3D%3D&code_challenge=5vSSWCjxdP-6B0z5HV38kaBGFWP4KSmv4gORKjvtzi0&code_challenge_method=S256&auth0Client=eyJuYW1lIjoiYXV0aDAtcmVhY3QiLCJ2ZXJzaW9uIjoiMi45LjAifQ%3D%3D#page=cyclist/login&method=standard&lng=nl-nl";

export function Footer({ variant = "default" }: FooterProps) {
  const lang = useCurrentLang();
  const { t } = useTranslation("common");

  if (variant === "pro") {
    return (
      <footer className="vp-footer darker">
        <div>
          <div className="flogo">
            velopass<span style={{ color: "var(--green)" }}>pro</span>
          </div>
          <div className="ftagline">{t("footer.tagline_pro")}</div>
        </div>
        <ul className="flinks">
          <li><Link to="/$lang/privacy" params={{ lang }}>{t("footer.privacy")}</Link></li>
          <li><a href="#">{t("footer.terms")}</a></li>
          <li><Link to="/$lang/contact" params={{ lang }}>{t("footer.contact")}</Link></li>
          <li><Link to="/$lang" params={{ lang }} hash="faq">{t("footer.faq")}</Link></li>
          <li><a href={APP_LOGIN}>{t("nav.login")}</a></li>
        </ul>
        <div className="fswitch">
          <Link
            to="/$lang"
            params={{ lang }}
            style={{ color: "var(--green)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <ArrowUpRight size={15} strokeWidth={2.2} />
            {t("footer.for_cyclists")}
          </Link>
        </div>
        <div className="fcopy">{t("footer.copy")}</div>
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
          {t("footer.company_line")}
        </div>
      </footer>
    );
  }

  return (
    <footer className="vp-footer">
      <div>
        <div className="flogo">velopass</div>
        <div className="ftagline">{t("footer.tagline")}</div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 3 }}>
          {t("footer.coverage")}
        </div>
      </div>
      <ul className="flinks">
        <li><Link to="/$lang/privacy" params={{ lang }}>{t("footer.privacy")}</Link></li>
        <li><a href="#">{t("footer.terms")}</a></li>
        <li><Link to="/$lang/contact" params={{ lang }}>{t("footer.contact")}</Link></li>
        <li><Link to="/$lang/bike-check" params={{ lang }}>{t("footer.bike_check")}</Link></li>
        <li><Link to="/$lang/stolen" params={{ lang }}>{t("footer.stolen")}</Link></li>
        <li><Link to="/$lang" params={{ lang }} hash="faq">{t("footer.faq")}</Link></li>
      </ul>
      <div className="fcopy">{t("footer.copy")}</div>
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
        {t("footer.company_line")}
      </div>
    </footer>
  );
}
