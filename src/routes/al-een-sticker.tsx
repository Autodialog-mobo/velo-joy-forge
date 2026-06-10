import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy NL slug → single-hop 301 to canonical /nl/already-have-one
export const Route = createFileRoute("/al-een-sticker")({
  beforeLoad: () => {
    throw redirect({
      to: "/$lang/already-have-one",
      params: { lang: "nl" },
      replace: true,
    });
  },
  component: () => null,
});
