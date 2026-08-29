import { createFileRoute, redirect } from "@tanstack/react-router";
import { detectLang } from "@/lib/lang.functions";

// Bare /frame-id (printed on stickers/displays) → language-resolved canonical
export const Route = createFileRoute("/frame-id")({
  beforeLoad: async ({ search }) => {
    const lang = await detectLang();
    throw redirect({
      to: "/$lang/frame-id",
      params: { lang },
      search: search as Record<string, unknown>,
      replace: true,
    });
  },
  component: () => null,
});
