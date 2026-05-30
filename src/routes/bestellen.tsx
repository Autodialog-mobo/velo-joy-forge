import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/bestellen")({
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/order", search: search as Record<string, unknown>, replace: true });
  },
  component: () => null,
});
