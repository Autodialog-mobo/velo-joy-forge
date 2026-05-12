import { lazy, Suspense, useEffect, useState } from "react";

const ShopFinderMap = lazy(() => import("./ShopFinderMap"));

export function ShopFinder() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <section className="shop-finder" id="vind-winkel">
        <p className="eyebrow">Vind een Velopass fietswinkel</p>
        <h2 className="sec-title">Aangesloten fietswinkels</h2>
        <p className="sec-sub">Kaart laden...</p>
      </section>
    );
  }

  return (
    <Suspense
      fallback={
        <section className="shop-finder" id="vind-winkel">
          <p className="eyebrow">Vind een Velopass fietswinkel</p>
          <p className="sec-sub">Kaart laden...</p>
        </section>
      }
    >
      <ShopFinderMap />
    </Suspense>
  );
}
