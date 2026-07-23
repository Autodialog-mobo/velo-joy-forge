import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { RotateCcw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { recoverOrdersFromMollie } from "@/lib/recover.functions";

export const Route = createFileRoute("/_admin/admin-recover")({
  ssr: false,
  component: AdminRecoverPage,
});

function AdminRecoverPage() {
  const run = useServerFn(recoverOrdersFromMollie);
  const [includeTest, setIncludeTest] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const onRun = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const r = await run({ data: { includeTest } });
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Herstel mislukt");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ background: "#0E0F12", minHeight: "100vh", color: "#fff" }}>
      <div className="max-w-[720px] mx-auto px-5 py-8 md:px-10 md:py-12">
        <div className="mb-2 text-xs uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>
          Velopass · Back-office
        </div>
        <div className="flex items-center justify-between gap-4 mb-8">
          <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 32 }}>
            Bestellingen herstellen
          </h1>
          <a href="/admin" className="text-sm" style={{ color: "#2ECC8A", borderBottom: "1px dashed #2ECC8A" }}>
            &larr; Terug
          </a>
        </div>

        <div
          className="rounded-2xl p-6 mb-6"
          style={{ background: "#15171C", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <p className="text-sm leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.8)" }}>
            Dit haalt alle <strong>betaalde</strong> betalingen uit Mollie en schrijft ze terug naar de
            bestellingen, met de originele besteldatum. Er worden <strong>geen e-mails</strong> verstuurd. Je
            kunt dit veilig meerdere keren draaien (bestaande orders worden bijgewerkt, niet gedupliceerd).
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
            Standaard worden alleen echte (live) betalingen hersteld; testbetalingen worden overgeslagen.
            Referral-bron, A/B-variant en de printed/shipped-status kunnen niet uit Mollie hersteld worden en
            blijven leeg — alle orders komen terug als "betaald".
          </p>

          <label className="flex items-center gap-2 mt-5 text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>
            <input type="checkbox" checked={includeTest} onChange={(e) => setIncludeTest(e.target.checked)} />
            Ook testbetalingen (sandbox) herstellen
          </label>

          <button
            onClick={onRun}
            disabled={busy}
            className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl text-[14px] font-semibold"
            style={{
              background: busy ? "rgba(46,204,138,0.4)" : "#2ECC8A",
              color: "#062015",
              border: "none",
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            <RotateCcw size={16} className={busy ? "animate-spin" : ""} />
            {busy ? "Bezig met herstellen..." : "Herstel bestellingen vanuit Mollie"}
          </button>
        </div>

        {error && (
          <div
            className="rounded-xl p-4 flex items-start gap-3 text-sm mb-4"
            style={{ background: "rgba(230,80,80,0.08)", border: "1px solid rgba(230,80,80,0.3)", color: "#ffb4b4" }}
          >
            <AlertTriangle size={16} style={{ marginTop: 2 }} />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div
            className="rounded-2xl p-6"
            style={{ background: "#15171C", border: "1px solid rgba(46,204,138,0.3)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={18} style={{ color: "#2ECC8A" }} />
              <h2 className="text-lg font-semibold">Herstel voltooid</h2>
            </div>
            <ul className="text-sm space-y-1" style={{ color: "rgba(255,255,255,0.8)" }}>
              <li><strong>{result.recovered}</strong> bestellingen hersteld</li>
              <li>{result.linesInserted} bundelregels teruggezet</li>
              <li>{result.skippedTest} testbetalingen overgeslagen</li>
              <li>{result.skippedUnpaid} niet-betaalde betalingen overgeslagen</li>
              <li style={{ color: "rgba(255,255,255,0.5)" }}>{result.scanned} betalingen gescand in Mollie</li>
            </ul>
            <p className="text-sm mt-4" style={{ color: "rgba(255,255,255,0.6)" }}>
              Ga terug naar het rapport of de fulfillmentlijst om je bestellingen te bekijken.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
