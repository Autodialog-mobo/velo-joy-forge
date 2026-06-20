import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCurrentLang } from "@/i18n/useCurrentLang";

interface FooterProps {
  variant?: "default" | "pro";
}

const APP_LOGIN = "https://app.velopass.com";

export function Footer({ variant = "default" }: FooterProps) {
  const lang = useCurrentLang();
  const { t } = useTranslation("common");

  const scrollToFaq = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById("faq")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  };

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
          <li><Link to="/$lang/contact" params={{ lang }} search={{ type: "shop" }}>{t("footer.contact")}</Link></li>
          <li><Link to="/$lang" params={{ lang }} hash="faq" onClick={scrollToFaq}>{t("footer.faq")}</Link></li>
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
        <li><Link to="/$lang/contact" params={{ lang }} search={{ type: "rider" }}>{t("footer.contact")}</Link></li>
        <li><Link to="/$lang/bike-check" params={{ lang }}>{t("footer.bike_check")}</Link></li>
        <li><Link to="/$lang/stolen" params={{ lang }}>{t("footer.stolen")}</Link></li>
        <li><Link to="/$lang" params={{ lang }} hash="faq" onClick={scrollToFaq}>{t("footer.faq")}</Link></li>
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
