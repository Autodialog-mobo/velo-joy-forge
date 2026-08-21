import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Supabase Auth OAuth helpers are not yet in the generated client types.
// We wrap them locally so TypeScript stays happy and errors surface naturally.
type OAuthClientInfo = {
  name?: string;
  client_id?: string;
};

type AuthorizationDetails = {
  client?: OAuthClientInfo;
  redirect_url?: string;
  redirect_to?: string;
};

type OAuthDecisionResponse = {
  redirect_url?: string;
  redirect_to?: string;
};

type OAuthAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data?: AuthorizationDetails; error?: Error }>;
  approveAuthorization: (id: string) => Promise<{ data?: OAuthDecisionResponse; error?: Error }>;
  denyAuthorization: (id: string) => Promise<{ data?: OAuthDecisionResponse; error?: Error }>;
};

function oauthApi(): OAuthAuthApi {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const auth = supabase.auth as any;
  return auth.oauth as OAuthAuthApi;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) throw redirect({ to: "/auth", search: { next } });
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id") ?? "";
    if (!authorizationId) throw new Error("Missing authorization_id");
    const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data ?? {};
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-card border rounded-2xl p-8 shadow-sm">
        <h1 className="text-xl font-bold mb-2" style={{ fontFamily: "Syne, sans-serif" }}>
          Verbindingsverzoek
        </h1>
        <p className="text-sm text-muted-foreground">
          Dit verbindingsverzoek kon niet worden geladen: {String((error as Error)?.message ?? error)}
        </p>
      </div>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const api = oauthApi();
    const { data, error: decisionError } = approve
      ? await api.approveAuthorization(authorization_id)
      : await api.denyAuthorization(authorization_id);
    if (decisionError) {
      setBusy(false);
      setError(decisionError.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("Geen redirect-URL ontvangen van het autorisatieserver.");
      return;
    }
    // For external MCP client redirects, use window.location. TanStack navigation
    // cannot route cross-origin.
    if (target.startsWith("http")) {
      window.location.href = target;
      return;
    }
    void navigate({ href: target });
  }

  const clientName = details?.client?.name ?? "een externe applicatie";

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-card border rounded-2xl p-8 shadow-sm space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "Syne, sans-serif" }}>
            Verbind {clientName} met Velopass
          </h1>
          <p className="text-sm text-muted-foreground">
            {clientName} wil dit app als jou gebruiken. Goedkeuren geeft het toegang tot de Velopass MCP-tools
            (zoals het opzoeken van partnerwinkels) onder jouw account.
          </p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => decide(false)}
            className="flex-1 border rounded-lg py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-60"
          >
            Weigeren
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => decide(true)}
            className="flex-1 bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium disabled:opacity-60"
          >
            {busy ? "Bezig..." : "Goedkeuren"}
          </button>
        </div>
      </div>
    </main>
  );
}
