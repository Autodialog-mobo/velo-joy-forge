import { useEffect, useState } from "react";
import { Scanner, type IDetectedBarcode } from "@yudiel/react-qr-scanner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { QrCode, CheckCircle2, AlertCircle, X, SwitchCamera, Camera, ArrowRight } from "lucide-react";

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

// Detecteer het platform + browser zodat we gerichte "zo herstel je de
// permissie" stappen kunnen tonen. Volledig client-side, alleen op basis
// van userAgent — goed genoeg om Chrome/Firefox/Safari/iOS/in-app uit
// elkaar te halen, geen analytics.
type BrowserKind =
  | "ios-safari"
  | "ios-chrome"
  | "android-chrome"
  | "android-firefox"
  | "in-app"
  | "desktop-safari"
  | "desktop-firefox"
  | "desktop-chrome"
  | "unknown";

function detectBrowser(): BrowserKind {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  // In-app browsers (Instagram, Facebook, TikTok, LinkedIn, Snapchat, Line,
  // WeChat). Camera-permissie wordt hier vaak niet onthouden en soms
  // helemaal geblokkeerd — we sturen ze door naar de "echte" browser.
  if (/(FBAN|FBAV|Instagram|FB_IAB|LinkedInApp|Snapchat|Line\/|MicroMessenger|TikTok|Pinterest)/i.test(ua)) {
    return "in-app";
  }
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints && (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints! > 1);
  const isAndroid = /Android/i.test(ua);
  if (isIOS) {
    if (/CriOS|EdgiOS|FxiOS/i.test(ua)) return "ios-chrome";
    return "ios-safari";
  }
  if (isAndroid) {
    if (/Firefox/i.test(ua)) return "android-firefox";
    return "android-chrome";
  }
  if (/Firefox/i.test(ua)) return "desktop-firefox";
  // Safari moet vóór Chrome-check omdat Safari ook "Safari" in UA heeft maar Chrome ook
  if (/Safari/i.test(ua) && !/Chrome|Chromium|Edg|OPR/i.test(ua)) return "desktop-safari";
  if (/Chrome|Chromium|Edg|OPR/i.test(ua)) return "desktop-chrome";
  return "unknown";
}

function getPermissionRecoverySteps(browser: BrowserKind): { headline: string; steps: string[]; note?: string } {
  switch (browser) {
    case "desktop-chrome":
      return {
        headline: "Zo zet je de camera weer aan in Chrome / Edge:",
        steps: [
          "Klik op het slotje links in de adresbalk.",
          "Zet 'Camera' op Toestaan.",
          "Herlaad deze pagina.",
        ],
      };
    case "desktop-firefox":
      return {
        headline: "Zo zet je de camera weer aan in Firefox:",
        steps: [
          "Klik op het slotje links in de adresbalk.",
          "Klik bij 'Camera' op het kruisje om de blokkade te verwijderen.",
          "Herlaad deze pagina en kies 'Toestaan' bij de vraag.",
        ],
      };
    case "desktop-safari":
      return {
        headline: "Zo zet je de camera weer aan in Safari:",
        steps: [
          "Safari (menubalk) → Instellingen → Websites → Camera.",
          "Zet velopass.com op 'Toestaan'.",
          "Herlaad deze pagina.",
        ],
      };
    case "ios-safari":
      return {
        headline: "Zo zet je de camera weer aan op iPhone/iPad (Safari):",
        steps: [
          "Tik op 'aA' links in de adresbalk → Website-instellingen.",
          "Zet Camera op 'Toestaan'. (Of: Instellingen-app → Safari → Camera → Vragen/Toestaan.)",
          "Ververs deze pagina.",
        ],
      };
    case "ios-chrome":
      return {
        headline: "Zo zet je de camera weer aan op iPhone/iPad:",
        steps: [
          "Open de Instellingen-app → kies je browser (Chrome / Edge / Firefox).",
          "Zet Camera op Aan.",
          "Ververs deze pagina.",
        ],
      };
    case "android-chrome":
      return {
        headline: "Zo zet je de camera weer aan in Chrome op Android:",
        steps: [
          "Tik op het slotje links in de adresbalk → Machtigingen.",
          "Zet Camera op Toestaan.",
          "Ververs deze pagina.",
        ],
      };
    case "android-firefox":
      return {
        headline: "Zo zet je de camera weer aan in Firefox op Android:",
        steps: [
          "Tik op het slotje links in de adresbalk → Bewerk site-instellingen.",
          "Verwijder de Camera-blokkade.",
          "Ververs deze pagina en kies 'Toestaan'.",
        ],
      };
    case "in-app":
      return {
        headline: "Open deze pagina in je echte browser",
        steps: [
          "Tik op het menu-icoon rechtsboven.",
          "Kies 'Openen in Safari' (iPhone) of 'Openen in Chrome' (Android).",
          "Sta de camera daar toe en scan opnieuw.",
        ],
        note: "In-app browsers van Instagram, Facebook, TikTok e.d. onthouden cameratoegang vaak niet of blokkeren die helemaal.",
      };
    default:
      return {
        headline: "Zet cameratoegang weer aan in je browser",
        steps: [
          "Open de site-instellingen (vaak via het slotje in de adresbalk).",
          "Zet 'Camera' op Toestaan.",
          "Herlaad deze pagina.",
        ],
      };
  }
}

