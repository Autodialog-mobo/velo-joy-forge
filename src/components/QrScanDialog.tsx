import { useEffect, useState } from "react";
import { Scanner, type IDetectedBarcode } from "@yudiel/react-qr-scanner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { QrCode, CheckCircle2, AlertCircle, X } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialManual?: boolean;
  /**
   * When provided, the dialog skips the built-in "Overdracht starten" confirmation
   * step and instead emits the recognised/typed code immediately, then closes.
   * Used by flows like the bike-check page that just want the raw code.
   */
  onResult?: (code: string) => void;
};

// The browser owns the "remember this decision" UX for camera permission.
// We can't bypass that prompt — it is a security mechanism enforced by
// Safari / Chrome / Firefox. What we CAN do is peek at
// navigator.permissions.query({ name: 'camera' }) to decide whether to
// show a "blocked" panel up-front when we *know* the user previously
// denied us. When the Permissions API is unsupported (Safari, in-app
// browsers) or the state is "prompt"/"granted", we just hand off to the
// <Scanner /> component and let it own getUserMedia.
//
// We deliberately do NOT pre-warm a separate MediaStream here: holding a
// second stream that is never attached to a video element has been
// observed to make the Scanner's own getUserMedia call fail with
// NotReadableError on some setups ("camera already in use"). The Scanner
// library manages track lifecycle; we unmount it on close/retry via a
// changing `scannerKey` to force a clean teardown of any previous stream.

type CameraPermission = "granted" | "prompt" | "denied" | "unsupported";

async function queryCameraPermission(): Promise<CameraPermission> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) {
    return "unsupported";
  }
  try {
    const status = await navigator.permissions.query({
      name: "camera" as PermissionName,
    });
    return status.state as CameraPermission;
  } catch {
    return "unsupported";
  }
}

type CameraErrorKind = "denied" | "not-found" | "in-use" | "constraints" | "unknown";

function classifyCameraError(err: unknown): { kind: CameraErrorKind; message: string } {
  const name = err instanceof Error ? err.name : "";
  const raw = err instanceof Error ? err.message : String(err ?? "");
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return { kind: "denied", message: "Cameratoegang geweigerd." };
    case "NotFoundError":
    case "DevicesNotFoundError":
      return { kind: "not-found", message: "Geen camera gevonden op dit apparaat." };
    case "NotReadableError":
    case "TrackStartError":
      return { kind: "in-use", message: "De camera wordt al gebruikt door een andere app of tab." };
    case "OverconstrainedError":
    case "ConstraintNotSatisfiedError":
      return { kind: "constraints", message: "Geen geschikte camera gevonden voor deze instellingen." };
    default:
      return { kind: "unknown", message: raw || "Camera kon niet worden gestart." };
  }
}


