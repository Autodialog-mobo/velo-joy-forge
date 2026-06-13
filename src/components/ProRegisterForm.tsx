import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useCurrentLang } from "@/i18n/useCurrentLang";

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
  const lang = useCurrentLang();
  const { t } = useTranslation("shop");
  const tf = (k: string) => t(`registerForm.${k}`);
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
        <label className="flabel" htmlFor="pvat">{tf("vat_label")}</label>
        <div className="vat-row">
          <input
            id="pvat"
            className="finput"
            type="text"
            placeholder={tf("vat_placeholder")}
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
                {tf("looking_up")}
              </>
            ) : (
              <>{tf("lookup")}</>
            )}
          </button>
        </div>
        {vies.state === "ok" && (
          <div className="vat-success">
            <div className="vat-badge">{tf("found")}</div>
            <div className="vat-name">{vies.name}</div>
            {vies.address && <div className="vat-addr">{vies.address}</div>}
            <div className="vat-hint">{tf("hint_correct")}</div>
          </div>
        )}
        {vies.state === "notfound" && (
          <p className="vat-note err">{tf("notfound")}</p>
        )}
        {vies.state === "invalid" && (
          <p className="vat-note err">{tf("invalid")}</p>
        )}
        {vies.state === "error" && (
          <p className="vat-note err">{tf("vies_unavailable")}</p>
        )}
      </div>

      <div className="fgrid">
        <div className="form-row">
          <label className="flabel" htmlFor="pf">{tf("first_name")}</label>
          <input id="pf" className="finput" type="text" placeholder={tf("first_name_placeholder")} />
        </div>
        <div className="form-row">
          <label className="flabel" htmlFor="pl">{tf("last_name")}</label>
          <input id="pl" className="finput" type="text" placeholder={tf("last_name_placeholder")} />
        </div>
      </div>
      <div className="form-row">
        <label className="flabel" htmlFor="ps">{tf("shop_name")}</label>
        <input
          id="ps"
          className={`finput${autofilled.shop ? " from-vies" : ""}`}
          type="text"
          placeholder={tf("shop_name_placeholder")}
          value={shop}
          onChange={(e) => {
            setShop(e.target.value);
            if (autofilled.shop) setAutofilled((s) => ({ ...s, shop: false }));
          }}
        />
      </div>
      <div className="form-row">
        <label className="flabel" htmlFor="paddr">{tf("address")}</label>
        <input
          id="paddr"
          className={`finput${autofilled.address ? " from-vies" : ""}`}
          type="text"
          placeholder={tf("address_placeholder")}
          value={address}
          onChange={(e) => {
            setAddress(e.target.value);
            if (autofilled.address) setAutofilled((s) => ({ ...s, address: false }));
          }}
        />
      </div>
      <div className="fgrid">
        <div className="form-row">
          <label className="flabel" htmlFor="pe">{tf("email")}</label>
          <input id="pe" className="finput" type="email" placeholder={tf("email_placeholder")} />
        </div>
        <div className="form-row">
          <label className="flabel" htmlFor="pt">{tf("phone")}</label>
          <input id="pt" className="finput" type="tel" placeholder={tf("phone_placeholder")} />
        </div>
      </div>
      <div className="form-row">
        <label className="flabel" htmlFor="pk">{tf("pos")}</label>
        <select
          id="pk"
          className="finput"
          value={pos}
          onChange={(e) => setPos(e.target.value)}
        >
          <option value="" disabled>{tf("pos_select")}</option>
          <option value="cyclesoftware">CycleSoftware</option>
          <option value="vendit">Vendit</option>
          <option value="wilmar">Wilmar</option>
          <option value="tilroy">Tilroy</option>
          <option value="adcount">Adcount</option>
          <option value="g8">G8</option>
          <option value="shifter">Shifter</option>
          <option value="none">{tf("pos_none")}</option>
          <option value="other">{tf("pos_other")}</option>
        </select>
      </div>
      {pos === "other" && (
        <div className="form-row">
          <label className="flabel" htmlFor="pko">{tf("pos_other_label")}</label>
          <input
            id="pko"
            className="finput"
            type="text"
            placeholder={tf("pos_other_placeholder")}
            value={posOther}
            onChange={(e) => setPosOther(e.target.value)}
            required
          />
        </div>
      )}
      <button type="submit" className="btn-submit">{tf("submit")}</button>
      <p style={{ textAlign: "center", marginTop: 14, marginBottom: 0 }}>
        <a
          href={`/${lang}/contact?type=shop`}
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
            color: "var(--text-muted)",
            textDecoration: "none",
          }}
        >
          {tf("demo_link")}
        </a>
      </p>
      <p className="fnote">{tf("free_note")}</p>
    </form>
  );
}
