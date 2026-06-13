import { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useCurrentLang } from "@/i18n/useCurrentLang";
import { AlertTriangle } from "lucide-react";
import shopsData from "@/data/shops.json";

const ShopFinderMap = lazy(() => import("./ShopFinderMap"));

const totalActive = (shopsData as Array<{ status: string }>).filter((s) => s.status === "active").length;

export function ShopFinder() {
  const lang = useCurrentLang();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <section className="shop-finder" id="community">
        <div className="sf-hero">
          <p className="eyebrow" style={{ color: "#2ECC8A" }}>De Velopass Community</p>
          <h2 className="sf-headline">Jouw fiets is nooit alleen.</h2>
          <p className="sf-subhead"><strong style={{ color: "#0D1F3C", fontWeight: 600 }}>{totalActive.toLocaleString("nl-BE")}+ winkels</strong>, fietsers en politie maken deel uit van de Velopass Community. Scant iemand jouw Frame-ID? Dan krijg jij meteen een seintje.</p>
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
