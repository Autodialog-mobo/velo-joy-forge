import { createFileRoute, redirect } from "@tanstack/react-router";
import { detectLang } from "@/lib/lang.functions";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const lang = await detectLang();
    throw redirect({ to: "/$lang", params: { lang }, replace: true });
  },
  component: () => null,
});
