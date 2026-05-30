import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/bestellen/bedankt")({
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/order/thanks", search: search as Record<string, unknown>, replace: true });
  },
  component: () => null,
});
