import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import shopsData from "@/data/shops.json";
import { LeafletGestureSupport } from "./LeafletGestureSupport";

type Shop = {
  name: string;
  address: string;
  lat: number;
  lng: number;
  city: string;
  country: string;
  status: string;
};

const markerHtml = () =>
  `<div class="vp-pin"><svg width="28" height="28" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" rx="22" fill="#2ECC8A"/><path d="M24 54 L42 72 L76 30" fill="none" stroke="#0D1F3C" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`;

function Clusters({ shops }: { shops: Shop[] }) {
  const map = useMap();
  const layerRef = useRef<any>(null);

  useEffect(() => {
    const cluster = (L as any).markerClusterGroup({
      showCoverageOnHover: false,
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
    layerRef.current = cluster;

    shops.forEach((s) => {
      if (s.status !== "active") return;
      const icon = L.divIcon({
        html: markerHtml(),
        className: "vp-marker-icon",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14],
      });
      const m = L.marker([s.lat, s.lng], { icon });
      m.bindPopup(
        `<div class="vp-pop"><div class="vp-pop-name">${s.name}</div><div class="vp-pop-city">${s.city}, ${s.country.toUpperCase()}</div><div class="vp-pop-badge">✓ Actief aangesloten</div></div>`,
        { className: "vp-popup" },
      );
      cluster.addLayer(m);
    });

    map.addLayer(cluster);
    return () => {
      map.removeLayer(cluster);
    };
  }, [map, shops]);

  return null;
}

export default function ProCommunityMap() {
  const shops = shopsData as Shop[];
  return (
    <MapContainer center={[50.85, 4.35]} zoom={6} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false} touchZoom={true}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      <LeafletGestureSupport />
      <Clusters shops={shops} />
    </MapContainer>
  );
}