type CameraErrorKind = "denied" | "not-found" | "in-use" | "constraints" | "unknown";

// `@yudiel/react-qr-scanner` levert errors aan als een eigen
// `IScannerError` (een PLAIN object met `{ kind, message, cause }`), NIET
// als DOMException. Daarom mappen we eerst op `err.kind` en pas daarna op
// `err.name` (voor het geval een rauwe Error doorlekt).
function classifyCameraError(err: unknown): { kind: CameraErrorKind; message: string } {
  const e = err as { kind?: string; name?: string; message?: string } | null;
  const kind = e?.kind ?? "";
  const name = e?.name ?? "";
  const raw = typeof e?.message === "string" && e.message ? e.message : "";

  if (kind === "permission-denied" || kind === "security" || name === "NotAllowedError" || name === "SecurityError") {
    return { kind: "denied", message: "Cameratoegang geweigerd." };
  }
  if (kind === "no-camera" || name === "NotFoundError" || name === "DevicesNotFoundError") {
    return { kind: "not-found", message: "Geen camera gevonden op dit apparaat." };
  }
  if (kind === "in-use" || name === "NotReadableError" || name === "TrackStartError") {
    return { kind: "in-use", message: "De camera wordt al gebruikt door een andere app of tab." };
  }
  if (
    kind === "overconstrained" ||
    name === "OverconstrainedError" ||
    name === "ConstraintNotSatisfiedError"
  ) {
    return { kind: "constraints", message: "Geen geschikte camera gevonden voor deze instellingen." };
  }
  if (kind === "insecure-context") {
    return { kind: "unknown", message: "Camera vereist HTTPS." };
  }
  if (kind === "unsupported") {
    return { kind: "unknown", message: "Deze browser ondersteunt geen camera-API." };
  }
  return { kind: "unknown", message: raw || "Camera kon niet worden gestart." };
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
  // Which camera to use. "environment" = achterzijde (standaard, beste voor
  // QR-scans op telefoon/tablet); "user" = front-facing (laptops, selfie-cam).
  // Tablets met meerdere camera's krijgen een wisselknop in beeld.
  // Voorkeur wordt onthouden in localStorage zodat een volgende scan
  // dezelfde camera gebruikt.
  const [facingMode, setFacingMode] = useState<"environment" | "user">(() => {
    if (typeof window === "undefined") return "environment";
    const stored = window.localStorage.getItem("velopass:qr-facing-mode");
    return stored === "user" || stored === "environment" ? stored : "environment";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("velopass:qr-facing-mode", facingMode);
    } catch {
      /* localStorage kan geblokkeerd zijn in privé-modus — negeer stil */
    }
  }, [facingMode]);
  // Lijst van beschikbare videoinput-devices. Labels zijn pas zichtbaar
  // nadat de gebruiker camerapermissie heeft gegeven — daarvoor krijgen we
  // alleen een leeg label terug.
  const [cameras, setCameras] = useState<{ deviceId: string; label: string }[]>([]);
  // Door de gebruiker gekozen specifieke camera (deviceId). Overschrijft
  // facingMode als hij gezet is. Onthouden in localStorage zodat een
  // volgende scan dezelfde fysieke camera gebruikt.
  const [deviceId, setDeviceId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem("velopass:qr-device-id");
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (deviceId) window.localStorage.setItem("velopass:qr-device-id", deviceId);
      else window.localStorage.removeItem("velopass:qr-device-id");
    } catch {
      /* negeer */
    }
  }, [deviceId]);
  // Label van de daadwerkelijk actieve videotrack. De Scanner kiest zelf
  // welke camera bij `facingMode: { ideal: … }` past — we lezen de
  // beschrijving uit het <video>-element zodat we het tonen aan de user.
  const [activeLabel, setActiveLabel] = useState<string | null>(null);



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
      // Lees video-input devices. Labels komen pas binnen nadat de
      // gebruiker permissie heeft gegeven (browser-privacy); zonder labels
      // tonen we een nette fallback ("Camera 1", "Camera 2", …).
      try {
        const devices = await navigator.mediaDevices?.enumerateDevices?.();
        if (!cancelled && devices) {
          const cams = devices
            .filter((d) => d.kind === "videoinput")
            .map((d, i) => ({
              deviceId: d.deviceId,
              label: d.label || `Camera ${i + 1}`,
            }));
          setCameras(cams);
          // Als de opgeslagen deviceId niet meer bestaat (camera ontkoppeld,
          // andere browserprofiel), val terug op facingMode.
          if (deviceId && !cams.some((c) => c.deviceId === deviceId)) {
            setDeviceId(null);
          }
        }
      } catch {
        /* enumerateDevices is best-effort */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, manual, deviceId]);

  // Labels van enumerateDevices zijn pas zichtbaar nadat de scanner
  // permissie heeft gekregen. Luister op `devicechange` (vuurt ook na de
  // eerste grant) en her-enumerate, zodat het selectiemenu de echte
  // cameranamen toont in plaats van "Camera 1/2".
  useEffect(() => {
    if (!open || manual) return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.addEventListener) return;
    const onChange = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cams = devices
          .filter((d) => d.kind === "videoinput")
          .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Camera ${i + 1}` }));
        setCameras(cams);
      } catch {
        /* negeer */
      }
    };
    navigator.mediaDevices.addEventListener("devicechange", onChange);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", onChange);
    };
  }, [open, manual]);

  // Na elke (re)mount van de scanner: even wachten op de
  // getUserMedia-grant en dan de labels opnieuw inlezen. Zonder grant
  // geeft enumerateDevices lege labels terug.
  useEffect(() => {
    if (!open || manual) return;
    const t = setTimeout(async () => {
      try {
        const devices = await navigator.mediaDevices?.enumerateDevices?.();
        if (!devices) return;
        const cams = devices
          .filter((d) => d.kind === "videoinput")
          .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Camera ${i + 1}` }));
        setCameras(cams);
      } catch {
        /* negeer */
      }
    }, 800);
    return () => clearTimeout(t);
  }, [open, manual, scannerKey]);

  // Lees het label van de actieve videotrack uit het door de Scanner
  // gerenderde <video>-element. We pollen een paar keer omdat het stream-
  // object pas na getUserMedia-resolve gekoppeld wordt.
  useEffect(() => {
    if (!open || manual) {
      setActiveLabel(null);
      return;
    }
    let attempts = 0;
    let stopped = false;
    const tick = () => {
      if (stopped) return;
      const root = document.querySelector("[data-qr-scanner-root]");
      const video = root?.querySelector("video") as HTMLVideoElement | null;
      const stream = video?.srcObject as MediaStream | null;
      const track = stream?.getVideoTracks?.()[0];
      if (track?.label) {
        setActiveLabel(track.label);
        return;
      }
      attempts += 1;
      if (attempts < 12) setTimeout(tick, 250);
    };
    const t = setTimeout(tick, 300);
    return () => {
      stopped = true;
      clearTimeout(t);
    };
  }, [open, manual, scannerKey]);

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
    // Als de gekozen camera (deviceId) niet werkt — losgekoppeld, in gebruik,
    // of onverenigbaar met andere constraints — gooi de opgeslagen keuze
    // weg en herstart met facingMode-default. Dit voorkomt dat een stale
    // localStorage-waarde de scanner permanent blokkeert.
    if (
      deviceId &&
      (classified.kind === "constraints" ||
        classified.kind === "not-found" ||
        classified.kind === "in-use" ||
        classified.kind === "unknown")
    ) {
      setDeviceId(null);
      setCameraError(null);
      setScannerKey((k) => k + 1);
      return;
    }
    setCameraError(classified);
  };

  const retryCamera = () => {
    // Full teardown + fresh attempt: clear error, re-check permission, and
    // bump the scanner key so the <Scanner /> remounts with a brand-new
    // getUserMedia call. We ALSO drop the persisted deviceId so a stale
    // selection (camera unplugged, ander browserprofiel) niet blijft falen.
    setCameraError(null);
    setPermission("checking");
    setDeviceId(null);
    setScannerKey((k) => k + 1);
    void (async () => {
      const state = await queryCameraPermission();
      setPermission(state);
    })();
  };

  const selectCamera = (nextDeviceId: string | null) => {
    // Wissel naar een specifieke camera (deviceId) of terug naar
    // facingMode-default (null). Remount de scanner zodat de oude track
    // netjes stopt voor de nieuwe getUserMedia-aanvraag.
    setDeviceId(nextDeviceId);
    setCameraError(null);
    setScannerKey((k) => k + 1);
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
          {!result && !manual && (permission === "denied" || cameraError?.kind === "denied") && (() => {
            const browser = detectBrowser();
            const guide = getPermissionRecoverySteps(browser);
            return (
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
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500, color: "#0D1F3C", fontSize: 14 }}>
                    Cameratoegang geblokkeerd
                  </div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", color: "#5A7090", fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>
                    Je hebt cameratoegang voor deze site geweigerd of geblokkeerd.
                  </div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", color: "#0D1F3C", fontSize: 13, marginTop: 10, fontWeight: 500 }}>
                    {guide.headline}
                  </div>
                  <ol style={{ fontFamily: "'DM Sans', sans-serif", color: "#5A7090", fontSize: 13, marginTop: 6, paddingLeft: 18, lineHeight: 1.55 }}>
                    {guide.steps.map((s, i) => (
                      <li key={i} style={{ marginTop: i === 0 ? 0 : 2 }}>{s}</li>
                    ))}
                  </ol>
                  {guide.note && (
                    <div style={{ fontFamily: "'DM Sans', sans-serif", color: "#5A7090", fontSize: 12, marginTop: 8, fontStyle: "italic", lineHeight: 1.5 }}>
                      {guide.note}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={retryCamera}
                      style={{
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
                      Ik heb het toegestaan — opnieuw proberen
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCameraError(null); setManual(true); }}
                      style={{
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
              </div>
            );
          })()}

          {!result && !cameraError && !manual && permission !== "denied" && (
            <div
              data-qr-scanner-root
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
                  key={scannerKey}
                  onScan={handleScan}
                  onError={handleError}
                  constraints={
                    deviceId
                      ? { deviceId: { exact: deviceId } }
                      : { facingMode: { ideal: facingMode } }
                  }
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
              {activeLabel && permission !== "checking" && (
                <div
                  aria-live="polite"
                  style={{
                    position: "absolute",
                    top: 12,
                    left: 12,
                    right: 12,
                    zIndex: 10,
                    padding: "6px 10px",
                    borderRadius: 999,
                    background: "rgba(13,31,60,0.72)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    color: "#fff",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 12,
                    lineHeight: 1.3,
                    backdropFilter: "blur(6px)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    width: "fit-content",
                    maxWidth: "calc(100% - 24px)",
                    margin: "0 auto",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                  }}
                  title={activeLabel}
                >
                  <Camera size={13} color="#fff" strokeWidth={2} style={{ flexShrink: 0 }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{activeLabel}</span>
                </div>
              )}
              {cameras.length > 1 && permission !== "checking" && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 12,
                    left: 12,
                    right: 12,
                    zIndex: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <SwitchCamera size={18} color="#fff" strokeWidth={1.8} style={{ flexShrink: 0, opacity: 0.9 }} />
                  <select
                    aria-label="Kies camera"
                    value={deviceId ?? `__facing:${facingMode}`}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v.startsWith("__facing:")) {
                        const fm = v.slice("__facing:".length) as "environment" | "user";
                        setFacingMode(fm);
                        selectCamera(null);
                      } else {
                        selectCamera(v);
                      }
                    }}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      background: "rgba(13,31,60,0.72)",
                      color: "#fff",
                      border: "1px solid rgba(255,255,255,0.18)",
                      borderRadius: 10,
                      padding: "8px 10px",
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 13,
                      cursor: "pointer",
                      backdropFilter: "blur(6px)",
                      appearance: "none",
                      WebkitAppearance: "none",
                    }}
                  >
                    <option value="__facing:environment">Achtercamera (auto)</option>
                    <option value="__facing:user">Frontcamera (auto)</option>
                    {cameras.map((c) => (
                      <option key={c.deviceId} value={c.deviceId}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}




          {cameraError && (
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
                  {cameraError.kind === "not-found"
                    ? "Geen camera gevonden"
                    : cameraError.kind === "in-use"
                      ? "Camera is bezet"
                      : cameraError.kind === "constraints"
                        ? "Camera niet geschikt"
                        : "Camera kon niet starten"}
                </div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", color: "#5A7090", fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>
                  {cameraError.kind === "in-use"
                    ? "Sluit andere apps of tabbladen die de camera gebruiken (bv. Zoom, Teams, Photo Booth) en probeer opnieuw."
                    : cameraError.kind === "not-found"
                      ? "We konden geen camera op dit apparaat vinden. Voer de Frame-ID code handmatig in."
                      : cameraError.kind === "constraints"
                        ? "Je camera ondersteunt de gevraagde instellingen niet. Voer de code handmatig in."
                        : `${cameraError.message} Probeer opnieuw of voer de code handmatig in.`}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={retryCamera}
                    style={{
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
                  <button
                    type="button"
                    onClick={() => { setCameraError(null); setManual(true); }}
                    style={{
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
                    Voer code handmatig in
                  </button>
                </div>
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
                    gap: 8,
                  }}
                >
                  Overdracht starten <ArrowRight size={16} strokeWidth={2} />
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
                onClick={() => { setManual(true); setCameraError(null); }}
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
                  onClick={() => { setManual(false); setManualCode(""); setCameraError(null); }}
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
