import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, Info } from "lucide-react";

export const Route = createFileRoute("/_admin/admin-users")({
  ssr: false,
  component: AdminUsersPage,
});

function AdminUsersPage() {
  return (
    <div style={{ background: "#0E0F12", minHeight: "100vh", color: "#fff" }}>
      <div className="max-w-[880px] mx-auto px-5 py-8 md:px-10 md:py-12">
        <div
          className="mb-2 text-xs uppercase tracking-wider"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
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

        <div
          className="rounded-2xl p-6 mb-6"
          style={{ background: "#15171C", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck size={18} style={{ color: "#2ECC8A" }} />
            <h2 className="text-lg font-semibold">Toegang wordt automatisch toegekend</h2>
          </div>
          <p className="text-sm leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.75)" }}>
            De back-office gebruikt Auth0 met een Post-Login Action die het
            e-maildomein controleert. Elke gebruiker die inlogt met een
            geverifieerd <strong>@velopass.com</strong>-account krijgt automatisch de
            <code
              className="mx-1 px-1.5 py-0.5 rounded"
              style={{ background: "rgba(46,204,138,0.12)", color: "#2ECC8A", fontSize: 12 }}
            >
              b2b_admin
            </code>
            rol en toegang tot deze omgeving.
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
            Er is dus geen aparte uitnodigingsflow: er valt niets toe te kennen
            of in te trekken vanuit deze UI.
          </p>
        </div>

        <div
          className="rounded-2xl p-6 mb-6"
          style={{ background: "#15171C", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: "rgba(255,255,255,0.6)" }}>
            Een nieuwe collega toegang geven
          </h3>
          <ol className="text-sm space-y-2 list-decimal pl-5" style={{ color: "rgba(255,255,255,0.85)" }}>
            <li>Zorg dat de collega een werkend <strong>@velopass.com</strong>-mailadres heeft.</li>
            <li>
              Stuur hen door naar{" "}
              <a href="/admin" style={{ color: "#2ECC8A", borderBottom: "1px dashed #2ECC8A" }}>
                /admin
              </a>{" "}
              en laat hen inloggen (Sign up of Continue with Google / Microsoft, afhankelijk van jullie Auth0-config).
            </li>
            <li>Na eerste login wordt de <code style={{ color: "#2ECC8A" }}>b2b_admin</code> claim automatisch toegevoegd en is toegang direct actief.</li>
          </ol>
        </div>

        <div
          className="rounded-2xl p-6"
          style={{ background: "#15171C", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: "rgba(255,255,255,0.6)" }}>
            Toegang intrekken
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
            Verwijder of blokkeer het gebruikersaccount in het Auth0-dashboard,
            of trek het e-mailadres binnen jullie werkgeversdomein in. Zonder
            geldige <strong>@velopass.com</strong>-login is er geen toegang meer.
          </p>
        </div>

        <div
          className="mt-6 rounded-xl p-4 flex items-start gap-3 text-xs"
          style={{ background: "rgba(86,156,255,0.06)", border: "1px solid rgba(86,156,255,0.20)", color: "rgba(255,255,255,0.7)" }}
        >
          <Info size={14} style={{ color: "#7AB0FF", marginTop: 2 }} />
          <span>
            Rollen (admin / medewerker) bestaan momenteel niet als aparte niveaus
            — iedereen met <code style={{ color: "#7AB0FF" }}>b2b_admin</code> heeft volledige toegang.
            Wil je granulaire rollen? Dan is een Auth0 Roles-integratie nodig.
          </span>
        </div>
      </div>
    </div>
  );
}
