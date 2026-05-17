import { useState, useCallback } from "react";

type ViesResult =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ok"; name: string; address: string }
  | { state: "notfound" }
  | { state: "invalid" }
  | { state: "error" };

function normalize(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function looksValid(v: string): boolean {
  // Loose EU VAT shape: 2 letters + 2-12 alphanumerics
  return /^[A-Z]{2}[A-Z0-9]{2,12}$/.test(v);
}

export function RegisterForm() {
  const [vat, setVat] = useState("");
  const [shop, setShop] = useState("");
  const [address, setAddress] = useState("");
  const [pos, setPos] = useState("");
  const [posOther, setPosOther] = useState("");
  const [autofilled, setAutofilled] = useState<{ shop: boolean; address: boolean }>({
    shop: false,
    address: false,
  });
  const [vies, setVies] = useState<ViesResult>({ state: "idle" });

  const lookup = useCallback(async () => {
    const n = normalize(vat);
    if (!looksValid(n)) {
      setVies({ state: "invalid" });
      return;
    }
    setVies({ state: "loading" });
    try {
      const res = await fetch("/api/public/vies-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vatNumber: n }),
      });
      const data = await res.json();
      if (data.valid && data.name) {
        setShop(data.name);
        setAddress(data.address || "");
        setAutofilled({ shop: true, address: !!data.address });
        setVies({ state: "ok", name: data.name, address: data.address || "" });
      } else if (data.error === "VIES unavailable") {
        setVies({ state: "error" });
      } else {
        setVies({ state: "notfound" });
      }
    } catch {
      setVies({ state: "error" });
    }
  }, [vat]);

  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <div className="form-row">
        <label className="flabel" htmlFor="pvat">BTW-nummer of ondernemingsnummer</label>
        <div className="vat-row">
          <input
            id="pvat"
            className="finput"
            type="text"
            placeholder="BE0777359681 / NL123456789B01 / FR12345678901"
            value={vat}
            onChange={(e) => {
              setVat(e.target.value);
              if (vies.state !== "idle") setVies({ state: "idle" });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                lookup();
              }
            }}
            autoComplete="off"
          />
          <button
            type="button"
            className="btn-lookup"
            onClick={lookup}
            disabled={vies.state === "loading"}
          >
            {vies.state === "loading" ? (
              <>
                <span className="vat-spinner" aria-hidden="true" />
                Gegevens ophalen...
              </>
            ) : (
              <>Opzoeken →</>
            )}
          </button>
        </div>
        {vies.state === "ok" && (
          <div className="vat-success">
            <div className="vat-badge">✓ Gevonden</div>
            <div className="vat-name">{vies.name}</div>
            {vies.address && <div className="vat-addr">{vies.address}</div>}
            <div className="vat-hint">Klopt dit? Pas aan indien nodig.</div>
          </div>
        )}
        {vies.state === "notfound" && (
          <p className="vat-note err">Niet gevonden. Vul de gegevens handmatig in.</p>
        )}
        {vies.state === "invalid" && (
          <p className="vat-note err">Voer een geldig EU BTW-nummer in (bv. BE0777359681).</p>
        )}
        {vies.state === "error" && (
          <p className="vat-note err">De VIES-dienst is momenteel niet beschikbaar. Vul de gegevens handmatig in.</p>
        )}
      </div>

      <div className="fgrid">
        <div className="form-row">
          <label className="flabel" htmlFor="pf">Voornaam</label>
          <input id="pf" className="finput" type="text" placeholder="Jan" />
        </div>
        <div className="form-row">
          <label className="flabel" htmlFor="pl">Naam</label>
          <input id="pl" className="finput" type="text" placeholder="De Smedt" />
        </div>
      </div>
      <div className="form-row">
        <label className="flabel" htmlFor="ps">Naam fietswinkel</label>
        <input
          id="ps"
          className={`finput${autofilled.shop ? " from-vies" : ""}`}
          type="text"
          placeholder="Van Dyck Fietsen"
          value={shop}
          onChange={(e) => {
            setShop(e.target.value);
            if (autofilled.shop) setAutofilled((s) => ({ ...s, shop: false }));
          }}
        />
      </div>
      <div className="form-row">
        <label className="flabel" htmlFor="paddr">Adres</label>
        <input
          id="paddr"
          className={`finput${autofilled.address ? " from-vies" : ""}`}
          type="text"
          placeholder="Stokerijstraat 29, 2110 Wijnegem"
          value={address}
          onChange={(e) => {
            setAddress(e.target.value);
            if (autofilled.address) setAutofilled((s) => ({ ...s, address: false }));
          }}
        />
      </div>
      <div className="fgrid">
        <div className="form-row">
          <label className="flabel" htmlFor="pe">E-mailadres</label>
          <input id="pe" className="finput" type="email" placeholder="jan@fietswinkel.be" />
        </div>
        <div className="form-row">
          <label className="flabel" htmlFor="pt">Telefoonnummer</label>
          <input id="pt" className="finput" type="tel" placeholder="+32 471 60 15 73" />
        </div>
      </div>
      <div className="form-row">
        <label className="flabel" htmlFor="pk">Kassasysteem</label>
        <select
          id="pk"
          className="finput"
          value={pos}
          onChange={(e) => setPos(e.target.value)}
        >
          <option value="" disabled>Selecteer je kassasysteem</option>
          <option value="cyclesoftware">CycleSoftware</option>
          <option value="vendit">Vendit</option>
          <option value="wilmar">Wilmar</option>
          <option value="tilroy">Tilroy</option>
          <option value="adcount">Adcount</option>
          <option value="g8">G8</option>
          <option value="shifter">Shifter</option>
          <option value="none">Geen kassasysteem</option>
          <option value="other">Ander</option>
        </select>
      </div>
      {pos === "other" && (
        <div className="form-row">
          <label className="flabel" htmlFor="pko">Welk kassasysteem?</label>
          <input
            id="pko"
            className="finput"
            type="text"
            placeholder="Typ het merk of type..."
            value={posOther}
            onChange={(e) => setPosOther(e.target.value)}
            required
          />
        </div>
      )}
      <button type="submit" className="btn-submit">Registreer mijn fietswinkel</button>
      <p className="fnote">We nemen binnen 2 werkdagen contact op.</p>
    </form>
  );
}
