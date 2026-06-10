import { createFileRoute, redirect } from "@tanstack/react-router";
import { isLang, type Lang } from "@/i18n/config";

// Stub: the "already have a sticker" flow lives in the homepage hero anchor.
// We keep a dedicated route so legacy /al-een-sticker can 301 to /<lang>/already-have-one,
// and from there forward to the homepage anchor without losing the lang prefix.
export const Route = createFileRoute("/$lang/already-have-one")({
  beforeLoad: ({ params }) => {
    const lang = (isLang(params.lang) ? params.lang : "en") as Lang;
    throw redirect({
      to: "/$lang",
      params: { lang },
      hash: "already-have-one",
      replace: true,
    });
  },
  component: () => null,
});
