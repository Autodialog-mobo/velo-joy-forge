import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/al-een-sticker")({
  beforeLoad: () => {
    throw redirect({ to: "/", hash: "already-have-one", replace: true });
  },
  component: () => null,
});
