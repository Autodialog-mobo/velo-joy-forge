import { createFileRoute, redirect } from "@tanstack/react-router";

// Internal alias → shop landing
export const Route = createFileRoute("/professionals")({
  beforeLoad: () => {
    throw redirect({ to: "/$lang/shop", params: { lang: "en" }, replace: true });
  },
  component: () => null,
});
