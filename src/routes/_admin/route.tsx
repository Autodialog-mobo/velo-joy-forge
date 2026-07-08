import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Auth0ProviderWithConfig, RequireAuth } from "@/lib/auth";

// Pathless layout that owns the Auth0 session for every /admin* route.
// SSR is disabled — Auth0 SDK is browser-only (localStorage / window).
export const Route = createFileRoute("/_admin")({
  ssr: false,
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <Auth0ProviderWithConfig>
      <RequireAuth>
        <Outlet />
      </RequireAuth>
    </Auth0ProviderWithConfig>
  );
}
