import { createFileRoute, Outlet, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import i18n, { isLang, SUPPORTED_LANGS, type Lang } from "@/i18n/config";

export const Route = createFileRoute("/$lang")({
  beforeLoad: async ({ params }) => {
    if (!isLang(params.lang)) throw notFound();
    // Await so SSR renders with the right language (prevents hydration mismatch).
    if (i18n.language !== params.lang) {
      await i18n.changeLanguage(params.lang);
    }
    return { lang: params.lang as Lang };
  },
  component: LangLayout,
});

function LangLayout() {
  const { lang } = Route.useParams();
  // Keep i18n in sync on client-side navigation between langs.
  useEffect(() => {
    if (isLang(lang) && i18n.language !== lang) {
      void i18n.changeLanguage(lang);
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  }, [lang]);
  return <Outlet />;
}

export { SUPPORTED_LANGS };
