import { useEffect, useState } from "react";
import { Scanner, type IDetectedBarcode } from "@yudiel/react-qr-scanner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { QrCode, CheckCircle2, AlertCircle, X } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialManual?: boolean;
};

export function QrScanDialog({ open, onOpenChange, initialManual = false }: Props) {
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState(initialManual);
  const [manualCode, setManualCode] = useState("");

  // Sync when dialog opens with a different initial mode
  useEffect(() => {
    if (open) setManual(initialManual);
  }, [open, initialManual]);

  const handleScan = (codes: IDetectedBarcode[]) => {
    if (codes.length > 0) {
      const value = codes[0].rawValue;
      setResult(value);
    }
  };

  const handleError = (err: unknown) => {
    const message = err instanceof Error ? err.message : "Camera niet beschikbaar";
    setError(message);
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setManual(false);
    setManualCode("");
  };

  const close = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent
        className="max-w-md p-0 border-0 overflow-hidden flex flex-col z-[300] [&>button]:hidden"
        style={{ background: "#FFFFFF", borderRadius: 20, maxHeight: "85vh", marginTop: 32 }}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Sluiten"
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            zIndex: 20,
            width: 40,
            height: 40,
            borderRadius: 999,
            background: "rgba(13,31,60,0.08)",
            border: "none",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <X size={20} color="#0D1F3C" />
        </button>

        <div style={{ overflowY: "auto", flex: 1, WebkitOverflowScrolling: "touch" }}>

        <DialogHeader style={{ padding: "28px 28px 12px" }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "rgba(46,204,138,0.12)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
            }}
          >
            <QrCode size={24} color="#2ECC8A" strokeWidth={1.8} />
          </div>
          <DialogTitle
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: 22,
              color: "#0D1F3C",
              lineHeight: 1.2,
            }}
          >
            {result ? "Frame-ID gescand" : manual ? "Voer de Velopass-code in" : "Scan de Velopass Frame-ID"}
          </DialogTitle>
          <DialogDescription
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              color: "#5A7090",
              marginTop: 6,
              lineHeight: 1.5,
            }}
          >
            {result
              ? "We hebben de QR-code herkend. Bevestig om de overdracht te starten."
              : manual
                ? "De code staat onderaan de Frame-ID op het frame van je fiets."
                : "Richt je camera op de QR-code. Houd de camera op ongeveer 15 cm van de Frame-ID."}
          </DialogDescription>
        </DialogHeader>

        <div style={{ padding: "0 28px 28px" }}>
          {!result && !error && !manual && (
            <div
              style={{
                position: "relative",
                aspectRatio: "1 / 1",
                borderRadius: 16,
                overflow: "hidden",
                background: "#0D1F3C",
              }}
            >
              <Scanner
                onScan={handleScan}
                onError={handleError}
                constraints={{ facingMode: "environment" }}
                styles={{ container: { width: "100%", height: "100%" }, video: { objectFit: "cover" } }}
                components={{ finder: false }}
              />
              {/* Targeting overlay */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    width: "70%",
                    aspectRatio: "1 / 1",
                    borderRadius: 16,
                    boxShadow: "0 0 0 9999px rgba(13,31,60,0.45)",
                    position: "relative",
                  }}
                >
                  {/* Corner brackets */}
                  {(["tl","tr","bl","br"] as const).map((c) => (
                    <span
                      key={c}
                      style={{
                        position: "absolute",
                        width: 24,
                        height: 24,
                        borderColor: "#2ECC8A",
                        borderStyle: "solid",
                        borderWidth: 0,
                        ...(c === "tl" && { top: -2, left: -2, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 }),
                        ...(c === "tr" && { top: -2, right: -2, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 }),
                        ...(c === "bl" && { bottom: -2, left: -2, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 }),
                        ...(c === "br" && { bottom: -2, right: -2, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 }),
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div
              style={{
                padding: 20,
                borderRadius: 14,
                background: "rgba(220,38,38,0.06)",
                border: "1px solid rgba(220,38,38,0.18)",
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <AlertCircle size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500, color: "#0D1F3C", fontSize: 14 }}>
                  Camera niet beschikbaar
                </div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", color: "#5A7090", fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>
                  Geef toestemming voor de camera in je browserinstellingen, of voer de Frame-ID code handmatig in.
                </div>
                <button
                  onClick={() => setError(null)}
                  style={{
                    marginTop: 12,
                    background: "transparent",
                    border: "1px solid rgba(13,31,60,0.18)",
                    borderRadius: 10,
                    padding: "8px 14px",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    color: "#0D1F3C",
                    cursor: "pointer",
                  }}
                >
                  Opnieuw proberen
                </button>
              </div>
            </div>
          )}

          {result && (
            <div>
              <div
                style={{
                  padding: 18,
                  borderRadius: 14,
                  background: "rgba(46,204,138,0.08)",
                  border: "1px solid rgba(46,204,138,0.25)",
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                <CheckCircle2 size={22} color="#2ECC8A" style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500, color: "#0D1F3C", fontSize: 14 }}>
                    Frame-ID herkend
                  </div>
                  <div
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      color: "#5A7090",
                      fontSize: 12,
                      marginTop: 4,
                      wordBreak: "break-all",
                      lineHeight: 1.5,
                    }}
                  >
                    {result}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                <button
                  onClick={reset}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "1px solid rgba(13,31,60,0.18)",
                    borderRadius: 12,
                    padding: "12px 16px",
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 500,
                    fontSize: 14,
                    color: "#0D1F3C",
                    cursor: "pointer",
                  }}
                >
                  Opnieuw scannen
                </button>
                <a
                  href={result.startsWith("http") ? result : "#tweedehands"}
                  onClick={close}
                  style={{
                    flex: 1,
                    background: "#0D1F3C",
                    color: "#fff",
                    borderRadius: 12,
                    padding: "12px 16px",
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 500,
                    fontSize: 14,
                    textAlign: "center",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  Overdracht starten →
                </a>
              </div>
            </div>
          )}

          {!result && !manual && (
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12,
                color: "#5A7090",
                textAlign: "center",
                marginTop: 14,
                lineHeight: 1.5,
              }}
            >
              Geen camera?{" "}
              <button
                type="button"
                onClick={() => { setManual(true); setError(null); }}
                style={{
                  color: "#0D1F3C",
                  textDecoration: "underline",
                  background: "none",
                  border: "none",
                  padding: 0,
                  font: "inherit",
                  cursor: "pointer",
                }}
              >
                Voer de code handmatig in
              </button>
            </p>
          )}

          {manual && !result && (
            <div>
              <label
                style={{
                  display: "block",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                  color: "#0D1F3C",
                  fontWeight: 500,
                  marginBottom: 8,
                }}
              >
                Velopass-code (10 cijfers)
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                maxLength={10}
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="0000000000"
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 18,
                  letterSpacing: 4,
                  textAlign: "center",
                  color: "#0D1F3C",
                  background: "#F5F7FA",
                  border: "1px solid rgba(13,31,60,0.14)",
                  borderRadius: 12,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <button
                type="button"
                disabled={manualCode.length !== 10}
                onClick={() => setResult(manualCode)}
                style={{
                  width: "100%",
                  marginTop: 14,
                  background: manualCode.length === 10 ? "#0D1F3C" : "rgba(13,31,60,0.35)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 12,
                  padding: "12px 16px",
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 500,
                  fontSize: 14,
                  cursor: manualCode.length === 10 ? "pointer" : "not-allowed",
                }}
              >
                Bevestigen
              </button>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 12,
                  color: "#5A7090",
                  textAlign: "center",
                  marginTop: 14,
                  lineHeight: 1.5,
                }}
              >
                Camera bij de hand?{" "}
                <button
                  type="button"
                  onClick={() => { setManual(false); setManualCode(""); setError(null); }}
                  style={{
                    color: "#0D1F3C",
                    textDecoration: "underline",
                    background: "none",
                    border: "none",
                    padding: 0,
                    font: "inherit",
                    cursor: "pointer",
                  }}
                >
                  Scan de QR-code
                </button>
              </p>
            </div>
          )}
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
