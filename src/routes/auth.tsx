import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" ? s.next : "/admin",
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/admin" });
    });
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/admin" },
        });
        if (error) throw error;
        setInfo("Account aangemaakt. Controleer je inbox of log direct in.");
        setMode("signin");
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/reset-password",
        });
        if (error) throw error;
        setInfo("Als dit e-mailadres bestaat, ontvang je zo een resetlink in je inbox.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/admin" });
      }
    } catch (err: any) {
      setError(err.message ?? "Er ging iets mis");
    } finally {
      setLoading(false);
    }
  };

  const title =
    mode === "signin" ? "Log in om bestellingen te beheren."
    : mode === "signup" ? "Maak een admin-account aan."
    : "Voer je e-mailadres in om je wachtwoord te resetten.";

  const cta =
    mode === "signin" ? "Inloggen"
    : mode === "signup" ? "Account aanmaken"
    : "Stuur resetlink";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm bg-card border rounded-2xl p-8 shadow-sm">
        <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "Syne, sans-serif" }}>
          Velopass Admin
        </h1>
        <p className="text-sm text-muted-foreground mb-6">{title}</p>
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="E-mail"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
          />
          {mode !== "forgot" && (
            <input
              type="password"
              placeholder="Wachtwoord"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
            />
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {info && <p className="text-sm text-muted-foreground">{info}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium disabled:opacity-60"
          >
            {loading ? "Bezig..." : cta}
          </button>
        </form>
        <div className="mt-4 space-y-2 text-center">
          {mode === "signin" && (
            <button
              onClick={() => { setMode("forgot"); setError(null); setInfo(null); }}
              className="text-xs text-muted-foreground hover:text-foreground w-full"
            >
              Wachtwoord vergeten?
            </button>
          )}
          {mode !== "forgot" ? (
            <button
              onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); setInfo(null); }}
              className="text-xs text-muted-foreground hover:text-foreground w-full"
            >
              {mode === "signin" ? "Nog geen account? Registreer" : "Al een account? Log in"}
            </button>
          ) : (
            <button
              onClick={() => { setMode("signin"); setError(null); setInfo(null); }}
              className="text-xs text-muted-foreground hover:text-foreground w-full"
            >
              Terug naar inloggen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
