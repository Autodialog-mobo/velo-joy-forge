import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

/**
 * Scroll to the element matching location.hash on fresh loads, in-app hash
 * navigation, and language switches that preserve the hash.
 *
 * history.scrollRestoration is "manual" under TanStack Start, so the browser
 * does not auto-scroll to the hash. We retry getElementById to wait for lazy
 * content below the fold to render, then re-assert once after layout settles.
 *
 * behavior: "instant" is intentional — the global `scroll-behavior: smooth`
 * would otherwise animate a multi-thousand-pixel scroll on deep-link loads.
 */
export function useScrollToHash() {
  const hash = useRouterState({ select: (s) => s.location.hash });
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = (hash || window.location.hash || "").replace(/^#/, "");
    if (!id) return;

    let attempts = 0;
    let rafId = 0;
    let timerId = 0;
    let cancelled = false;

    const scrollOnce = (el: Element) => {
      el.scrollIntoView({ behavior: "instant" as ScrollBehavior, block: "start" });
    };

    const tick = () => {
      if (cancelled) return;
      const el = document.getElementById(id);
      if (el) {
        scrollOnce(el);
        rafId = window.requestAnimationFrame(() => {
          if (cancelled) return;
          const again = document.getElementById(id);
          if (again) scrollOnce(again);
        });
        return;
      }
      if (++attempts < 20) {
        timerId = window.setTimeout(tick, 50);
      }
    };
    tick();

    return () => {
      cancelled = true;
      if (rafId) window.cancelAnimationFrame(rafId);
      if (timerId) window.clearTimeout(timerId);
    };
  }, [hash, pathname]);
}