export function QrScanDialog({ open, onOpenChange, initialManual = false, onResult }: Props) {
  const [result, setResult] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<{ kind: CameraErrorKind; message: string } | null>(null);
  const [manual, setManual] = useState(initialManual);
  const [manualCode, setManualCode] = useState("");
  const [permission, setPermission] = useState<CameraPermission | "checking">("checking");
  // Bumping this key forces the <Scanner /> to unmount + remount, which
  // tears down any previous MediaStream/track and starts a clean
  // getUserMedia attempt. Used on "Opnieuw proberen".
  const [scannerKey, setScannerKey] = useState(0);

  // Sync when dialog opens with a different initial mode
  useEffect(() => {
    if (open) setManual(initialManual);
  }, [open, initialManual]);

  // When the dialog opens for camera scanning, peek at the Permissions API
  // so we can show a "blocked" panel up-front if we *know* the user denied
  // us before. We do NOT pre-call getUserMedia here — the <Scanner />
  // owns that lifecycle. Pre-warming a second stream caused
  // NotReadableError ("camera in use") on some setups.
  useEffect(() => {
    if (!open || manual) return;
    let cancelled = false;
    setPermission("checking");
    void (async () => {
      const state = await queryCameraPermission();
      if (!cancelled) setPermission(state);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, manual]);

  const emitResult = (value: string) => {
    if (onResult) {
      onResult(value);
      setResult(null);
      setCameraError(null);
      setManual(false);
      setManualCode("");
      onOpenChange(false);
      return;
    }
    setResult(value);
  };

  const handleScan = (codes: IDetectedBarcode[]) => {
    if (codes.length > 0) {
      emitResult(codes[0].rawValue);
    }
  };

  const handleError = (err: unknown) => {
    const classified = classifyCameraError(err);
    if (classified.kind === "denied") {
      setPermission("denied");
      setCameraError(null);
      return;
    }
    setCameraError(classified);
  };

  const retryCamera = () => {
    // Full teardown + fresh attempt: clear error, re-check permission,
    // and bump the scanner key so the <Scanner /> remounts with a brand
    // new getUserMedia call (previous tracks are stopped on unmount).
    setCameraError(null);
    setPermission("checking");
    setScannerKey((k) => k + 1);
    void (async () => {
      const state = await queryCameraPermission();
      setPermission(state);
    })();
  };

  const reset = () => {
    setResult(null);
    setCameraError(null);
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
                ? "De code staat rechts verticaal op de Frame-ID sticker op het frame van je fiets."
                : "Richt je camera op de QR-code. Houd de camera op ongeveer 15 cm van de Frame-ID."}
          </DialogDescription>
        </DialogHeader>

        <div style={{ padding: "0 28px 28px" }}>
          {!result && !error && !manual && permission === "denied" && (
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
                  Cameratoegang geblokkeerd
                </div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", color: "#5A7090", fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>
                  Je hebt cameratoegang voor deze site geweigerd. Open de
                  site-instellingen van je browser (slotje in de adresbalk →
                  Camera → Toestaan) en herlaad de pagina. In een in-app
                  browser (Instagram, Facebook…) kun je beter openen in
                  Safari of Chrome.
                </div>
                <button
                  type="button"
                  onClick={() => { setManual(true); }}
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
                  Voer de code handmatig in
                </button>
              </div>
            </div>
          )}

          {!result && !error && !manual && permission !== "denied" && (
            <div
              style={{
                position: "relative",
                aspectRatio: "1 / 1",
                borderRadius: 16,
                overflow: "hidden",
                background: "#0D1F3C",
              }}
            >
              {permission === "checking" ? (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "rgba(255,255,255,0.7)",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                  }}
                >
                  Camera voorbereiden…
                </div>
              ) : (
                <Scanner
                  onScan={handleScan}
                  onError={handleError}
                  constraints={{ facingMode: "environment" }}
                  styles={{ container: { width: "100%", height: "100%" }, video: { objectFit: "cover" } }}
                  components={{ finder: false }}
                />
              )}
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
              {/* Visuele hint: Frame-ID met aanduiding van de code-locatie */}
              <div
                style={{
                  width: "100%",
                  maxWidth: 180,
                  margin: "0 auto 18px",
                }}
              >
                <svg
                  viewBox="0 0 200 130"
                  width="100%"
                  style={{ display: "block", borderRadius: 8 }}
                  aria-hidden="true"
                >
                  <rect x="2" y="2" width="196" height="126" rx="10" fill="#F5F3EE" stroke="rgba(13,31,60,0.14)" />
                  {/* QR mock */}
                  <rect x="16" y="16" width="64" height="64" rx="4" fill="#0D1F3C" />
                  <rect x="22" y="22" width="14" height="14" fill="#F5F3EE" />
                  <rect x="60" y="22" width="14" height="14" fill="#F5F3EE" />
                  <rect x="22" y="60" width="14" height="14" fill="#F5F3EE" />
                  <rect x="42" y="42" width="6" height="6" fill="#F5F3EE" />
                  <rect x="52" y="52" width="6" height="6" fill="#F5F3EE" />
                  {/* Brand */}
                  <text x="92" y="32" fontFamily="'Syne', sans-serif" fontWeight="700" fontSize="12" fill="#0D1F3C">VELOPASS</text>
                  <text x="92" y="48" fontFamily="'DM Sans', sans-serif" fontSize="8" fill="#5A7090">Frame-ID</text>
                  {/* Code regel (gemarkeerd) */}
                  <rect x="14" y="92" width="172" height="22" rx="4" fill="rgba(46,204,138,0.14)" stroke="#2ECC8A" strokeWidth="1.5" />
                  <text x="100" y="107" textAnchor="middle" fontFamily="'DM Sans', sans-serif" fontWeight="600" fontSize="11" fill="#0D1F3C" letterSpacing="1.5">87CH9810171</text>
                  {/* Pijl naar codeveld */}
                  <path d="M100 122 L100 116" stroke="#2ECC8A" strokeWidth="2" strokeLinecap="round" />
                  <path d="M96 119 L100 116 L104 119" stroke="#2ECC8A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              </div>

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
                Velopass-code
              </label>
              <input
                type="text"
                autoComplete="off"
                maxLength={10}
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.slice(0, 10))}
                placeholder="87CH9810171"
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 18,
                  letterSpacing: 2,
                  textAlign: "center",
                  color: "#0D1F3C",
                  background: "#F5F7FA",
                  border: "1px solid rgba(13,31,60,0.14)",
                  borderRadius: 10,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <button
                type="button"
                disabled={manualCode.length === 0}
                onClick={() => emitResult(manualCode)}
                style={{
                  width: "100%",
                  marginTop: 14,
                  background: manualCode.length > 0 ? "#0D1F3C" : "rgba(13,31,60,0.35)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "12px 16px",
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 500,
                  fontSize: 14,
                  cursor: manualCode.length > 0 ? "pointer" : "not-allowed",
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
