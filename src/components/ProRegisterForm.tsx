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

type SubmitState =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "success" }
  | { state: "error"; message: string };

function normalize(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function looksValid(v: string): boolean {
  return /^[A-Z]{2}[A-Z0-9]{2,12}$/.test(v);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseViesAddress(raw: string): { street: string; postal: string; city: string } {
  const cleaned = (raw || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return { street: "", postal: "", city: "" };
  // Try last comma-separated segment as "postal city" or "city postal"
  const parts = cleaned.split(",").map((s) => s.trim()).filter(Boolean);
  let street = "";
  let tail = "";
  if (parts.length >= 2) {
    street = parts.slice(0, -1).join(", ");
    tail = parts[parts.length - 1];
  } else {
    // No comma — try to split on postal pattern
    const m = cleaned.match(/^(.*?)\s+((?:[A-Z]{1,2}[- ]?)?\d{4,5}(?:\s?[A-Z]{2})?)\s+(.+)$/);
    if (m) return { street: m[1].trim(), postal: m[2].trim(), city: m[3].trim() };
    return { street: cleaned, postal: "", city: "" };
  }
  // Extract postal from tail
  const pm = tail.match(/((?:[A-Z]{1,2}[- ]?)?\d{4,5}(?:\s?[A-Z]{2})?)/);
  if (pm) {
    const postal = pm[1].trim();
    const city = tail.replace(pm[1], "").trim();
    return { street, postal, city };
  }
  return { street, postal: "", city: tail };
}

function joinAddress(street: string, postal: string, city: string): string {
  const s = street.trim();
  const pc = [postal.trim(), city.trim()].filter(Boolean).join(" ");
  return [s, pc].filter(Boolean).join(", ");
}


export function RegisterForm() {
  const lang = useCurrentLang();
  const { t } = useTranslation("shop");
  const tf = (k: string) => t(`registerForm.${k}`);

  const [vat, setVat] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [shop, setShop] = useState("");
  const [street, setStreet] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pos, setPos] = useState("");
  const [posOther, setPosOther] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [autofilled, setAutofilled] = useState<{ shop: boolean; street: boolean; postal: boolean; city: boolean }>({
    shop: false,
    street: false,
    postal: false,
    city: false,
  });
  const [vies, setVies] = useState<ViesResult>({ state: "idle" });
  const [submit, setSubmit] = useState<SubmitState>({ state: "idle" });

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
        const parsed = parseViesAddress(data.address || "");
        setStreet(parsed.street);
        setPostalCode(parsed.postal);
        setCity(parsed.city);
        setAutofilled({
          shop: true,
          street: !!parsed.street,
          postal: !!parsed.postal,
          city: !!parsed.city,
        });
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

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (submit.state === "submitting") return;

      if (!shop.trim()) {
        setSubmit({ state: "error", message: tf("error_shop") });
        return;
      }
      if (!EMAIL_RE.test(email.trim())) {
        setSubmit({ state: "error", message: tf("error_email") });
        return;
      }

      setSubmit({ state: "submitting" });
      try {
        const res = await fetch("/api/public/shop-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vat: vat.trim(),
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            shopName: shop.trim(),
            address: joinAddress(street, postalCode, city),
            country: country.trim(),
            email: email.trim(),
            phone: phone.trim(),
            posSystem: pos,
            posOther: pos === "other" ? posOther.trim() : "",
            lang,
            website,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.ok) {
          console.error("[shop-signup] submit failed", {
            status: res.status,
            error: data?.error,
            reqId: data?.reqId,
            details: data?.details,
            debug: data?.debug,
          });
          const msg = data?.reqId
            ? `${tf("error_generic")} (ref: ${data.reqId})`
            : tf("error_generic");
          setSubmit({ state: "error", message: msg });
          return;
        }
        setSubmit({ state: "success" });
      } catch (err) {
        console.error("[shop-signup] network error", err);
        setSubmit({ state: "error", message: tf("error_generic") });
      }
    },
    [submit.state, shop, email, vat, firstName, lastName, street, postalCode, city, country, phone, pos, posOther, website, lang, tf],
  );

  if (submit.state === "success") {
    return (
      <div className="signup-success" role="status" aria-live="polite">
        <div className="signup-success-icon" aria-hidden="true">✓</div>
        <h3 className="signup-success-title">{tf("success_title")}</h3>
        <p className="signup-success-body">{tf("success_body")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {/* Honeypot */}
      <div style={{ position: "absolute", left: "-10000px", height: 0, width: 0, overflow: "hidden" }} aria-hidden="true">
        <label>
          Website
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>

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
          <input
            id="pf"
            className="finput"
            type="text"
            placeholder={tf("first_name_placeholder")}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
            required
          />
        </div>
        <div className="form-row">
          <label className="flabel" htmlFor="pl">{tf("last_name")}</label>
          <input
            id="pl"
            className="finput"
            type="text"
            placeholder={tf("last_name_placeholder")}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="family-name"
            required
          />
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
          required
        />
      </div>
      <div className="form-row">
        <label className="flabel" htmlFor="pstreet">{tf("street")}</label>
        <input
          id="pstreet"
          className={`finput${autofilled.street ? " from-vies" : ""}`}
          type="text"
          placeholder={tf("street_placeholder")}
          value={street}
          onChange={(e) => {
            setStreet(e.target.value);
            if (autofilled.street) setAutofilled((s) => ({ ...s, street: false }));
          }}
          autoComplete="street-address"
          required
        />
      </div>
      <div className="fgrid">
        <div className="form-row">
          <label className="flabel" htmlFor="ppc">{tf("postal_code")}</label>
          <input
            id="ppc"
            className={`finput${autofilled.postal ? " from-vies" : ""}`}
            type="text"
            placeholder={tf("postal_code_placeholder")}
            value={postalCode}
            onChange={(e) => {
              setPostalCode(e.target.value);
              if (autofilled.postal) setAutofilled((s) => ({ ...s, postal: false }));
            }}
            autoComplete="postal-code"
            required
          />
        </div>
        <div className="form-row">
          <label className="flabel" htmlFor="pcity">{tf("city")}</label>
          <input
            id="pcity"
            className={`finput${autofilled.city ? " from-vies" : ""}`}
            type="text"
            placeholder={tf("city_placeholder")}
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              if (autofilled.city) setAutofilled((s) => ({ ...s, city: false }));
            }}
            autoComplete="address-level2"
            required
          />
        </div>
      </div>

      <div className="form-row">
        <label className="flabel" htmlFor="pcountry">{tf("country")}</label>
        <select
          id="pcountry"
          className="finput"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          autoComplete="country-name"
          required
        >
          <option value="" disabled>{tf("country_select")}</option>
          <option value="BE">België / Belgique</option>
          <option value="NL">Nederland</option>
          <option value="LU">Luxembourg</option>
          <option value="FR">France</option>
          <option value="DE">Deutschland</option>
          <option value="AT">Österreich</option>
          <option value="CH">Schweiz / Suisse</option>
          <option value="ES">España</option>
          <option value="PT">Portugal</option>
          <option value="IT">Italia</option>
          <option value="GB">United Kingdom</option>
          <option value="IE">Ireland</option>
          <option value="DK">Danmark</option>
          <option value="SE">Sverige</option>
          <option value="NO">Norge</option>
          <option value="FI">Suomi</option>
          <option value="PL">Polska</option>
          <option value="CZ">Česko</option>
          <option value="OTHER">Other / Autre / Andere</option>
        </select>
      </div>
      <div className="fgrid">
        <div className="form-row">
          <label className="flabel" htmlFor="pe">{tf("email")}</label>
          <input
            id="pe"
            className="finput"
            type="email"
            placeholder={tf("email_placeholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div className="form-row">
          <label className="flabel" htmlFor="pt">{tf("phone")}</label>
          <input
            id="pt"
            className="finput"
            type="tel"
            placeholder={tf("phone_placeholder")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            required
          />
        </div>
      </div>
      <div className="form-row">
        <label className="flabel" htmlFor="pk">{tf("pos")}</label>
        <select
          id="pk"
          className="finput"
          value={pos}
          onChange={(e) => setPos(e.target.value)}
          required
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
      {submit.state === "error" && (
        <p className="vat-note err" role="alert" style={{ marginTop: 8 }}>{submit.message}</p>
      )}
      <button
        type="submit"
        className="btn-submit"
        disabled={submit.state === "submitting"}
        aria-busy={submit.state === "submitting"}
      >
        {submit.state === "submitting" ? (
          <>
            <span className="vat-spinner" aria-hidden="true" />
            {tf("submitting")}
          </>
        ) : (
          tf("submit")
        )}
      </button>
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
