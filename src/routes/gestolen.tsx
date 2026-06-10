import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy NL slug → single-hop 301 to canonical /nl/stolen
export const Route = createFileRoute("/gestolen")({
  beforeLoad: () => {
    throw redirect({ to: "/$lang/stolen", params: { lang: "nl" }, replace: true });
  },
  component: () => null,
});
