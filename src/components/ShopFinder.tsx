import { lazy, Suspense, useEffect, useState } from "react";

const ShopFinderMap = lazy(() => import("./ShopFinderMap"));

export function ShopFinder() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <section className="shop-finder" id="community">
        <p className="eyebrow">De Velopass Community</p>
        <h2 className="sec-title">Een gestolen fiets heeft nergens meer te gaan.</h2>
        <p className="sec-sub">Kaart laden...</p>
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
