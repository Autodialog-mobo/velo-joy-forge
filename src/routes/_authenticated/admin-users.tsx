import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listAdmins, inviteAdmin, removeAdmin } from "@/lib/users.functions";
import { UserPlus, Trash2, Mail, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin-users")({
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const list = useServerFn(listAdmins);
  const invite = useServerFn(inviteAdmin);
  const remove = useServerFn(removeAdmin);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => list({ data: {} as any }),
  });

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const onInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res: any = await invite({ data: { email } });
      setMsg({
        kind: "ok",
        text:
          res?.status === "existing_user_role_granted"
            ? "Gebruiker bestond al — adminrol toegekend en wachtwoord-resetlink verstuurd."
            : "Uitnodiging verzonden. De gebruiker ontvangt een e-mail om een wachtwoord in te stellen.",
      });
      setEmail("");
      refetch();
    } catch (err: any) {
      setMsg({ kind: "err", text: err.message ?? "Er ging iets mis" });
    } finally {
      setBusy(false);
    }
  };

  const onRemove = async (entryEmail: string, userId?: string | null) => {
    if (!confirm(`Adminrechten intrekken voor ${entryEmail}?`)) return;
    try {
      await remove({ data: { email: entryEmail, userId: userId ?? null } });
      refetch();
    } catch (err: any) {
      alert(err.message ?? "Verwijderen mislukt");
    }
  };

  const admins = data?.admins ?? [];
  const allowlist = data?.allowlist ?? [];
  const adminEmails = new Set(admins.map((a: any) => (a.email || "").toLowerCase()));
  const pending = allowlist.filter((a: any) => !adminEmails.has(a.email.toLowerCase()));

  return (
    <div style={{ background: "#0E0F12", minHeight: "100vh", color: "#fff" }}>
      <div className="max-w-[1080px] mx-auto px-5 py-8 md:px-10 md:py-12">
        <div className="mb-2 text-xs uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>
          Velopass · Back-office
        </div>
        <div className="flex items-center justify-between gap-4 mb-8">
          <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 32 }}>
            Gebruikersbeheer
          </h1>
          <a
            href="/admin"
            className="text-sm"
            style={{ color: "#2ECC8A", borderBottom: "1px dashed #2ECC8A" }}
          >
            ← Terug naar fulfillment
          </a>
        </div>

        {/* Invite form */}
        <div
          className="rounded-2xl p-6 mb-8"
          style={{ background: "#15171C", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
            <UserPlus size={18} /> Nieuwe admin uitnodigen
          </h2>
          <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.6)" }}>
            De ontvanger krijgt een e-mail om een wachtwoord in te stellen. Bij eerste login krijgt deze gebruiker automatisch de adminrol.
          </p>
          <form onSubmit={onInvite} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              required
              placeholder="naam@voorbeeld.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg text-sm"
              style={{
                background: "#0E0F12",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#fff",
              }}
            />
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
              style={{ background: "#2ECC8A", color: "#0E0F12" }}
            >
              {busy ? "Bezig..." : "Uitnodiging versturen"}
            </button>
          </form>
          {msg && (
            <p
              className="mt-3 text-sm"
              style={{ color: msg.kind === "ok" ? "#2ECC8A" : "#E05252" }}
            >
              {msg.text}
            </p>
          )}
        </div>

        {/* Active admins */}
        <div
          className="rounded-2xl overflow-hidden mb-6"
          style={{ background: "#15171C", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="px-6 py-4 flex items-center gap-2 border-b border-white/10">
            <ShieldCheck size={16} style={{ color: "#2ECC8A" }} />
            <h2 className="text-sm font-semibold uppercase tracking-wider">
              Actieve admins ({admins.length})
            </h2>
          </div>
          {isLoading ? (
            <div className="p-6 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>Laden…</div>
          ) : admins.length === 0 ? (
            <div className="p-6 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>Nog geen admins.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: "rgba(255,255,255,0.5)" }}>
                  <th className="text-left px-6 py-3 font-medium">E-mail</th>
                  <th className="text-left px-6 py-3 font-medium">Laatste login</th>
                  <th className="text-right px-6 py-3 font-medium">Actie</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((a: any) => (
                  <tr key={a.user_id} className="border-t border-white/5">
                    <td className="px-6 py-3">{a.email ?? <span style={{ color: "rgba(255,255,255,0.4)" }}>{a.user_id}</span>}</td>
                    <td className="px-6 py-3" style={{ color: "rgba(255,255,255,0.6)" }}>
                      {a.last_sign_in_at ? new Date(a.last_sign_in_at).toLocaleString("nl-BE") : "—"}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => onRemove(a.email ?? "", a.user_id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
                        style={{
                          background: "rgba(224,82,82,0.1)",
                          color: "#E05252",
                          border: "1px solid rgba(224,82,82,0.3)",
                        }}
                      >
                        <Trash2 size={12} /> Intrekken
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pending invites */}
        {pending.length > 0 && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "#15171C", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="px-6 py-4 flex items-center gap-2 border-b border-white/10">
              <Mail size={16} style={{ color: "#E0A33E" }} />
              <h2 className="text-sm font-semibold uppercase tracking-wider">
                Uitgenodigd, nog niet ingelogd ({pending.length})
              </h2>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {pending.map((p: any) => (
                  <tr key={p.email} className="border-t border-white/5">
                    <td className="px-6 py-3">{p.email}</td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => onRemove(p.email, null)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
                        style={{
                          background: "rgba(224,82,82,0.1)",
                          color: "#E05252",
                          border: "1px solid rgba(224,82,82,0.3)",
                        }}
                      >
                        <Trash2 size={12} /> Verwijderen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
