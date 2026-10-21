import L from "leaflet";

/**
 * Shared hover labels for the Velopass shop maps.
 *
 * The map pins are Leaflet `divIcon`s, so they carry no text of their own: the
 * shop info has to be supplied explicitly, both as a visible tooltip (hover)
 * and as an accessible name (screen readers). Cluster bubbles need the same
 * treatment, otherwise hovering a group of shops only shows a bare number.
 */

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};

export const escHtml = (value: unknown) =>
  String(value ?? "").replace(/[&<>"]/g, (c) => ESCAPES[c] ?? c);

export type TipParts = {
  name: string;
  /** Second line, e.g. "Gent, BE". Empty parts are dropped. */
  line2?: string;
  /** Green accent line, e.g. "Scant automatisch". */
  tag?: string;
};

const TIP_OPTIONS: L.TooltipOptions = {
  direction: "top",
  offset: [0, -10],
  opacity: 1,
  className: "vp-tooltip",
};

export function shopTipHtml({ name, line2, tag }: TipParts) {
  const parts = [
    `<div class="vp-tip-name">${escHtml(name)}</div>`,
    line2 ? `<div class="vp-tip-city">${escHtml(line2)}</div>` : "",
    tag ? `<div class="vp-tip-tag">● ${escHtml(tag)}</div>` : "",
  ];
  return `<div class="vp-tip">${parts.join("")}</div>`;
}

/** Plain-text label for screen readers and browser tooltips. */
export function shopAriaLabel({ name, line2, tag }: TipParts) {
  return [name, line2, tag].filter(Boolean).join(" — ");
}

export type ClusterTipParts = {
  /** e.g. "19 winkels" */
  header: string;
  names: string[];
  /** e.g. "+13 meer" — shown when the list was truncated. */
  more?: string;
};

export function clusterTipHtml({ header, names, more }: ClusterTipParts) {
  const items = names.map((n) => `<li>${escHtml(n)}</li>`).join("");
  return (
    `<div class="vp-tip">` +
    `<div class="vp-tip-head">${escHtml(header)}</div>` +
    `<ul class="vp-tip-list">${items}</ul>` +
    (more ? `<div class="vp-tip-more">${escHtml(more)}</div>` : "") +
    `</div>`
  );
}

/**
 * Show the shops inside a cluster when the bubble is hovered.
 *
 * Markercluster only hands us the cluster marker on hover, so the tooltip is
 * bound lazily there and released again on mouse-out. Returns a detach function
 * for the caller's cleanup.
 */
export function bindClusterTooltips(
  cluster: L.LayerGroup & {
    on: (type: string, fn: (e: any) => void) => void;
    off: (type: string, fn: (e: any) => void) => void;
  },
  contentFor: (childNames: string[], count: number) => string | null,
) {
  const onOver = (e: any) => {
    const clusterMarker = e?.layer;
    if (!clusterMarker || (clusterMarker as any)._vpClusterTip) return;
    const names: string[] = (clusterMarker.getAllChildMarkers?.() ?? [])
      .map((m: any) => m?.options?.vpShopName)
      .filter(Boolean);
    const count = clusterMarker.getChildCount?.() ?? names.length;
    const html = contentFor(names, count);
    if (!html) return;
    clusterMarker.bindTooltip(html, TIP_OPTIONS);
    (clusterMarker as any)._vpClusterTip = true;
    clusterMarker.openTooltip();
    keepTipInsideMap(clusterMarker.getTooltip(), clusterMarker.getLatLng());
  };

  const onOut = (e: any) => {
    const clusterMarker = e?.layer;
    if (!clusterMarker) return;
    clusterMarker.unbindTooltip?.();
    (clusterMarker as any)._vpClusterTip = false;
  };

  cluster.on("clustermouseover", onOver);
  cluster.on("clustermouseout", onOut);
  cluster.on("clusterclick", onOut);

  return () => {
    cluster.off("clustermouseover", onOver);
    cluster.off("clustermouseout", onOut);
    cluster.off("clusterclick", onOut);
  };
}

/** Give a marker element its accessible name once Leaflet has rendered it. */
export function setMarkerLabel(marker: L.Marker, label: string) {
  const el = marker.getElement();
  if (el) el.setAttribute("aria-label", label);
}

/** Leaflet's own `alt` handling only covers <img> icons; aria-label is set on add. */
export function markerLabelOptions(label: string) {
  return { alt: label } as L.MarkerOptions;
}

/** Remember the shop name on the marker so clusters can list it later. */
export function rememberShopName(marker: L.Marker, name: string) {
  (marker.options as any).vpShopName = name;
}

/**
 * Cluster bubbles are rendered by markercluster, so they arrive after the
 * initial mount (and again on every re-cluster). Watch the marker pane and give
 * each bubble an accessible name like "756 winkels".
 */
export function labelClusterBubbles(container: HTMLElement, unitLabel: string) {
  const pane = container.querySelector(".leaflet-marker-pane");
  if (!pane) return () => {};

  const apply = () => {
    pane.querySelectorAll<HTMLElement>(".vp-cluster-wrap").forEach((el) => {
      const count = el.querySelector(".vp-cluster span")?.textContent?.trim();
      if (count) el.setAttribute("aria-label", `${count} ${unitLabel}`);
    });
  };

  apply();
  const observer = new MutationObserver(apply);
  observer.observe(pane, { childList: true });
  return () => observer.disconnect();
}

/**
 * Pins against the top edge of the map would have their label clipped, so those
 * labels are shown below the pin instead.
 */
export function keepTipInsideMap(tooltip: any, latlng: L.LatLng) {
  const map = tooltip?._map;
  const node = tooltip?._container ?? tooltip?._tooltipNode;
  if (!map || !node) return;
  const point = map.latLngToContainerPoint(latlng);
  const needed = node.offsetHeight + 26;
  const direction = point.y < needed ? "bottom" : "top";
  if (tooltip.options.direction !== direction) {
    tooltip.options.direction = direction;
    tooltip.options.offset = L.point(0, direction === "bottom" ? 12 : -10);
    tooltip._update();
  }
}

/** Flip a marker's label when it would otherwise be clipped by the map edge. */
export function autoFlipTooltip(marker: L.Marker) {
  const flip = () => {
    const tooltip = marker.getTooltip() as any;
    if (tooltip) keepTipInsideMap(tooltip, marker.getLatLng());
  };
  marker.on("mouseover", flip);
  marker.on("focus", flip);
}

export { TIP_OPTIONS };
