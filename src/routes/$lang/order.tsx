import { useMemo, useState } from "react";
import { useCurrentLang } from "@/i18n/useCurrentLang";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Truck, ShieldCheck, ArrowLeft, Plus, Minus, ShoppingBag, Lightbulb, Droplets, Eye } from "lucide-react";
import { VelopassMark } from "@/components/VelopassMark";
import { Footer } from "@/components/Footer";
import { LangSwitcher } from "@/components/LangSwitcher";
import { createMolliePayment } from "@/utils/mollie.functions";

type BundleKey = "frameid_solo_onetime" | "frameid_duo_onetime" | "frameid_family_onetime";

type Bundle = {
  key: BundleKey;
  name: string;
  stickers: number;
  price: number; // cents
  pricePerUnit: number;
  tagline: string;
  discountLabel?: string;
  featured?: boolean;
};

const BUNDLES: Bundle[] = [
  {
    key: "frameid_solo_onetime",
    name: "1 Frame-ID",
    stickers: 1,
    price: 1295,
    pricePerUnit: 1295,
    tagline: "€12,95 per stuk",
  },
  {
    key: "frameid_duo_onetime",
    name: "2 Frame-ID's",
    stickers: 2,
    price: 2195,
    pricePerUnit: 1098,
    tagline: "€10,98 per stuk",
    discountLabel: "15% korting",
    featured: true,
  },
  {
    key: "frameid_family_onetime",
    name: "5 Frame-ID's",
    stickers: 5,
    price: 4995,
    pricePerUnit: 999,
    tagline: "€9,99 per stuk",
    discountLabel: "23% korting",
  },
];

const eur = (cents: number) =>
  new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(cents / 100);

import { buildLocalizedHead } from "@/i18n/seo";

export const Route = createFileRoute("/$lang/order")({
  head: ({ params }) =>
    buildLocalizedHead({
      lang: params.lang,
      path: "order",
      title: "Bestel een Velopass Frame-ID — vanaf €12,95",
      description:
        "Bestel je Velopass Frame-ID. Eén sticker, een leven lang digitaal serviceboekje voor je fiets. Gratis verzending in heel de EU.",
      ogDescription: "Bescherm je fiets. Gratis verzending. Veilig betalen via Mollie.",
      ogType: "product",
    }),
  component: BestellenPage,
});

