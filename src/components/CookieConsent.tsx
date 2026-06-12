import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useCurrentLang } from "@/i18n/useCurrentLang";

export function CookieConsent() {
  const lang = useCurrentLang();
  const { t } = useTranslation("common");
  const [visible, setVisible] = useState(false);


  useEffect(() => {
    const consent = localStorage.getItem("vp_cookie_consent");
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("vp_cookie_consent", JSON.stringify({
      functional: true,
      analytics: true,
      timestamp: Date.now(),
    }));
    setVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem("vp_cookie_consent", JSON.stringify({
      functional: true,
      analytics: false,
      timestamp: Date.now(),
    }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 300,
        background: "rgba(13, 31, 60, 0.97)",
        backdropFilter: "blur(12px)",
        borderTop: "1px solid rgba(46,204,138,0.15)",
        padding: "20px 6vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 24,
        flexWrap: "wrap",
      }}
    >
      <div style={{ flex: 1, minWidth: 280 }}>
        <p
          style={{
            fontSize: 14,
            color: "rgba(255,255,255,0.85)",
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          {t("cookie_consent.message")}{" "}
          <Link
            to="/$lang/privacy"
            params={{ lang }}
            style={{
              color: "var(--green)",
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            {t("cookie_consent.privacy_link")}
          </Link>{" "}
          {t("cookie_consent.message_suffix")}
        </p>

      </div>
      <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
        <button
          onClick={handleDecline}
          style={{
            fontSize: 13,
            fontWeight: 500,
            background: "transparent",
            color: "rgba(255,255,255,0.7)",
            border: "1.5px solid rgba(255,255,255,0.25)",
            padding: "10px 20px",
            borderRadius: "var(--r-md)",
            cursor: "pointer",
            transition: "all 0.2s",
            fontFamily: "'DM Sans', sans-serif",
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.5)";
            (e.target as HTMLButtonElement).style.color = "#fff";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.25)";
            (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.7)";
          }}
        >
          {t("cookie_consent.decline")}
        </button>
        <button
          onClick={handleAccept}
          style={{
            fontSize: 13,
            fontWeight: 500,
            background: "var(--green)",
            color: "var(--navy)",
            border: "none",
            padding: "10px 20px",
            borderRadius: "var(--r-md)",
            cursor: "pointer",
            transition: "all 0.2s",
            fontFamily: "'DM Sans', sans-serif",
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.background = "#25B87A";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.background = "var(--green)";
          }}
        >
          {t("cookie_consent.accept")}
        </button>
      </div>
    </div>
  );
}
