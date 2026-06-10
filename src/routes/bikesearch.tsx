import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy alias → keep on the EN bike-check
export const Route = createFileRoute("/bikesearch")({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/$lang/bike-check",
      params: { lang: "en" },
      search: search as Record<string, unknown>,
      replace: true,
    });
  },
  component: () => null,
});
