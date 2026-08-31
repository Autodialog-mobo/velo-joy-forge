import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Trans, useTranslation } from "react-i18next";
import { useCurrentLang } from "@/i18n/useCurrentLang";
import { AlertTriangle } from "lucide-react";
import { useActiveShopCount } from "@/lib/active-shop-count";

const ShopFinderMap = lazy(() => import("./ShopFinderMap"));

export function ShopFinder() {
  const lang = useCurrentLang();
  const { t } = useTranslation("home");
  const totalActive = useActiveShopCount();
  const [mounted, setMounted] = useState(false);
  const placeholderRef = useRef<HTMLElement | null>(null);

  // Mobiel: de kaart (Leaflet + tiles) is zwaar en staat ver onder de vouw.
  // We laden hem pas wanneer de sectie in de buurt van het scherm komt.
  useEffect(() => {
    const el = placeholderRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setMounted(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setMounted(true);
          io.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (!mounted) {

    return (
      <section className="shop-finder scroll-target" id="community">
        <div className="sf-hero">
          <p className="eyebrow" style={{ color: "#2ECC8A" }}>{t("community.eyebrow")}</p>
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
            {t("community.stolen_link")}
          </Link>
        </div>
        <p className="sec-sub" style={{ marginTop: 32 }}>{t("community.map_loading")}</p>
      </section>
    );
  }

  return (
    <Suspense
      fallback={
        <section className="shop-finder scroll-target" id="community">
          <p className="eyebrow">{t("community.eyebrow")}</p>
          <p className="sec-sub">{t("community.map_loading")}</p>
        </section>
      }
    >
      <ShopFinderMap />
    </Suspense>
  );
}
