import { createFileRoute, Outlet, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { I18nextProvider } from "react-i18next";
import i18n, { isLang, SUPPORTED_LANGS, type Lang } from "@/i18n/config";

export const Route = createFileRoute("/$lang")({
  beforeLoad: ({ params }) => {
    if (!isLang(params.lang)) throw notFound();
    return { lang: params.lang as Lang };
  },
  component: LangLayout,
});

/**
 * Build a per-request i18n instance by cloning the singleton.
 * This prevents server-side race conditions between concurrent requests
 * for different languages, and guarantees the SSR HTML matches the
 * client hydration output.
 */
function createScopedI18n(lang: Lang) {
  const instance = i18n.cloneInstance({ lng: lang });
  if (instance.language !== lang) {
    void instance.changeLanguage(lang);
  }
  return instance;
}

function LangLayout() {
  const { lang } = Route.useParams();
  const safeLang = (isLang(lang) ? lang : "en") as Lang;

  // useState initializer runs once per mount (both SSR and client),
  // giving us a stable per-request instance.
  const [scoped] = useState(() => createScopedI18n(safeLang));

  // Keep the scoped instance in sync with the URL param on client-side
  // soft navigations between /$lang variants. Without this, the cloned
  // instance keeps its initial language and the React subtree never
  // re-renders translated strings until a hard refresh.
  if (scoped.language !== safeLang) {
    void scoped.changeLanguage(safeLang);
  }

  if (typeof document !== "undefined") {
    document.documentElement.lang = safeLang;
  }

  return (
    <I18nextProvider i18n={scoped}>
      <Outlet />
    </I18nextProvider>
  );
}

export { SUPPORTED_LANGS };