function BestellenPage() {
  const lang = useCurrentLang();
  const [quantities, setQuantities] = useState<Record<BundleKey, number>>({
    frameid_solo_onetime: 0,
    frameid_duo_onetime: 0,
    frameid_family_onetime: 0,
  });
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("BE");
  const [stage, setStage] = useState<"select" | "checkout">("select");
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const items = useMemo(
    () =>
      BUNDLES.filter((b) => quantities[b.key] > 0).map((b) => ({
        priceId: b.key,
        quantity: quantities[b.key],
        bundle: b,
      })),
    [quantities],
  );
  const total = items.reduce((sum, i) => sum + i.bundle.price * i.quantity, 0);
  const hasItems = items.length > 0;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const shippingValid =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    address.trim().length > 0 &&
    postalCode.trim().length > 0 &&
    city.trim().length > 0 &&
    /^(BE|NL|FR|LU|DE)$/.test(country);
  const canCheckout = hasItems && emailValid && shippingValid;

  const updateQty = (key: BundleKey, delta: number) =>
    setQuantities((q) => ({ ...q, [key]: Math.max(0, Math.min(20, q[key] + delta)) }));

  const startCheckout = async () => {
    setStage("checkout");
    setCheckoutError(null);
    try {
      const result = await createMolliePayment({
        data: {
          items: items.map((i) => ({ priceId: i.priceId, quantity: i.quantity })),
          customerEmail: email,
          origin: window.location.origin,
          shipping: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            address: address.trim(),
            postalCode: postalCode.trim(),
            city: city.trim(),
            country,
          },
        },
      });
      if ("error" in result) {
        setCheckoutError(result.error);
        return;
      }
      window.location.href = result.checkoutUrl;
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : "Onbekende fout");
    }
  };

  return (
    <div style={{ background: "#F5F3EE", minHeight: "100vh", color: "#0D1F3C" }}>



      <header style={{ padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 1200, margin: "0 auto" }}>
        <Link to="/$lang" params={{ lang }} style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", color: "#0D1F3C" }}>
          <VelopassMark size={28} />
          <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 18 }}>Velopass</span>
        </Link>
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              window.history.back();
            } else {
              window.location.href = "/";
            }
          }}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, color: "rgba(13,31,60,0.7)", textDecoration: "none", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
        >
          <ArrowLeft size={16} /> Terug
        </button>
      </header>

      {/* Hero */}
      <section style={{ background: "#0D1F3C", color: "#fff", padding: "56px 24px 72px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <p style={{ color: "#2ECC8A", fontFamily: "DM Sans, sans-serif", fontWeight: 600, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", margin: 0 }}>
            Bestel een Frame-ID
          </p>
          <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 36, lineHeight: 1.15, margin: "12px 0 14px", maxWidth: 720 }}>
            Bescherm je fiets. Vanaf €12,95.
          </h1>
          <p style={{ fontFamily: "DM Sans, sans-serif", color: "rgba(255,255,255,0.72)", fontSize: 14, lineHeight: 1.6, margin: 0, maxWidth: 620 }}>
            Eén Frame-ID op je fiets — en je hebt altijd toegang tot diefstalprotectie, pechhulp, verzekering en jouw digitaal serviceboekje. Gratis verzending in heel de EU.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 18, marginTop: 24, fontSize: 13, color: "rgba(255,255,255,0.8)" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Truck size={16} color="#2ECC8A" /> Gratis verzending in heel de EU</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><ShieldCheck size={16} color="#2ECC8A" /> Veilig betalen via Mollie</span>
          </div>
        </div>
      </section>

      <main style={{ maxWidth: 1100, margin: "-40px auto 0", padding: "0 24px 72px", position: "relative" }}>
        {stage === "select" && (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 360px", gap: 24, alignItems: "start" }} className="bestel-grid">
            {/* Cards column */}
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
                {BUNDLES.map((b) => {
                  const qty = quantities[b.key];
                  const isFeatured = b.featured;
                  return (
                    <div
                      key={b.key}
                      style={{
                        background: isFeatured ? "rgba(46,204,138,0.06)" : "#fff",
                        borderRadius: "0 16px 16px 0",
                        padding: 24,
                        border: isFeatured ? "2px solid #2ECC8A" : "1px solid rgba(13,31,60,0.06)",
                        borderLeft: `${b.stickers === 1 ? 4 : b.stickers === 2 ? 10 : 22}px solid #2ECC8A`,
                        boxShadow: "0 4px 20px rgba(13,31,60,0.08)",
                        position: "relative",
                        fontFamily: "DM Sans, sans-serif",
                        color: "#0D1F3C",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      {isFeatured && (
                        <span style={{ position: "absolute", top: -14, right: 12, zIndex: 2, background: "#2ECC8A", color: "#0D1F3C", fontFamily: "DM Sans, sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", padding: "4px 12px", borderRadius: 999, boxShadow: "0 2px 8px rgba(46,204,138,0.4)" }}>
                          POPULAIRSTE
                        </span>
                      )}
                      <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 56, lineHeight: 1, color: "#2ECC8A" }}>
                        {b.stickers}
                      </div>
                      <div style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 500, fontSize: 16, color: "#0D1F3C", marginTop: 2 }}>
                        {b.stickers === 1 ? "Frame-ID" : "Frame-ID's"}
                      </div>
                      <p style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 30, margin: "4px 0 4px", color: "#0D1F3C" }}>
                        {eur(b.price)}
                      </p>
                      <p style={{ fontSize: 13, color: "rgba(13,31,60,0.6)", margin: 0 }}>{b.tagline}</p>
                      {b.discountLabel && (
                        <span style={{ display: "inline-block", marginTop: 10, background: "rgba(46,204,138,0.18)", color: "#0F8A5C", fontWeight: 700, fontSize: 11, padding: "4px 8px", borderRadius: 999, alignSelf: "flex-start" }}>
                          {b.discountLabel}
                        </span>
                      )}

                      <div style={{ marginTop: "auto", paddingTop: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ display: "inline-flex", alignItems: "center", border: "1px solid rgba(13,31,60,0.15)", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
                          <button type="button" aria-label="Minder" onClick={() => updateQty(b.key, -1)} style={qtyBtn} disabled={qty === 0}>
                            <Minus size={14} />
                          </button>
                          <span style={{ minWidth: 32, textAlign: "center", fontWeight: 600, color: "#0D1F3C" }}>{qty}</span>
                          <button type="button" aria-label="Meer" onClick={() => updateQty(b.key, 1)} style={qtyBtn}>
                            <Plus size={14} />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateQty(b.key, 1)}
                          style={{
                            background: qty > 0 ? "rgba(13,31,60,0.06)" : "#0D1F3C",
                            color: qty > 0 ? "#0D1F3C" : "#fff",
                            border: "none",
                            padding: "10px 14px",
                            borderRadius: 10,
                            fontFamily: "DM Sans, sans-serif",
                            fontWeight: 600,
                            fontSize: 13,
                            cursor: "pointer",
                          }}
                        >
                          {qty > 0 ? "Nog één" : "Toevoegen"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p style={{ fontSize: 12, color: "rgba(13,31,60,0.55)", margin: 0, fontFamily: "DM Sans, sans-serif" }}>
                Combineer gerust meerdere bundels in één bestelling. BTW en eventuele lokale belastingen worden automatisch berekend bij de checkout.
              </p>

              {/* PRO TIP — klevinstructies */}
              <div style={{ background: "rgba(46,204,138,0.06)", border: "1px solid rgba(46,204,138,0.2)", borderRadius: 12, padding: "20px 24px", fontFamily: "DM Sans, sans-serif" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <Lightbulb size={16} color="#2ECC8A" />
                  <span style={{ color: "#2ECC8A", fontWeight: 700, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" }}>Pro tip</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 18 }}>
                  <div>
                    <Droplets size={28} color="#2ECC8A" strokeWidth={1.8} />
                    <p style={{ fontWeight: 600, fontSize: 13, color: "#0D1F3C", margin: "8px 0 4px" }}>Ontvetten eerst</p>
                    <p style={{ fontSize: 12, color: "rgba(13,31,60,0.6)", margin: 0, lineHeight: 1.55 }}>Reinig het frameoppervlak eerst met een ontvettingsmiddel voor een optimale hechting.</p>
                  </div>
                  <div>
                    <Eye size={28} color="#2ECC8A" strokeWidth={1.8} />
                    <p style={{ fontWeight: 600, fontSize: 13, color: "#0D1F3C", margin: "8px 0 4px" }}>Zichtbaar plaatsen</p>
                    <p style={{ fontSize: 12, color: "rgba(13,31,60,0.6)", margin: 0, lineHeight: 1.55 }}>Plaats de Frame-ID in het zicht — bij voorkeur net onder de zadelpen. Zo is de QR makkelijk scanbaar.</p>
                  </div>
                  <div>
                    <ShieldCheck size={28} color="#2ECC8A" strokeWidth={1.8} />
                    <p style={{ fontWeight: 600, fontSize: 13, color: "#0D1F3C", margin: "8px 0 4px" }}>Afschrikking voor dieven</p>
                    <p style={{ fontSize: 12, color: "rgba(13,31,60,0.6)", margin: 0, lineHeight: 1.55 }}>Een zichtbare Frame-ID laat dieven meteen weten dat jouw fiets beschermd en geregistreerd is.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Cart sidebar */}
            <aside style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 4px 20px rgba(13,31,60,0.08)", fontFamily: "DM Sans, sans-serif", position: "sticky", top: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <ShoppingBag size={18} color="#0D1F3C" />
                <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 18, margin: 0, color: "#0D1F3C" }}>Winkelmandje</h2>
              </div>

              {!hasItems ? (
                <p style={{ fontSize: 13, color: "rgba(13,31,60,0.6)", margin: "0 0 16px" }}>
                  Voeg minstens één bundel toe om verder te gaan.
                </p>
              ) : (
                <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
                  {items.map((i) => (
                    <div key={i.priceId} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14, color: "#0D1F3C" }}>
                      <span>
                        <span style={{ fontWeight: 600 }}>{i.bundle.name}</span>
                        <span style={{ color: "rgba(13,31,60,0.6)" }}> × {i.quantity}</span>
                      </span>
                      <span style={{ fontWeight: 600 }}>{eur(i.bundle.price * i.quantity)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", fontSize: 13, color: "rgba(13,31,60,0.7)", borderTop: "1px solid rgba(13,31,60,0.08)" }}>
                <span>Verzending</span>
                <span style={{ color: "#2ECC8A", fontWeight: 600 }}>Gratis in heel de EU</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid rgba(13,31,60,0.08)" }}>
                <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 16, color: "#0D1F3C" }}>Totaal</span>
                <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 20, color: "#0D1F3C" }}>{eur(total)}</span>
              </div>

              <div style={{ display: "grid", gap: 6, margin: "16px 0 12px" }}>
                <label htmlFor="email" style={{ fontSize: 12, fontWeight: 500, color: "rgba(13,31,60,0.75)" }}>
                  E-mailadres
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jij@voorbeeld.be"
                  style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(13,31,60,0.15)", fontSize: 14, fontFamily: "inherit", color: "#0D1F3C", background: "#fff" }}
                />
              </div>

              <div style={{ display: "grid", gap: 10, margin: "0 0 12px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <LabeledInput label="Voornaam" value={firstName} onChange={setFirstName} placeholder="Jan" />
                  <LabeledInput label="Achternaam" value={lastName} onChange={setLastName} placeholder="Janssens" />
                </div>
                <LabeledInput label="Straat + huisnummer" value={address} onChange={setAddress} placeholder="Kerkstraat 12" />
                <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8 }}>
                  <LabeledInput label="Postcode" value={postalCode} onChange={setPostalCode} placeholder="9000" />
                  <LabeledInput label="Stad" value={city} onChange={setCity} placeholder="Gent" />
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  <label htmlFor="country" style={{ fontSize: 12, fontWeight: 500, color: "rgba(13,31,60,0.75)" }}>Land</label>
                  <select
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(13,31,60,0.15)", fontSize: 14, fontFamily: "inherit", color: "#0D1F3C", background: "#fff" }}
                  >
                    <option value="BE">België</option>
                    <option value="NL">Nederland</option>
                    <option value="FR">Frankrijk</option>
                    <option value="LU">Luxemburg</option>
                    <option value="DE">Duitsland</option>
                  </select>
                </div>
              </div>

              <div style={{ position: "relative" }} className={`pay-btn-wrap${tooltipOpen ? " pay-btn-wrap--open" : ""}`}>
                <button
                  type="button"
                  onClick={() => {
                    if (!canCheckout) {
                      setTooltipOpen(true);
                      window.setTimeout(() => setTooltipOpen(false), 2500);
                      return;
                    }
                    void startCheckout();
                  }}
                  aria-disabled={!canCheckout}
                  style={{
                    width: "100%",
                    padding: "14px 18px",
                    borderRadius: 12,
                    border: "none",
                    background: !canCheckout ? "rgba(46,204,138,0.25)" : "#2ECC8A",
                    color: "#0D1F3C",
                    fontFamily: "DM Sans, sans-serif",
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: !canCheckout ? "not-allowed" : "pointer",
                    opacity: !canCheckout ? 0.7 : 1,
                  }}
                >
                  {hasItems ? `Betalen — ${eur(total)} →` : "Betalen →"}
                </button>
                {!canCheckout && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: "calc(100% + 8px)",
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "#0D1F3C",
                      color: "#fff",
                      fontSize: 12,
                      fontFamily: "DM Sans, sans-serif",
                      fontWeight: 500,
                      padding: "8px 12px",
                      borderRadius: 8,
                      whiteSpace: "nowrap",
                      zIndex: 10,
                      pointerEvents: "none",
                      opacity: 0,
                      transition: "opacity 150ms ease",
                    }}
                    className="pay-tooltip"
                  >
                    {!hasItems
                      ? "Kies minstens één bundel om te kunnen betalen."
                      : !emailValid
                      ? "Vul een geldig e-mailadres in om verder te gaan."
                      : "Vul je verzendadres in om verder te gaan."}
                    <span
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: "50%",
                        transform: "translateX(-50%)",
                        borderWidth: 6,
                        borderStyle: "solid",
                        borderColor: "#0D1F3C transparent transparent transparent",
                      }}
                    />
                  </span>
                )}
              </div>
              <p style={{ fontSize: 11, color: "rgba(13,31,60,0.55)", margin: "8px 0 0", textAlign: "center" }}>
                Veilig betalen via Mollie · Bancontact · iDEAL · Kaart
              </p>
            </aside>
          </div>
        )}

        {stage === "checkout" && (
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 4px 20px rgba(13,31,60,0.08)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
              <div>
                <p style={{ margin: 0, fontSize: 12, color: "rgba(13,31,60,0.6)", fontFamily: "DM Sans, sans-serif", textTransform: "uppercase", letterSpacing: 1.5 }}>
                  Betaling
                </p>
                <h2 style={{ margin: "4px 0 0", fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 22, color: "#0D1F3C" }}>
                  Totaal {eur(total)}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setStage("select")}
                style={{ background: "transparent", border: "none", color: "rgba(13,31,60,0.65)", cursor: "pointer", fontSize: 13, fontFamily: "DM Sans, sans-serif", display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <ArrowLeft size={14} /> Wijzig bestelling
              </button>
            </div>
            {checkoutError ? (
              <div style={{ color: "#b00020", fontFamily: "DM Sans, sans-serif", fontSize: 14 }}>
                Er ging iets mis bij het starten van de betaling: {checkoutError}
              </div>
            ) : (
              <p style={{ margin: 0, color: "rgba(13,31,60,0.7)", fontFamily: "DM Sans, sans-serif", fontSize: 14 }}>
                Je wordt doorgestuurd naar de beveiligde Mollie-betaalpagina…
              </p>
            )}
          </div>
        )}
      </main>

      <style>{`
        @media (max-width: 900px) {
          .bestel-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <Footer />
    </div>
  );
}

const qtyBtn: React.CSSProperties = {
  width: 32,
  height: 36,
  border: "none",
  background: "transparent",
  cursor: "pointer",
  color: "#0D1F3C",
  fontFamily: "inherit",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: "rgba(13,31,60,0.75)" }}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(13,31,60,0.15)", fontSize: 14, fontFamily: "inherit", color: "#0D1F3C", background: "#fff" }}
      />
    </div>
  );
}
