import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/bikesearch")({
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/bike-check", search: search as Record<string, unknown>, replace: true });
  },
  component: () => null,
});
