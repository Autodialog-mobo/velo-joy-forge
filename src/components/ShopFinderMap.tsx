import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Trans, useTranslation } from "react-i18next";
import { useCurrentLang } from "@/i18n/useCurrentLang";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { AlertTriangle } from "lucide-react";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import shopsData from "@/data/shops.json";
import { ShopPanel } from "./ShopPanel";
import { trackRegisterBikeClick } from "@/lib/analytics";

type Shop = {
  name: string;
  address: string;
  lat: number;
  lng: number;
  city: string;
  country: string;
  status: string;
  brands?: string[];
};

const markerSvg = (active: boolean) => {
  const size = active ? 36 : 28;
  const bg = active ? "#0D1F3C" : "#2ECC8A";
  const stroke = active ? "#2ECC8A" : "#0D1F3C";
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" rx="22" fill="${bg}"/><path d="M24 54 L42 72 L76 30" fill="none" stroke="${stroke}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
};

const makeIcon = (active: boolean) => {
  const size = active ? 36 : 28;
  return L.divIcon({
    html: `<div class="vp-pin ${active ? "vp-pin-active" : ""}">${markerSvg(active)}</div>`,
    className: "vp-marker-icon",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

function FlyTo({ target }: { target: { lat: number; lng: number; zoom?: number; key: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], target.zoom ?? 14, { duration: 0.8 });
  }, [target, map]);
  return null;
}

function ClusterLayer({
  shops,
  activeIdx,
  onSelect,
  markerRefs,
}: {
  shops: Shop[];
  activeIdx: number | null;
  onSelect: (i: number) => void;
  markerRefs: React.MutableRefObject<Record<number, L.Marker | null>>;
}) {
  const map = useMap();

  useEffect(() => {
    const cluster = (L as any).markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      zoomToBoundsOnClick: true,
      animate: true,
      chunkedLoading: true,
      removeOutsideVisibleBounds: true,
      maxClusterRadius: 50,
      iconCreateFunction: (c: any) => {
        const count = c.getChildCount();
        const size = count < 10 ? 32 : count < 100 ? 38 : 46;
        return L.divIcon({
          html: `<div class="vp-cluster"><span>${count}</span></div>`,
          className: "vp-cluster-wrap",
          iconSize: [size, size],
        });
      },
    });

    const allMarkers: { i: number; marker: L.Marker; lat: number; lng: number }[] = [];
    shops.forEach((s, i) => {
      if (s.status !== "active") return;
      const m = L.marker([s.lat, s.lng], { icon: makeIcon(activeIdx === i) });
      m.on("click", () => onSelect(i));
      m.bindTooltip(
        `<div class="vp-tip"><div class="vp-tip-name">${s.name}</div><div class="vp-tip-city">${s.city}</div><div class="vp-tip-tag">● Scant automatisch</div></div>`,
        { direction: "top", offset: [0, -8], opacity: 1, className: "vp-tooltip" },
      );
      markerRefs.current[i] = m;
      allMarkers.push({ i, marker: m, lat: s.lat, lng: s.lng });
    });

    map.addLayer(cluster);

    const inCluster = new Set<number>();
    const sync = () => {
      const bounds = map.getBounds().pad(0.25);
      const toAdd: L.Marker[] = [];
      const toRemove: L.Marker[] = [];
      for (const { i, marker, lat, lng } of allMarkers) {
        const visible = bounds.contains([lat, lng]);
        if (visible && !inCluster.has(i)) {
          toAdd.push(marker);
          inCluster.add(i);
        } else if (!visible && inCluster.has(i)) {
          toRemove.push(marker);
          inCluster.delete(i);
        }
      }
      if (toRemove.length) cluster.removeLayers(toRemove);
      if (toAdd.length) cluster.addLayers(toAdd);
    };

    sync();
    map.on("moveend", sync);
    map.on("zoomend", sync);

    return () => {
      map.off("moveend", sync);
      map.off("zoomend", sync);
      map.removeLayer(cluster);
      markerRefs.current = {};
    };
  }, [shops, activeIdx, map, onSelect, markerRefs]);

  return null;
}

function useCountUp(target: number, trigger: boolean, duration = 1400) {
  const [val, setVal] = useState(target);
  useEffect(() => {
    if (!trigger) return;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, trigger, duration]);
  return val;
}

function distKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export default function ShopFinderMap() {
  const lang = useCurrentLang();
  const { t } = useTranslation("home");
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; zoom?: number; key: number } | null>(null);
  const [inView, setInView] = useState(false);
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "denied">("idle");
  const markerRefs = useRef<Record<number, L.Marker | null>>({});
  const sectionRef = useRef<HTMLDivElement | null>(null);

  const shops = shopsData as Shop[];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return shops
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => s.status === "active")
      .filter(({ s }) =>
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        (s.brands ?? []).some((b) => b.toLowerCase().includes(q)),
      );
  }, [shops, query]);

  const totalActive = useMemo(
    () => shops.filter((s) => s.status === "active").length,
    [shops],
  );

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const animatedCount = useCountUp(totalActive, inView);

  const handleSelect = (i: number) => {
    setActiveIdx(i);
    const s = shops[i];
    setFlyTarget({ lat: s.lat, lng: s.lng, zoom: 14, key: Date.now() });
    setTimeout(() => markerRefs.current[i]?.openTooltip(), 700);
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) return;
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const me = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        let best = -1;
        let bestD = Infinity;
        shops.forEach((s, i) => {
          if (s.status !== "active") return;
          const d = distKm(me, s);
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        });
        setGeoStatus("idle");
        if (best >= 0) {
          setActiveIdx(best);
          setFlyTarget({ lat: me.lat, lng: me.lng, zoom: 11, key: Date.now() });
          setTimeout(() => markerRefs.current[best]?.openTooltip(), 900);
        }
      },
      () => setGeoStatus("denied"),
      { timeout: 8000 },
    );
  };

  const selectedShop = activeIdx != null ? shops[activeIdx] : null;

  return (
    <section className="shop-finder" id="community" ref={sectionRef}>
      <div className="sf-hero">
        <p className="eyebrow" style={{ color: "#2ECC8A" }}>{t("community.eyebrow")}</p>
        <h2 className="sf-headline">{t("community.headline")}</h2>
        <p className="sf-subhead">
          <Trans
            i18nKey="community.subhead"
            ns="home"
            values={{
              count: animatedCount.toLocaleString(lang === "en" ? "en-GB" : lang === "fr" ? "fr-BE" : lang === "de" ? "de-DE" : "nl-BE"),
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

      <div className="sf-split">
        <aside className="sf-list-wrap">
          <div className="sf-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5A7090" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
            <input
              type="text"
              placeholder={t("community.search_placeholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button type="button" className="sf-geo" onClick={handleGeolocate} disabled={geoStatus === "loading"}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
            {geoStatus === "loading" ? t("community.geo_loading") : geoStatus === "denied" ? t("community.geo_denied") : t("community.geo_idle")}
          </button>
          <div className="sf-list">
            {filtered.map(({ s, i }) => (
              <button
                key={i}
                type="button"
                className={`sf-item ${activeIdx === i ? "active" : ""}`}
                onClick={() => handleSelect(i)}
              >
                <div className="sf-name">{s.name}</div>
                <div className="sf-addr">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#5A7090" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                  {s.address}
                </div>
              </button>
            ))}
            {filtered.length === 0 && <div className="sf-empty">{t("community.empty")}</div>}
          </div>
          <div className="sf-foot">
            <span className="sf-foot-mark">
              <svg width="16" height="16" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="#2ECC8A" /><path d="M24 54 L42 72 L76 30" fill="none" stroke="#0D1F3C" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <span><strong>{filtered.length}</strong> {t("community.list_unit")}</span>
          </div>
        </aside>

        <div className="sf-map">
          <MapContainer center={[50.85, 4.35]} zoom={6} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            <FlyTo target={flyTarget} />
            <ClusterLayer
              shops={shops}
              activeIdx={activeIdx}
              onSelect={handleSelect}
              markerRefs={markerRefs}
            />
          </MapContainer>

          {selectedShop && (
            <ShopPanel shop={selectedShop} onClose={() => setActiveIdx(null)} />
          )}
        </div>
      </div>
      <div className="sf-outro">
        <p className="sf-outro-line">Hoe groter de community, hoe veiliger jouw fiets. <em>En hij groeit elke dag.</em></p>
        <a
          href="#order-sticker"
          className="sf-cta"
          onClick={() => trackRegisterBikeClick("shopfinder", "outro-map")}
        >
          Nog geen Velopass? Registreer je fiets →
        </a>
      </div>
    </section>
  );
}
