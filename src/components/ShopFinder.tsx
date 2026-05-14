import { lazy, Suspense, useEffect, useState } from "react";

const ShopFinderMap = lazy(() => import("./ShopFinderMap"));

export function ShopFinder() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <section className="shop-finder" id="community">
        <div className="sf-hero">
          <p className="eyebrow" style={{ color: "#2ECC8A" }}>De Velopass Community</p>
          <h2 className="sf-headline">Jouw fiets is <em>nooit alleen.</em></h2>
          <p className="sf-subhead">Overal in de Velopass Community word je meteen verwittigd.<br />1823+ fietswinkels scannen automatisch via hun kassasysteem of app.<br />Ook politie en andere fietsers kunnen de QR-sticker scannen en jou direct een seintje geven — anoniem of met naam.</p>
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
