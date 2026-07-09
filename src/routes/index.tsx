import { createFileRoute, redirect } from "@tanstack/react-router";
import { detectLang } from "@/lib/lang.functions";

export const Route = createFileRoute("/")({
  beforeLoad: async ({ location }) => {
    // If Auth0 bounces the callback (?code=&state=) to "/", forward it to /admin
    // so the Auth0Provider (mounted under _admin) can process it. Without this,
    // the lang redirect below strips the params and the session never lands.
    const search = location.searchStr ?? "";
    if (search.includes("code=") && search.includes("state=")) {
      throw redirect({ to: "/admin", replace: true, search: location.search as never });
    }
    const lang = await detectLang();
    throw redirect({ to: "/$lang", params: { lang }, replace: true });
  },
  component: () => null,
});
