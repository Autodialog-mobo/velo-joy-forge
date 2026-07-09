import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, AlertCircle, Copy } from "lucide-react";
import { Auth0ProviderWithConfig, ROLE_CLAIM, ADMIN_ROLE, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/admin-auth-check")({
  ssr: false,
  component: AuthCheckPageWrapper,
});

function AuthCheckPageWrapper() {
  return (
    <Auth0ProviderWithConfig>
      <AuthCheckPage />
    </Auth0ProviderWithConfig>
  );
}

type CheckState = "pending" | "ok" | "fail" | "warn";

interface Check {
  label: string;
  state: CheckState;
  detail?: string;
}

function AuthCheckPage() {
  const domain = import.meta.env.VITE_AUTH0_DOMAIN as string | undefined;
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID as string | undefined;
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE as string | undefined;

  const [origin, setOrigin] = useState("");
  const [checks, setChecks] = useState<Check[]>([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const requiredUrls = origin
    ? [origin, `${origin}/admin`, `${origin}/admin-users`]
    : [];

  const runChecks = async () => {
    setRunning(true);
    const results: Check[] = [];

    // 1. Env vars present
    results.push({
      label: "VITE_AUTH0_DOMAIN aanwezig",
      state: domain ? "ok" : "fail",
      detail: domain ?? "ontbreekt in .env",
    });
    results.push({
      label: "VITE_AUTH0_CLIENT_ID aanwezig",
      state: clientId ? "ok" : "fail",
      detail: clientId ? `${clientId.slice(0, 8)}…` : "ontbreekt",
    });
    results.push({
      label: "VITE_AUTH0_AUDIENCE aanwezig",
      state: audience ? "ok" : "warn",
      detail: audience ?? "leeg (access token krijgt geen custom audience)",
    });

    // 2. Domain reachable
    if (domain) {
      try {
        const r = await fetch(`https://${domain}/.well-known/openid-configuration`);
        results.push({
          label: "Auth0 tenant bereikbaar (OIDC discovery)",
          state: r.ok ? "ok" : "fail",
          detail: `HTTP ${r.status}`,
        });
      } catch (e) {
        results.push({
          label: "Auth0 tenant bereikbaar",
          state: "fail",
          detail: (e as Error).message,
        });
      }

      // 3. JWKS reachable
      try {
        const r = await fetch(`https://${domain}/.well-known/jwks.json`);
        results.push({
          label: "JWKS endpoint bereikbaar",
          state: r.ok ? "ok" : "fail",
          detail: `HTTP ${r.status}`,
        });
      } catch (e) {
        results.push({
          label: "JWKS endpoint bereikbaar",
          state: "fail",
          detail: (e as Error).message,
        });
      }

      // 4. Allowed Web Origins — CORS preflight against Auth0
      if (clientId && origin) {
        try {
          const r = await fetch(
            `https://${domain}/co/authenticate`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ client_id: clientId, username: "__probe__", realm: "__probe__" }),
            },
          );
          // If the current origin is NOT in Allowed Web Origins, the browser blocks
          // the request before it returns; reaching here means CORS passed (any HTTP
          // status is fine — 400/403 is expected for the bogus payload).
          results.push({
            label: "Huidige origin in Allowed Web Origins",
            state: "ok",
            detail: `CORS OK (Auth0 antwoordde HTTP ${r.status})`,
          });
        } catch (e) {
          results.push({
            label: "Huidige origin in Allowed Web Origins",
            state: "fail",
            detail:
              "CORS geblokkeerd — voeg " +
              origin +
              " toe aan Allowed Web Origins in Auth0. (" +
              (e as Error).message +
              ")",
          });
        }
      }
    }

    setChecks(results);
    setRunning(false);
  };

  useEffect(() => {
    if (origin) void runChecks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin]);

  const copy = (text: string) => {
    void navigator.clipboard?.writeText(text);
  };

  return (
    <div style={{ background: "#0E0F12", minHeight: "100vh", color: "#fff" }}>
      <div className="max-w-[880px] mx-auto px-5 py-8 md:px-10 md:py-12">
        <div className="mb-2 text-xs uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>
          Velopass · Diagnose
        </div>
        <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 32 }} className="mb-8">
          Auth0 configuratie-check
        </h1>

        <section
          className="rounded-2xl p-6 mb-6"
          style={{ background: "#15171C", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: "rgba(255,255,255,0.6)" }}>
            Deze omgeving
          </h2>
          <Row label="Origin" value={origin} onCopy={() => copy(origin)} />
          <Row label="Auth0 domain" value={domain ?? "—"} />
          <Row label="Auth0 client ID" value={clientId ?? "—"} />
          <Row label="Audience" value={audience ?? "—"} />
        </section>

        <section
          className="rounded-2xl p-6 mb-6"
          style={{ background: "#15171C", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.6)" }}>
              Checks
            </h2>
            <button
              onClick={runChecks}
              disabled={running}
              className="text-xs px-3 py-1.5 rounded-md"
              style={{ background: "#2ECC8A", color: "#0E0F12", fontWeight: 600, opacity: running ? 0.6 : 1 }}
            >
              {running ? "Bezig…" : "Opnieuw testen"}
            </button>
          </div>
          <ul className="space-y-3">
            {checks.length === 0 && (
              <li className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                Bezig met testen…
              </li>
            )}
            {checks.map((c, i) => (
              <li key={i} className="flex items-start gap-3">
                <StateIcon state={c.state} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm">{c.label}</div>
                  {c.detail && (
                    <div className="text-xs mt-0.5 break-all" style={{ color: "rgba(255,255,255,0.55)" }}>
                      {c.detail}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <TokenClaimsSection expectedAudience={audience} expectedIssuer={domain ? `https://${domain}/` : ""} />


        <section
          className="rounded-2xl p-6 mb-6"
          style={{ background: "#15171C", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: "rgba(255,255,255,0.6)" }}>
            Te configureren in Auth0
          </h2>
          <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.6)" }}>
            Applications → jouw SPA → Settings. Plak deze waarden in de betreffende velden (comma-separated).
          </p>

          <Block
            title="Allowed Callback URLs"
            value={requiredUrls.join(",\n")}
            hint="Auth0 redirect na login moet exact matchen met redirect_uri (= window.location.origin)."
            onCopy={() => copy(requiredUrls.join(","))}
          />
          <Block
            title="Allowed Logout URLs"
            value={origin}
            hint="Waar Auth0 mag terugsturen na logout (returnTo)."
            onCopy={() => copy(origin)}
          />
          <Block
            title="Allowed Web Origins"
            value={origin}
            hint="Nodig voor silent auth / getAccessTokenSilently (CORS)."
            onCopy={() => copy(origin)}
          />
          <Block
            title="Allowed Origins (CORS)"
            value={origin}
            hint="Voor /co/authenticate en andere browser calls."
            onCopy={() => copy(origin)}
          />
        </section>

        <div
          className="rounded-xl p-4 flex items-start gap-3 text-xs"
          style={{ background: "rgba(86,156,255,0.06)", border: "1px solid rgba(86,156,255,0.20)", color: "rgba(255,255,255,0.7)" }}
        >
          <AlertCircle size={14} style={{ color: "#7AB0FF", marginTop: 2 }} />
          <span>
            Preview-URLs (<code>id-preview--…lovable.app</code>) veranderen soms. Als je tenant het toestaat, voeg dan
            eenmalig <code>https://*.lovable.app</code> toe aan alle vier de lijsten zodat elke preview meteen werkt.
          </span>
        </div>
      </div>
    </div>
  );
}

function StateIcon({ state }: { state: CheckState }) {
  if (state === "ok") return <CheckCircle2 size={18} style={{ color: "#2ECC8A", marginTop: 2 }} />;
  if (state === "fail") return <XCircle size={18} style={{ color: "#FF6B6B", marginTop: 2 }} />;
  if (state === "warn") return <AlertCircle size={18} style={{ color: "#FFB84D", marginTop: 2 }} />;
  return <div style={{ width: 18, height: 18, marginTop: 2 }} />;
}

function Row({ label, value, onCopy }: { label: string; value: string; onCopy?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm border-b last:border-b-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
      <span style={{ color: "rgba(255,255,255,0.6)" }}>{label}</span>
      <span className="flex items-center gap-2 font-mono text-xs break-all text-right">
        {value || "—"}
        {onCopy && value && (
          <button onClick={onCopy} title="Kopieer" style={{ color: "rgba(255,255,255,0.5)" }}>
            <Copy size={12} />
          </button>
        )}
      </span>
    </div>
  );
}

function Block({ title, value, hint, onCopy }: { title: string; value: string; hint: string; onCopy: () => void }) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm font-medium">{title}</div>
        <button
          onClick={onCopy}
          className="text-xs flex items-center gap-1 px-2 py-1 rounded"
          style={{ background: "rgba(46,204,138,0.12)", color: "#2ECC8A" }}
        >
          <Copy size={12} /> Kopieer
        </button>
      </div>
      <pre
        className="text-xs p-3 rounded-md overflow-x-auto whitespace-pre-wrap break-all"
        style={{ background: "#0E0F12", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.85)" }}
      >
        {value || "—"}
      </pre>
      <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>{hint}</div>
    </div>
  );
}
