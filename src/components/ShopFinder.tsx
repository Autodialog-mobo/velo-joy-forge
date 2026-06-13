import { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Trans, useTranslation } from "react-i18next";
import { useCurrentLang } from "@/i18n/useCurrentLang";
import { AlertTriangle } from "lucide-react";
import shopsData from "@/data/shops.json";

const ShopFinderMap = lazy(() => import("./ShopFinderMap"));

const totalActive = (shopsData as Array<{ status: string }>).filter((s) => s.status === "active").length;

export function ShopFinder() {
  const lang = useCurrentLang();
  const { t } = useTranslation("home");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <section className="shop-finder" id="community">
        <div className="sf-hero">
          <p className="eyebrow" style={{ color: "#2ECC8A" }}>De Velopass Community</p>
          <h2 className="sf-headline">{t("community.headline")}</h2>
          <p className="sf-subhead">
            <Trans
              i18nKey="community.subhead"
              ns="home"
              values={{
                count: totalActive.toLocaleString(lang === "en" ? "en-GB" : lang === "fr" ? "fr-BE" : lang === "de" ? "de-DE" : "nl-BE"),
                unit: t("community.unit"),
              }}
              components={[<strong style={{ color: "#0D1F3C", fontWeight: 600 }} />]}
            />
          </p>
        </div>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Link
            to="/$lang/stolen"
            params={{ lang }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 500,
              fontSize: 14,
              color: "#F59E0B",
              background: "rgba(245,158,11,0.1)",
              border: "1px solid #F59E0B",
              borderRadius: 8,
              padding: "10px 20px",
              textDecoration: "none",
            }}
          >
            <AlertTriangle size={16} />
            Fiets gestolen of vermist? Volg ons stappenplan →
          </Link>
        </div>
        <p className="sec-sub" style={{ marginTop: 32 }}>Kaart laden...</p>
      </section>
    );
  }

  return (
    <Suspense
      fallback={
        <section className="shop-finder" id="community">
          <p className="eyebrow">De Velopass Community</p>
          <p className="sec-sub">Kaart laden...</p>
        </section>
      }
    >
      <ShopFinderMap />
    </Suspense>
  );
}
