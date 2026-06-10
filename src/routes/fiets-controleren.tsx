import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy NL slug → single-hop 301 to canonical /nl/bike-check
export const Route = createFileRoute("/fiets-controleren")({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/$lang/bike-check",
      params: { lang: "nl" },
      search: search as Record<string, unknown>,
      replace: true,
    });
  },
  component: () => null,
});
