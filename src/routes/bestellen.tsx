import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Package, Truck, ShieldCheck, ArrowLeft } from "lucide-react";
import { VelopassMark } from "@/components/VelopassMark";
import { Footer } from "@/components/Footer";
import { StripeEmbeddedCheckoutForm } from "@/components/StripeEmbeddedCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

type BundleKey = "frameid_1_onetime" | "frameid_2_onetime" | "frameid_5_onetime";

const BUNDLES: Array<{
  key: BundleKey;
  name: string;
  stickers: number;
  price: number; // cents
  tagline: string;
  highlights: string[];
  featured?: boolean;
}> = [
  {
    key: "frameid_1_onetime",
    name: "1",
    stickers: 1,
    price: 1299,
    tagline: "1 Frame-ID voor één fiets",
    highlights: ["Digitaal fietspaspoort", "Diefstalprotectie via QR", "Permanent kleefbaar"],
  },
  {
    key: "frameid_2_onetime",
    name: "2",
    stickers: 2,
    price: 2199,
    tagline: "2 Frame-ID's voor twee fietsen",
    highlights: ["Alles uit Frame-ID 1", "Voordeliger per sticker bij koppels", "Eén bestelling, één levering"],
    featured: true,
  },
  {
    key: "frameid_5_onetime",
    name: "5",
    stickers: 5,
    price: 4495,
    tagline: "5 Frame-ID's voor het hele gezin",
    highlights: ["Alles uit Frame-ID 2", "Beste prijs per sticker", "Ideaal voor 3 tot 5 fietsen"],
  },
];

const eur = (cents: number) =>
  new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(cents / 100);

export const Route = createFileRoute("/bestellen")({
  head: () => ({
    meta: [
      { title: "Bestel een Velopass Frame-ID — vanaf €12,95" },
      {
        name: "description",
        content:
          "Bestel je Velopass Frame-ID. Eén sticker beschermt je fiets met diefstalprotectie, pechhulp en je digitaal fietspaspoort. Gratis verzending.",
      },
      { property: "og:title", content: "Bestel een Velopass Frame-ID — vanaf €12,95" },
      {
        property: "og:description",
        content: "Bescherm je fiets. Gratis verzending. Veilig betalen via Stripe.",
      },
    ],
  }),
  component: BestellenPage,
});

