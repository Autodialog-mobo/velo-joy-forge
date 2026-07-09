/**
 * Auth0 integration for Velopass /admin.
 * Adapted from b2b-order-flow's src/lib/auth.jsx for TanStack Router + SSR.
 *
 * Exports:
 *   <Auth0ProviderWithConfig>  — wraps the /admin subtree in _admin/route.tsx
 *   useAuth()                  — { user, isLoading, isAuthenticated, isAdmin, roleReady,
 *                                  getAccessToken, loginWithRedirect, logout }
 *   RequireAuth                — client-side gate for the admin subtree
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
import { registerAuth0TokenGetter } from "@/integrations/auth0/token-store";

const AUTH0_DOMAIN = import.meta.env.VITE_AUTH0_DOMAIN as string | undefined;
const AUTH0_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID as string | undefined;
const AUTH0_AUDIENCE = import.meta.env.VITE_AUTH0_AUDIENCE as string | undefined;

export const ROLE_CLAIM = "https://velopass.com/role";
export const ADMIN_ROLE = "b2b_admin";

/** Decode role from a raw JWT payload — UI gating only, real auth is server-side. */
function roleFromToken(token: string | null | undefined): string | null {
  if (!token) return null;
  try {
    let p = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    p += "=".repeat((4 - (p.length % 4)) % 4);
    return (JSON.parse(atob(p)) as Record<string, string>)[ROLE_CLAIM] ?? null;
  } catch {
    return null;
  }
}

function MissingConfig() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">Admin auth not configured</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          <code>VITE_AUTH0_DOMAIN</code>, <code>VITE_AUTH0_CLIENT_ID</code> or{" "}
          <code>VITE_AUTH0_AUDIENCE</code> is missing. Add them in Workspace Settings → Build Secrets.
        </p>
      </div>
    </div>
  );
}

export function Auth0ProviderWithConfig({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID) return <MissingConfig />;

  const onRedirectCallback = (appState?: { returnTo?: string }) => {
    const to = appState?.returnTo ?? "/admin";
    navigate({ to, replace: true });
  };

  return (
    <Auth0Provider
      domain={AUTH0_DOMAIN}
      clientId={AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: typeof window !== "undefined" ? window.location.origin : undefined,
        scope: "openid profile email",
        audience: AUTH0_AUDIENCE,
      }}
      onRedirectCallback={onRedirectCallback}
      cacheLocation="localstorage"
    >
      <TokenBridge>{children}</TokenBridge>
    </Auth0Provider>
  );
}

/** Registers the Auth0 token getter for the client-side attachAuth0Token middleware. */
function TokenBridge({ children }: { children: ReactNode }) {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  useEffect(() => {
    if (!isAuthenticated) {
      registerAuth0TokenGetter(null);
      return;
    }
    registerAuth0TokenGetter(async () => {
      try {
        return await getAccessTokenSilently(
          AUTH0_AUDIENCE
            ? { authorizationParams: { audience: AUTH0_AUDIENCE } }
            : undefined,
        );
      } catch (err) {
        console.error("[auth] getAccessTokenSilently failed:", err);
        return null;
      }
    });
    return () => registerAuth0TokenGetter(null);
  }, [isAuthenticated, getAccessTokenSilently]);
  return <>{children}</>;
}

export function useAuth() {
  const {
    user,
    isLoading,
    isAuthenticated,
    loginWithRedirect,
    logout,
    getAccessTokenSilently,
  } = useAuth0();

  const getAccessToken = useCallback(async () => {
    try {
      return await getAccessTokenSilently(
        AUTH0_AUDIENCE
          ? { authorizationParams: { audience: AUTH0_AUDIENCE } }
          : undefined,
      );
    } catch (err) {
      console.error("[auth] getAccessTokenSilently failed:", err);
      return null;
    }
  }, [getAccessTokenSilently]);

  const idRole = (user as Record<string, unknown> | undefined)?.[ROLE_CLAIM] as string | undefined ?? null;
  const [tokenRole, setTokenRole] = useState<string | null>(null);
  const [tokenRoleResolved, setTokenRoleResolved] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || idRole) {
      setTokenRole(null);
      setTokenRoleResolved(false);
      return;
    }
    let cancelled = false;
    getAccessToken().then((t) => {
      if (cancelled) return;
      setTokenRole(roleFromToken(t));
      setTokenRoleResolved(true);
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, idRole, getAccessToken]);

  const role = idRole ?? tokenRole;
  const isAdmin = role === ADMIN_ROLE;
  const roleReady = !isAuthenticated || !!idRole || tokenRoleResolved;

  return {
    user,
    role,
    isAdmin,
    roleReady,
    isLoading,
    isAuthenticated,
    getAccessToken,
    loginWithRedirect,
    logout,
  };
}

/**
 * Client-side gate for the /admin subtree.
 * - Redirects unauthenticated users to Auth0 Universal Login
 * - Waits for the role claim to resolve before deciding admin/non-admin
 * - Shows an "Access restricted" screen with logout for non-admin users
 * - Does NOT redirect while the URL still contains the Auth0 callback params
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, isAdmin, roleReady, loginWithRedirect, logout } = useAuth();
  const redirecting = useRef(false);

  // Don't redirect while the Auth0 callback (code + state) is still in the URL.
  const isCallback =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("code") &&
    new URLSearchParams(window.location.search).has("state");

  useEffect(() => {
    if (isLoading || isCallback) return;
    if (!isAuthenticated && !redirecting.current) {
      redirecting.current = true;
      loginWithRedirect({
        appState: { returnTo: window.location.pathname + window.location.search },
      });
    }
  }, [isLoading, isAuthenticated, isCallback, loginWithRedirect]);

  if (isLoading || isCallback || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!roleReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-foreground">Access restricted</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The Velopass back office is available to administrators only.
          </p>
          <button
            onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
            className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Log out
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
