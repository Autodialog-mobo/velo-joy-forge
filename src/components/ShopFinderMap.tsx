import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import shopsData from "@/data/shops.json";

type Shop = {
  name: string;
  address: string;
  lat: number;
  lng: number;
  city: string;
  country: string;
  status: string;
};

const markerSvg = (active: boolean) => {
  const size = active ? 36 : 28;
  const bg = active ? "#0D1F3C" : "#2ECC8A";
  const stroke = active ? "#2ECC8A" : "#0D1F3C";
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" rx="22" fill="${bg}"/><path d="M24 54 L42 72 L76 30" fill="none" stroke="${stroke}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
};

const makeIcon = (active: boolean) => {
  const size = active ? 36 : 28;
  return L.divIcon({
    html: markerSvg(active),
    className: "vp-marker-icon",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

function FlyTo({ target }: { target: { lat: number; lng: number; key: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], 14, { duration: 0.8 });
  }, [target, map]);
  return null;
}

export default function ShopFinderMap() {
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; key: number } | null>(null);
  const markerRefs = useRef<Record<number, L.Marker | null>>({});

  const shops = shopsData as Shop[];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return shops
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => s.status === "active")
      .filter(({ s }) =>
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q),
      );
  }, [shops, query]);

  const totalActive = useMemo(
    () => shops.filter((s) => s.status === "active").length,
    [shops],
  );

  const handleSelect = (i: number) => {
    setActiveIdx(i);
    const s = shops[i];
    setFlyTarget({ lat: s.lat, lng: s.lng, key: Date.now() });
    setTimeout(() => markerRefs.current[i]?.openPopup(), 600);
  };

  return (
    <section className="shop-finder" id="vind-winkel">
      <p className="eyebrow">Vind een Velopass fietswinkel</p>
      <h2 className="sec-title">{totalActive.toLocaleString("nl-BE")} aangesloten fietswinkels</h2>
      <p className="sec-sub">Zoek een winkel bij jou in de buurt om een sticker te bestellen of je fiets te laten registreren.</p>

      <div className="sf-split">
        <aside className="sf-list-wrap">
          <div className="sf-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5A7090" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
            <input
              type="text"
              placeholder="Zoek op stad of naam..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
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
            {filtered.length === 0 && <div className="sf-empty">Geen winkels gevonden.</div>}
          </div>
          <div className="sf-foot">
            <span className="sf-foot-mark">
              <svg width="16" height="16" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="#2ECC8A" /><path d="M24 54 L42 72 L76 30" fill="none" stroke="#0D1F3C" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <span><strong>{filtered.length}</strong> winkels</span>
          </div>
        </aside>

        <div className="sf-map">
          <MapContainer center={[50.85, 4.35]} zoom={6} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            <FlyTo target={flyTarget} />
            {shops.map((s, i) =>
              s.status === "active" ? (
                <Marker
                  key={i}
                  position={[s.lat, s.lng]}
                  icon={makeIcon(activeIdx === i)}
                  ref={(ref) => { markerRefs.current[i] = ref; }}
                  eventHandlers={{ click: () => setActiveIdx(i) }}
                >
                  <Popup>
                    <div className="sf-popup">
                      <div className="sf-popup-name">{s.name}</div>
                      <div className="sf-popup-addr">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#5A7090" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                        {s.address}
                      </div>
                      <a
                        className="sf-popup-btn"
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(s.address)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11" /></svg>
                        Routebeschrijving
                      </a>
                    </div>
                  </Popup>
                </Marker>
              ) : null,
            )}
          </MapContainer>
        </div>
      </div>
    </section>
  );
}