function BestellenPage() {
  const [selected, setSelected] = useState<BundleKey>("frameid_duo_onetime");
  const [quantity, setQuantity] = useState(1);
  const [email, setEmail] = useState("");
  const [stage, setStage] = useState<"select" | "checkout">("select");

  const bundle = BUNDLES.find((b) => b.key === selected)!;
  const total = bundle.price * quantity;

  const returnUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/bestellen/bedankt?session_id={CHECKOUT_SESSION_ID}`
      : "/bestellen/bedankt?session_id={CHECKOUT_SESSION_ID}";

  return (
    <div style={{ background: "#F5F3EE", minHeight: "100vh", color: "#0D1F3C" }}>
      <PaymentTestModeBanner />

      {/* Top nav */}
      <header style={{ padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 1200, margin: "0 auto" }}>
        <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", color: "#0D1F3C" }}>
          <VelopassMark size={28} />
          <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 18 }}>Velopass</span>
        </Link>
        <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, color: "rgba(13,31,60,0.7)", textDecoration: "none" }}>
          <ArrowLeft size={16} /> Terug naar home
        </Link>
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
            Eén Frame-ID op je fiets en je hebt altijd toegang tot diefstalprotectie, pechhulp, verzekering en je fietswinkel. Gratis verzending in heel de EU.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 18, marginTop: 24, fontSize: 13, color: "rgba(255,255,255,0.8)" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Truck size={16} color="#2ECC8A" /> Gratis verzending</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><ShieldCheck size={16} color="#2ECC8A" /> Veilig betalen via Stripe</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Package size={16} color="#2ECC8A" /> Verzending binnen 2 werkdagen</span>
          </div>
        </div>
      </section>

      {/* Content */}
      <main style={{ maxWidth: 1100, margin: "-40px auto 0", padding: "0 24px 72px", position: "relative" }}>
        {stage === "select" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
              {BUNDLES.map((b) => {
                const active = selected === b.key;
                return (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => setSelected(b.key)}
                    style={{
                      textAlign: "left",
                      background: "#fff",
                      borderRadius: 16,
                      padding: 24,
                      border: active ? "2px solid #2ECC8A" : "2px solid transparent",
                      boxShadow: "0 4px 20px rgba(13,31,60,0.08)",
                      cursor: "pointer",
                      position: "relative",
                      transition: "transform .15s ease, border-color .15s ease",
                      transform: active ? "translateY(-2px)" : "none",
                      fontFamily: "DM Sans, sans-serif",
                      color: "#0D1F3C",
                    }}
                  >
                    {b.featured && (
                      <span style={{ position: "absolute", top: 14, right: 14, background: "#2ECC8A", color: "#0D1F3C", fontWeight: 700, fontSize: 11, padding: "4px 8px", borderRadius: 999 }}>
                        Populair
                      </span>
                    )}
                    <p style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 500, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(13,31,60,0.55)", margin: 0 }}>
                      Frame-ID {b.name}
                    </p>
                    <p style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 36, margin: "8px 0 4px", color: "#0D1F3C" }}>
                      {eur(b.price)}
                    </p>
                    <p style={{ fontSize: 13, color: "rgba(13,31,60,0.65)", margin: 0 }}>{b.tagline}</p>
                    <ul style={{ listStyle: "none", padding: 0, margin: "18px 0 0", display: "grid", gap: 8 }}>
                      {b.highlights.map((h) => (
                        <li key={h} style={{ display: "flex", gap: 8, fontSize: 13, color: "rgba(13,31,60,0.8)" }}>
                          <Check size={16} color="#2ECC8A" style={{ flexShrink: 0, marginTop: 2 }} />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                    <div style={{ marginTop: 16, fontSize: 12, color: "rgba(13,31,60,0.5)" }}>
                      {b.stickers} sticker{b.stickers > 1 ? "s" : ""} · incl. BTW
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Cart */}
            <div style={{ background: "#fff", borderRadius: 16, padding: 24, marginTop: 24, boxShadow: "0 4px 20px rgba(13,31,60,0.08)", fontFamily: "DM Sans, sans-serif" }}>
              <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 20, margin: "0 0 16px", color: "#0D1F3C" }}>Je winkelmandje</h2>

              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "12px 0", borderBottom: "1px solid rgba(13,31,60,0.08)" }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, color: "#0D1F3C" }}>Velopass Frame-ID {bundle.name}</p>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(13,31,60,0.6)" }}>{bundle.tagline}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ display: "inline-flex", alignItems: "center", border: "1px solid rgba(13,31,60,0.15)", borderRadius: 10, overflow: "hidden" }}>
                    <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} style={qtyBtn}>−</button>
                    <span style={{ minWidth: 40, textAlign: "center", fontWeight: 600 }}>{quantity}</span>
                    <button type="button" onClick={() => setQuantity((q) => Math.min(10, q + 1))} style={qtyBtn}>+</button>
                  </div>
                  <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 20, color: "#0D1F3C", minWidth: 90, textAlign: "right" }}>
                    {eur(bundle.price * quantity)}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", fontSize: 14, color: "rgba(13,31,60,0.7)" }}>
                <span>Verzending</span>
                <span style={{ color: "#2ECC8A", fontWeight: 600 }}>Gratis</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid rgba(13,31,60,0.08)" }}>
                <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 18, color: "#0D1F3C" }}>Totaal</span>
                <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 22, color: "#0D1F3C" }}>{eur(total)}</span>
              </div>
              <p style={{ fontSize: 12, color: "rgba(13,31,60,0.5)", margin: "4px 0 20px" }}>
                Alle prijzen zijn inclusief BTW. BTW wordt automatisch berekend per land bij de checkout.
              </p>

              <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
                <label htmlFor="email" style={{ fontSize: 13, fontWeight: 500, color: "rgba(13,31,60,0.75)" }}>
                  E-mailadres (voor bevestiging)
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jij@voorbeeld.be"
                  style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(13,31,60,0.15)", fontSize: 14, fontFamily: "inherit", color: "#0D1F3C", background: "#fff" }}
                />
              </div>

              <button
                type="button"
                onClick={() => setStage("checkout")}
                disabled={!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}
                style={{
                  width: "100%",
                  padding: "14px 18px",
                  borderRadius: 12,
                  border: "none",
                  background: !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "rgba(13,31,60,0.2)" : "#0D1F3C",
                  color: "#fff",
                  fontFamily: "DM Sans, sans-serif",
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "not-allowed" : "pointer",
                }}
              >
                Doorgaan naar betalen — {eur(total)}
              </button>
            </div>
          </>
        )}

        {stage === "checkout" && (
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 4px 20px rgba(13,31,60,0.08)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <p style={{ margin: 0, fontSize: 12, color: "rgba(13,31,60,0.6)", fontFamily: "DM Sans, sans-serif", textTransform: "uppercase", letterSpacing: 1.5 }}>
                  Betaling
                </p>
                <h2 style={{ margin: "4px 0 0", fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 22, color: "#0D1F3C" }}>
                  {bundle.name} × {quantity} — {eur(total)}
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
            <StripeEmbeddedCheckoutForm
              priceId={bundle.key}
              quantity={quantity}
              customerEmail={email}
              returnUrl={returnUrl}
            />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

const qtyBtn: React.CSSProperties = {
  width: 36,
  height: 36,
  border: "none",
  background: "transparent",
  fontSize: 18,
  cursor: "pointer",
  color: "#0D1F3C",
  fontFamily: "inherit",
};
