let loadPromise: Promise<void> | null = null;

export function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const w = window as unknown as { google?: { maps?: { importLibrary?: unknown } } };
  if (w.google?.maps?.importLibrary) return Promise.resolve();
  if (loadPromise) return loadPromise;

  const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as
    | string
    | undefined;
  const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as
    | string
    | undefined;
  if (!key) return Promise.reject(new Error("Missing Google Maps browser key"));

  loadPromise = new Promise<void>((resolve, reject) => {
    const cbName = "__vpGmapsInit";
    (window as unknown as Record<string, unknown>)[cbName] = () => resolve();
    const s = document.createElement("script");
    const params = new URLSearchParams({
      key,
      v: "weekly",
      loading: "async",
      libraries: "places",
      callback: cbName,
    });
    if (channel) params.set("channel", channel);
    s.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    s.async = true;
    s.defer = true;
    s.onerror = () => {
      loadPromise = null;
      reject(new Error("Failed to load Google Maps JS"));
    };
    document.head.appendChild(s);
  });
  return loadPromise;
}
