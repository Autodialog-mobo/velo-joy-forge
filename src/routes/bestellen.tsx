import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy NL slug → single-hop 301 to canonical /nl/order
export const Route = createFileRoute("/bestellen")({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/$lang/order",
      params: { lang: "nl" },
      search: search as Record<string, unknown>,
      replace: true,
    });
  },
  component: () => null,
});
