const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div style={{ background: "#fee2e2", borderBottom: "1px solid #fca5a5", padding: "8px 16px", textAlign: "center", fontSize: 13, color: "#991b1b" }}>
        Productie-checkout is nog niet geconfigureerd. Voltooi Stripe go-live om echte betalingen te accepteren.
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div style={{ background: "#ffedd5", borderBottom: "1px solid #fdba74", padding: "8px 16px", textAlign: "center", fontSize: 13, color: "#9a3412" }}>
        Alle betalingen in de preview zijn in testmodus. Gebruik kaart 4242 4242 4242 4242.
      </div>
    );
  }
  return null;
}
