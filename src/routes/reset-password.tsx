import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase puts the recovery session in the URL hash on arrival.
    // The client picks it up automatically; we just confirm a session exists.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (password.length < 8) return setError("Wachtwoord moet minstens 8 tekens zijn.");
    if (password !== confirm) return setError("Wachtwoorden komen niet overeen.");
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setInfo("Wachtwoord bijgewerkt. Je wordt doorgestuurd...");
      setTimeout(() => navigate({ to: "/admin" }), 1200);
    } catch (err: any) {
      setError(err.message ?? "Er ging iets mis");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm bg-card border rounded-2xl p-8 shadow-sm">
        <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "Syne, sans-serif" }}>
          Nieuw wachtwoord
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {ready
            ? "Kies een nieuw wachtwoord voor je account."
            : "Controleren van resetlink..."}
        </p>
        {ready && (
          <form onSubmit={onSubmit} className="space-y-3">
            <input
              type="password"
              placeholder="Nieuw wachtwoord"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
            />
            <input
              type="password"
              placeholder="Bevestig wachtwoord"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            {info && <p className="text-sm text-muted-foreground">{info}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium disabled:opacity-60"
            >
              {loading ? "Bezig..." : "Wachtwoord opslaan"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
