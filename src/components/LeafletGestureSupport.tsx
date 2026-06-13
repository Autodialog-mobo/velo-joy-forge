import { useEffect } from "react";
import { useMap } from "react-leaflet";

export function LeafletGestureSupport() {
  const map = useMap();

  useEffect(() => {
    map.touchZoom.enable();

    const container = map.getContainer();
    let wheelDelta = 0;
    let lastWheelAt = 0;

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;

      event.preventDefault();
      event.stopPropagation();

      const now = Date.now();
      if (now - lastWheelAt > 140) wheelDelta = 0;
      lastWheelAt = now;

      wheelDelta += event.deltaY;
      if (Math.abs(wheelDelta) < 35) return;

      const direction = wheelDelta > 0 ? -1 : 1;
      wheelDelta = 0;

      const maxZoom = Number.isFinite(map.getMaxZoom()) ? map.getMaxZoom() : 19;
      const minZoom = Number.isFinite(map.getMinZoom()) ? map.getMinZoom() : 1;
      const nextZoom = Math.max(minZoom, Math.min(maxZoom, map.getZoom() + direction));

      map.setZoomAround(map.mouseEventToContainerPoint(event), nextZoom);
    };

    container.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      container.removeEventListener("wheel", onWheel);
    };
  }, [map]);

  return null;
}