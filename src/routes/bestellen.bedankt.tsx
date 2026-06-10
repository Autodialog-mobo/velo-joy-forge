import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy NL slug → single-hop 301 to canonical /nl/order/thanks
export const Route = createFileRoute("/bestellen/bedankt")({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/$lang/order/thanks",
      params: { lang: "nl" },
      search: search as Record<string, unknown>,
      replace: true,
    });
  },
  component: () => null,
});
