// Lightweight GA4 wrapper. Reads VITE_GA4_MEASUREMENT_ID from env.
// No-op if the ID is not set, so it's safe to ship before configuration.

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

const GA_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID as string | undefined;
let initialized = false;

export function initAnalytics() {
  if (initialized || typeof window === "undefined") return;
  if (!GA_ID) {
    // eslint-disable-next-line no-console
    console.info("[analytics] VITE_GA4_MEASUREMENT_ID not set — events will be logged to console only.");
    initialized = true;
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA_ID, { send_page_view: true });
  initialized = true;
}

export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  if (GA_ID && window.gtag) {
    window.gtag("event", name, params);
  } else {
    // eslint-disable-next-line no-console
    console.info("[analytics:event]", name, params);
  }
}

/**
 * Track a click on the "Registreer je fiets →" CTA.
 * @param page  Page slug where the CTA lives (e.g. "bikesearch", "shopfinder")
 * @param variant Variant identifier (e.g. "not-registered-info", "not-registered-result", "shopfinder-map")
 */
export function trackRegisterBikeClick(page: string, variant: string) {
  trackEvent("register_bike_click", { page, variant });
}

/**
 * Track a click on the Pro-login link that sends shop owners to app.velopass.pro.
 * @param location Where the click originated: "header", "mobile_menu", "hero", "footer"
 * @param lang     Active UI language (e.g. "nl", "en")
 */
export function trackProLoginClick(location: "header" | "mobile_menu" | "hero" | "footer", lang: string) {
  trackEvent("pro_login_click", { location, lang, destination: "https://app.velopass.pro" });
}
