import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/gestolen")({
  beforeLoad: () => {
    throw redirect({ to: "/stolen", replace: true });
  },
  component: () => null,
});
