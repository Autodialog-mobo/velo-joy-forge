import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/professionals")({
  beforeLoad: () => {
    throw redirect({ to: "/shop" });
  },
  component: () => null,
});
