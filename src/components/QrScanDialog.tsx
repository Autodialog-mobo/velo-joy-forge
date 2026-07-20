import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { useTranslation } from "react-i18next";
import { Scanner, type IDetectedBarcode, type IScannerHandle } from "@yudiel/react-qr-scanner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { QrCode, CheckCircle2, AlertCircle, X, SwitchCamera, Camera, ArrowRight, ChevronRight, Copy, Check, Flashlight, FlashlightOff, Sun, SunDim } from "lucide-react";

type TFn = (key: string, opts?: Record<string, unknown>) => string;

/** Render een instructiestap waarin "→"-tekens vervangen worden door een
 *  Lucide ChevronRight-icoon (zodat we geen tekstsymbolen als icoon gebruiken). */
function renderStep(step: string): ReactNode {
  const parts = step.split("→").map((p) => p.trim());
  if (parts.length === 1) return step;
  return parts.map((p, i) => (
    <Fragment key={i}>
      {i > 0 && (
        <ChevronRight
          size={13}
          strokeWidth={2}
          aria-hidden="true"
          style={{ display: "inline", verticalAlign: "-2px", margin: "0 4px", opacity: 0.7 }}
        />
      )}
      {p}
    </Fragment>
  ));
}

/** Centrale safe-area helper. Geeft een CSS-waarde terug die de basis-offset
 *  combineert met `env(safe-area-inset-*)` zodat overlay-knoppen (torch, boost,
 *  cameralabel, sluitknop) consistent uit de buurt blijven van notches,
 *  statusbalken en on-screen controls op mobiele toestellen. */
type SafeSide = "top" | "right" | "bottom" | "left";
function safeInset(side: SafeSide, basePx = 0): string {
  return `calc(${basePx}px + env(safe-area-inset-${side}, 0px))`;
}

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
  /**
   * "velopass" (default): only QR, in-dialog manual fallback for 10-char Velopass codes.
   * "frame": QR + common 1D barcodes (code_128/39, ean_13, …) for frame-number stickers.
   *   No in-dialog manual fallback — the caller hosts the manual input on its own page.
   */
  scanMode?: "velopass" | "frame";
  /** Optional header overrides — used by the bike-check frame-barcode flow. */
  labels?: {
    title?: string;
    description?: string;
  };
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

function getRecoveryKey(browser: BrowserKind): string {
  switch (browser) {
    case "desktop-chrome": return "desktop_chrome";
    case "desktop-firefox": return "desktop_firefox";
    case "desktop-safari": return "desktop_safari";
    case "ios-safari": return "ios_safari";
    case "ios-chrome": return "ios_chrome";
    case "android-chrome": return "android_chrome";
    case "android-firefox": return "android_firefox";
    case "in-app": return "in_app";
    default: return "default";
  }
}

function getPermissionRecoverySteps(browser: BrowserKind, t: TFn): { headline: string; steps: string[]; note?: string } {
  const key = getRecoveryKey(browser);
  const steps = t(`recovery.${key}.steps`, { returnObjects: true }) as unknown;
  const note = t(`recovery.${key}.note`, { defaultValue: "" });
  return {
    headline: t(`recovery.${key}.headline`),
    steps: Array.isArray(steps) ? (steps as string[]) : [],
    ...(note ? { note } : {}),
  };
}

type CameraErrorKind = "denied" | "not-found" | "in-use" | "constraints" | "unknown";

// `@yudiel/react-qr-scanner` levert errors aan als een eigen
// `IScannerError` (een PLAIN object met `{ kind, message, cause }`), NIET
// als DOMException. Daarom mappen we eerst op `err.kind` en pas daarna op
// `err.name` (voor het geval een rauwe Error doorlekt).
function classifyCameraError(err: unknown, t: TFn): { kind: CameraErrorKind; message: string } {
  const e = err as { kind?: string; name?: string; message?: string } | null;
  const kind = e?.kind ?? "";
  const name = e?.name ?? "";
  const raw = typeof e?.message === "string" && e.message ? e.message : "";

  if (kind === "permission-denied" || kind === "security" || name === "NotAllowedError" || name === "SecurityError") {
    return { kind: "denied", message: t("error.denied") };
  }
  if (kind === "no-camera" || name === "NotFoundError" || name === "DevicesNotFoundError") {
    return { kind: "not-found", message: t("error.not_found_msg") };
  }
  if (kind === "in-use" || name === "NotReadableError" || name === "TrackStartError") {
    return { kind: "in-use", message: t("error.in_use_msg") };
  }
  if (
    kind === "overconstrained" ||
    name === "OverconstrainedError" ||
    name === "ConstraintNotSatisfiedError"
  ) {
    return { kind: "constraints", message: t("error.constraints_msg") };
  }
  if (kind === "insecure-context") {
    return { kind: "unknown", message: t("error.https") };
  }
  if (kind === "unsupported") {
    return { kind: "unknown", message: t("error.unsupported") };
  }
  return { kind: "unknown", message: raw || t("error.generic") };
}


export function QrScanDialog({ open, onOpenChange, initialManual = false, onResult, scanMode = "velopass", labels }: Props) {
  const { t } = useTranslation("qr-scan");
  const isFrameMode = scanMode === "frame";
  const [result, setResult] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<{ kind: CameraErrorKind; message: string } | null>(null);
  const [manual, setManual] = useState(initialManual);
  const [manualCode, setManualCode] = useState("");
  const [manualFocused, setManualFocused] = useState(false);
  const [exampleCopied, setExampleCopied] = useState(false);
  const manualInputRef = useRef<HTMLInputElement>(null);
  const MANUAL_MAX = 10;
  const sanitizeManual = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, MANUAL_MAX);
  const copyExample = async () => {
    const value = "UC9K4D3NCJ";
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const ta = document.createElement("textarea");
        ta.value = value;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setManualCode(sanitizeManual(value));
      setExampleCopied(true);
      window.setTimeout(() => setExampleCopied(false), 1400);
    } catch {
      setManualCode(sanitizeManual(value));
    }
  };
  const [permission, setPermission] = useState<CameraPermission | "checking">("checking");
  // Bumping this key forces the <Scanner /> to unmount + remount, which
  // tears down any previous MediaStream/track and starts a clean
  // getUserMedia attempt. Used on "Opnieuw proberen".
  const [scannerKey, setScannerKey] = useState(0);
  // Torch / zaklamp: alleen ondersteund op telefoons met een back-camera
  // die `MediaStreamTrack.getCapabilities().torch` rapporteert (vooral
  // Chrome/Edge op Android). iOS Safari ondersteunt dit niet.
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const torchTrackRef = useRef<MediaStreamTrack | null>(null);
  // Korte pauze van de decoder na een torch-toggle: dwingt een "verse"
  // leespoging af zodra de belichting/witbalans zich heeft aangepast.
  const [scanPaused, setScanPaused] = useState(false);
  // Korte bevestigingsbadge na een torch-toggle: "Zaklamp aan" / "Zaklamp uit".
  const [torchFlash, setTorchFlash] = useState<"on" | "off" | null>(null);
  const torchFlashTimerRef = useRef<number | null>(null);
  // Software/hardware "boost" voor donkere omstandigheden zonder torch:
  // verhoogt CSS brightness/contrast op de video én probeert
  // exposureCompensation/brightness/contrast via track-constraints.
  const [boostOn, setBoostOn] = useState(false);
  const [boostHint, setBoostHint] = useState(false);
  // Zodra een QR/barcode gelezen is, verbergen/pauzeren we de scanner
  // onmiddellijk. Wachten op de controlled Dialog-close of parent lookup
  // laat de camera op sommige browsers nog zichtbaar doorlopen.
  const [closingAfterResult, setClosingAfterResult] = useState(false);
  const resultEmittedRef = useRef(false);
  const scannerRef = useRef<IScannerHandle | null>(null);
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
    if (open) {
      resultEmittedRef.current = false;
      setClosingAfterResult(false);
      setScanPaused(false);
      setManual(initialManual);
    }
  }, [open, initialManual]);

  // When the dialog opens for camera scanning, peek at the Permissions API
  // so we can show a "blocked" panel up-front if we *know* the user denied
  // us before. We do NOT pre-call getUserMedia here — the <Scanner />
  // owns that lifecycle. Pre-warming a second stream caused
  // NotReadableError ("camera in use") on some setups.
  useEffect(() => {
    if (!open || manual || closingAfterResult) return;
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
  }, [open, manual, deviceId, closingAfterResult]);

  // Labels van enumerateDevices zijn pas zichtbaar nadat de scanner
  // permissie heeft gekregen. Luister op `devicechange` (vuurt ook na de
  // eerste grant) en her-enumerate, zodat het selectiemenu de echte
  // cameranamen toont in plaats van "Camera 1/2".
  useEffect(() => {
    if (!open || manual || closingAfterResult) return;
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
  }, [open, manual, closingAfterResult]);

  // Na elke (re)mount van de scanner: even wachten op de
  // getUserMedia-grant en dan de labels opnieuw inlezen. Zonder grant
  // geeft enumerateDevices lege labels terug.
  useEffect(() => {
    if (!open || manual || closingAfterResult) return;
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
  }, [open, manual, scannerKey, closingAfterResult]);

  // Lees het label van de actieve videotrack uit het door de Scanner
  // gerenderde <video>-element. We pollen een paar keer omdat het stream-
  // object pas na getUserMedia-resolve gekoppeld wordt.
  useEffect(() => {
    if (!open || manual || closingAfterResult) {
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
  }, [open, manual, scannerKey, closingAfterResult]);

  // Detecteer of de actieve videotrack een torch (zaklamp) ondersteunt.
  // Pollen omdat het stream-object pas na getUserMedia-resolve beschikbaar is.
  useEffect(() => {
    if (!open || manual || closingAfterResult) {
      setTorchSupported(false);
      setTorchOn(false);
      setTorchFlash(null);
      if (torchFlashTimerRef.current !== null) {
        window.clearTimeout(torchFlashTimerRef.current);
        torchFlashTimerRef.current = null;
      }
      torchTrackRef.current = null;
      return;
    }
    // Reset state direct bij (re)mount/camera-wissel: de vorige track is
    // dood, dus de badge mag de oude status niet langer tonen.
    setTorchSupported(false);
    setTorchOn(false);
    setTorchFlash(null);
    if (torchFlashTimerRef.current !== null) {
      window.clearTimeout(torchFlashTimerRef.current);
      torchFlashTimerRef.current = null;
    }
    torchTrackRef.current = null;

    let attempts = 0;
    let stopped = false;
    let pollId: number | null = null;
    let trackListenersTrack: MediaStreamTrack | null = null;
    const onTrackEnded = () => {
      // De stream is gestopt (bv. camera-wissel via <Scanner />): badge en
      // status onmiddellijk resetten zodat de UI de werkelijkheid volgt.
      setTorchSupported(false);
      setTorchOn(false);
      setTorchFlash(null);
      torchTrackRef.current = null;
    };
    const tick = () => {
      if (stopped) return;
      const root = document.querySelector("[data-qr-scanner-root]");
      const video = root?.querySelector("video") as HTMLVideoElement | null;
      const stream = video?.srcObject as MediaStream | null;
      const track = stream?.getVideoTracks?.()[0];
      if (track && track.readyState === "live") {
        const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & {
          torch?: boolean;
        };
        if (caps.torch) {
          torchTrackRef.current = track;
          setTorchSupported(true);
          // Sync werkelijke torch-status van de nieuwe track (kan op
          // sommige Androids "true" zijn als de browser de constraint
          // van een vorige sessie heeft hersteld).
          const settings = (track.getSettings?.() ?? {}) as MediaTrackSettings & {
            torch?: boolean;
          };
          if (typeof settings.torch === "boolean") setTorchOn(settings.torch);
          else setTorchOn(false);
          // Houd UI gesynchroniseerd als de track later stopt.
          trackListenersTrack = track;
          track.addEventListener("ended", onTrackEnded);
          return;
        }
      }
      attempts += 1;
      if (attempts < 12) pollId = window.setTimeout(tick, 250);
    };
    const t = window.setTimeout(tick, 350);
    return () => {
      stopped = true;
      clearTimeout(t);
      if (pollId !== null) clearTimeout(pollId);
      if (trackListenersTrack) {
        trackListenersTrack.removeEventListener("ended", onTrackEnded);
      }
      // Zet torch uit bij unmount/remount zodat hij niet "vergeten" blijft branden.
      const tr = torchTrackRef.current;
      if (tr && tr.readyState === "live") {
        tr.applyConstraints({
          advanced: [{ torch: false } as unknown as MediaTrackConstraintSet],
        }).catch(() => {});
      }
      torchTrackRef.current = null;
      setTorchSupported(false);
      setTorchOn(false);
      setTorchFlash(null);
      if (torchFlashTimerRef.current !== null) {
        window.clearTimeout(torchFlashTimerRef.current);
        torchFlashTimerRef.current = null;
      }
    };
  }, [open, manual, scannerKey, deviceId, facingMode, closingAfterResult]);

  const toggleTorch = async () => {
    // Re-resolve the live track from the DOM every time. The <Scanner />
    // may have restarted the stream (e.g. after a camera switch or a
    // remount), which leaves `torchTrackRef.current` pointing at a stopped
    // track whose applyConstraints() silently no-ops on Android Chrome.
    const root = document.querySelector("[data-qr-scanner-root]");
    const video = root?.querySelector("video") as HTMLVideoElement | null;
    const stream = video?.srcObject as MediaStream | null;
    const liveTrack = stream?.getVideoTracks?.()[0] ?? null;
    const track =
      liveTrack && liveTrack.readyState === "live" ? liveTrack : torchTrackRef.current;
    if (!track || track.readyState !== "live") return;
    torchTrackRef.current = track;

    const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & {
      torch?: boolean;
    };
    if (!caps.torch) {
      setTorchSupported(false);
      return;
    }

    const next = !torchOn;
    try {
      await track.applyConstraints({
        advanced: [{ torch: next } as unknown as MediaTrackConstraintSet],
      });
      // Verify the device actually accepted the change (some Androids
      // accept the promise but leave the LED off until the next frame).
      const settings = (track.getSettings?.() ?? {}) as MediaTrackSettings & {
        torch?: boolean;
      };
      const applied = typeof settings.torch === "boolean" ? settings.torch : next;
      setTorchOn(applied);
      // Bevestigingsbadge: toon ~1500ms "Zaklamp aan/uit" met fade+scale.
      setTorchFlash(applied ? "on" : "off");
      if (torchFlashTimerRef.current !== null) {
        window.clearTimeout(torchFlashTimerRef.current);
      }
      torchFlashTimerRef.current = window.setTimeout(() => {
        setTorchFlash(null);
        torchFlashTimerRef.current = null;
      }, 1500);
      // Korte retry: pauzeer decoder ~280ms zodat auto-exposure/witbalans
      // zich aanpast aan de nieuwe lichtomstandigheden, en hervat dan met
      // een verse leespoging.
      setScanPaused(true);
      window.setTimeout(() => setScanPaused(false), 280);
    } catch (err) {
      // Sommige toestellen blokkeren torch bij bepaalde resoluties of
      // wanneer de track al door een andere consumer geclaimd is.
      // eslint-disable-next-line no-console
      console.warn("[QrScanDialog] torch toggle failed", err);
      setTorchSupported(false);
    }
  };

  // Fallback wanneer er geen torch is: software-boost (CSS-filter op de
  // video) + best-effort hardware-bump van exposure/brightness/contrast.
  // Toont kort een hint als zelfs dat niet helpt op donkere scènes.
  const toggleBoost = async () => {
    const next = !boostOn;
    setBoostOn(next);
    setBoostHint(next);
    window.setTimeout(() => setBoostHint(false), 2200);
    try {
      const root = document.querySelector("[data-qr-scanner-root]");
      const video = root?.querySelector("video") as HTMLVideoElement | null;
      const stream = video?.srcObject as MediaStream | null;
      const track = stream?.getVideoTracks?.()[0];
      if (!track || track.readyState !== "live") return;
      const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & {
        exposureCompensation?: { max?: number; min?: number };
        brightness?: { max?: number; min?: number };
        contrast?: { max?: number; min?: number };
        iso?: { max?: number; min?: number };
        exposureMode?: string[];
      };
      const advanced: MediaTrackConstraintSet[] = [];
      if (next) {
        if (caps.exposureMode?.includes("manual") || caps.exposureMode?.includes("continuous")) {
          advanced.push({ exposureMode: "continuous" } as MediaTrackConstraintSet);
        }
        if (caps.exposureCompensation?.max !== undefined) {
          advanced.push({ exposureCompensation: caps.exposureCompensation.max } as unknown as MediaTrackConstraintSet);
        }
        if (caps.brightness?.max !== undefined) {
          advanced.push({ brightness: caps.brightness.max } as unknown as MediaTrackConstraintSet);
        }
        if (caps.contrast?.max !== undefined) {
          advanced.push({ contrast: caps.contrast.max } as unknown as MediaTrackConstraintSet);
        }
        if (caps.iso?.max !== undefined) {
          advanced.push({ iso: caps.iso.max } as unknown as MediaTrackConstraintSet);
        }
      } else {
        if (caps.exposureCompensation?.min !== undefined) {
          advanced.push({ exposureCompensation: 0 } as unknown as MediaTrackConstraintSet);
        }
      }
      if (advanced.length > 0) {
        await track.applyConstraints({ advanced }).catch(() => {});
      }
      // Korte decoder-pauze zodat de auto-exposure/witbalans zich kan
      // aanpassen aan de nieuwe instellingen.
      setScanPaused(true);
      window.setTimeout(() => setScanPaused(false), 320);
    } catch {
      /* stille fallback — de CSS-filter doet het zware werk */
    }
  };


  // Immediately stop every active videotrack the Scanner has attached.
  // Radix Dialog delays the actual unmount for its close animation, so
  // relying on the Scanner's own cleanup means the camera preview keeps
  // running for the full exit transition. Yanking the tracks here makes
  // the video freeze/black out in the same tick as the scan.
  const stopCameraTracksNow = () => {
    if (typeof document === "undefined") return;
    try {
      const activeStream = scannerRef.current?.getStream?.() ?? null;
      activeStream?.getTracks?.().forEach((track) => {
        try { track.stop(); } catch { /* ignore */ }
      });
      const activeVideo = scannerRef.current?.getVideoElement?.() ?? null;
      if (activeVideo) {
        try { activeVideo.pause(); } catch { /* ignore */ }
        try { activeVideo.srcObject = null; } catch { /* ignore */ }
        activeVideo.removeAttribute("src");
        try { activeVideo.load(); } catch { /* ignore */ }
      }
      const root = document.querySelector("[data-qr-scanner-root]");
      const videos = [
        ...Array.from(root?.querySelectorAll("video") ?? []),
        ...Array.from(document.querySelectorAll("video")),
      ] as HTMLVideoElement[];
      for (const video of videos) {
        const stream = video.srcObject as MediaStream | null;
        stream?.getTracks?.().forEach((track) => {
          try { track.stop(); } catch { /* ignore */ }
        });
        try { video.pause(); } catch { /* ignore */ }
        try { video.srcObject = null; } catch { /* ignore */ }
        video.removeAttribute("src");
        try { video.load(); } catch { /* ignore */ }
      }
    } catch {
      /* best-effort — Scanner unmount will finish the job */
    }
  };

  const emitResult = (value: string) => {
    if (resultEmittedRef.current) return;
    resultEmittedRef.current = true;
    // Yank the camera stream in the SAME tick as the detection, before any
    // React re-render or parent lookup runs. In the onResult flow we also
    // render `null` while closing, so Radix' exit presence cannot keep the
    // final camera frame on screen.
    stopCameraTracksNow();
    if (onResult) {
      flushSync(() => {
        setClosingAfterResult(true);
        setActiveLabel(null);
        setTorchSupported(false);
        setTorchOn(false);
        setBoostOn(false);
        setResult(null);
        setCameraError(null);
        setManual(false);
        setManualCode("");
        onOpenChange(false);
      });
      stopCameraTracksNow();
      window.requestAnimationFrame(stopCameraTracksNow);
      onResult(value);
      return;
    }
    // Homepage flow: show the confirmation panel, but first pause the
    // decoder and hard-stop the video so the result screen doesn't render
    // on top of a still-live camera preview.
    flushSync(() => {
      setActiveLabel(null);
      setTorchSupported(false);
      setTorchOn(false);
      setBoostOn(false);
      setResult(value);
    });
    stopCameraTracksNow();
    window.requestAnimationFrame(stopCameraTracksNow);
  };

  const handleScan = (codes: IDetectedBarcode[]) => {
    if (codes.length === 0 || resultEmittedRef.current) return;
    emitResult(codes[0].rawValue);
  };

  const handleError = (err: unknown) => {
    const classified = classifyCameraError(err, t);
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
    resultEmittedRef.current = false;
    setClosingAfterResult(false);
    setScanPaused(false);
    stopCameraTracksNow();
    setResult(null);
    setCameraError(null);
    setManual(false);
    setManualCode("");

  };

  const close = () => {
    reset();
    onOpenChange(false);
  };

  if (closingAfterResult) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent
        className="max-w-md p-0 border-0 overflow-hidden flex flex-col z-[300] [&>button]:hidden"
        style={{ background: "#FFFFFF", borderRadius: 20, maxHeight: "85vh", marginTop: 32 }}
      >
        <button
          type="button"
          onClick={close}
          aria-label={t("close")}
          style={{
            position: "absolute",
            top: safeInset("top", 16),
            right: safeInset("right", 16),
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
            {result
              ? (isFrameMode ? (labels?.title ?? t("title.result_frame")) : t("title.result_velopass"))
              : manual
                ? t("title.manual")
                : (labels?.title ?? (isFrameMode ? t("title.scan_frame") : t("title.scan_velopass")))}
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
              ? (isFrameMode
                  ? t("description.result_frame")
                  : t("description.result_velopass"))
              : manual
                ? t("description.manual")
                : (labels?.description ?? (isFrameMode
                    ? t("description.scan_frame")
                    : t("description.scan_velopass")))}
          </DialogDescription>
        </DialogHeader>

        <div style={{ padding: "0 28px 28px" }}>
          {!result && !manual && (permission === "denied" || cameraError?.kind === "denied") && (() => {
            const browser = detectBrowser();
            const guide = getPermissionRecoverySteps(browser, t);
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
                    {t("permission.blocked_title")}
                  </div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", color: "#5A7090", fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>
                    {t("permission.blocked_body")}
                  </div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", color: "#0D1F3C", fontSize: 13, marginTop: 10, fontWeight: 500 }}>
                    {guide.headline}
                  </div>
                  <ol style={{ fontFamily: "'DM Sans', sans-serif", color: "#5A7090", fontSize: 13, marginTop: 6, paddingLeft: 18, lineHeight: 1.55 }}>
                    {guide.steps.map((s, i) => (
                      <li key={i} style={{ marginTop: i === 0 ? 0 : 2 }}>{renderStep(s)}</li>
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
                      {t("permission.retry")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (isFrameMode) { close(); return; }
                        setCameraError(null); setManual(true);
                      }}
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
                      {isFrameMode ? t("permission.manual_fallback_close") : t("permission.manual_fallback")}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {!result && !cameraError && !manual && permission !== "denied" && !closingAfterResult && (
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
              <Scanner
                ref={scannerRef}
                key={scannerKey}
                onScan={handleScan}
                onError={handleError}
                paused={scanPaused}
                // QR always. In frame mode we ook 1D-barcodes (Code-128/39,
                // EAN, UPC, ITF, Codabar) zodat de framenummer-sticker direct
                // gelezen wordt. BarcodeDetector wordt gebruikt waar
                // ondersteund; anders valt de library terug op zxing-wasm.
                formats={isFrameMode
                  ? ["qr_code", "code_128", "code_39", "code_93", "codabar", "ean_13", "ean_8", "itf", "upc_a", "upc_e", "data_matrix"]
                  : ["qr_code"]}
                // Snelle detectielus. Het "hangende beeld" na een scan
                // wordt niet opgelost door retryDelay te verhogen, maar door
                // de scanner direct te unmounten (`closingAfterResult`) +
                // de tracks synchroon te stoppen in `emitResult`. Hou hier
                // dus de originele lage waardes aan zodat detectie snappy
                // voelt zoals voordien.
                scanDelay={0}
                retryDelay={30}
                sound={false}
                constraints={{
                  ...(deviceId
                    ? { deviceId: { exact: deviceId } }
                    : { facingMode: { ideal: facingMode } }),
                  // 720p houdt frames licht genoeg om snel te detecteren,
                  // maar blijft scherp genoeg voor Frame-ID QR-codes.
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                  frameRate: { ideal: 30 },
                  // Continu scherpstellen / belichten / witbalans — door de
                  // browser/camera ondersteund waar mogelijk, anders genegeerd.
                  advanced: ([
                    { focusMode: "continuous" },
                    { exposureMode: "continuous" },
                    { whiteBalanceMode: "continuous" },
                  ] as unknown) as MediaTrackConstraintSet[],

                }}
                styles={{ container: { width: "100%", height: "100%" }, video: { objectFit: "cover" } }}
                components={{ finder: false }}
              />

              {permission === "checking" && (
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
                  {t("preparing_camera")}
                </div>
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
                     top: safeInset("top", 12),
                     left: safeInset("left", 12),
                     right: safeInset("right", 12),
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
              {torchSupported && permission !== "checking" && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  disabled={scanPaused}
                  aria-label={torchOn ? t("torch.on_aria") : t("torch.off_aria")}
                  aria-pressed={torchOn}
                  aria-disabled={scanPaused}
                  title={scanPaused ? t("torch.wait") : torchOn ? t("torch.on_title") : t("torch.off_title")}
                  style={{
                    position: "absolute",
                    top: safeInset("top", 12),
                    right: safeInset("right", 12),
                    zIndex: 11,
                    width: 38,
                    height: 38,
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.22)",
                    background: torchOn ? "rgba(255,209,77,0.92)" : "rgba(13,31,60,0.72)",
                    color: torchOn ? "#0D1F3C" : "#fff",
                    backdropFilter: "blur(6px)",
                    cursor: scanPaused ? "not-allowed" : "pointer",
                    opacity: scanPaused ? 0.55 : 1,
                    pointerEvents: scanPaused ? "none" : "auto",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: torchOn ? "0 0 18px rgba(255,209,77,0.55)" : "none",
                    transition: "background 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease",
                  }}
                >
                  {torchOn
                    ? <Flashlight size={18} strokeWidth={2} />
                    : <FlashlightOff size={18} strokeWidth={2} />}
                </button>
              )}
              {permission !== "checking" && (
                <button
                  type="button"
                  onClick={toggleBoost}
                  disabled={scanPaused}
                  aria-label={boostOn ? t("boost.on_aria") : t("boost.off_aria")}
                  aria-pressed={boostOn}
                  title={boostOn ? t("boost.on_title") : t("boost.off_title")}
                  style={{
                    position: "absolute",
                    top: safeInset("top", torchSupported ? 58 : 12),
                    right: safeInset("right", 12),
                    zIndex: 11,
                    width: 38,
                    height: 38,
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.22)",
                    background: boostOn ? "rgba(255,228,138,0.92)" : "rgba(13,31,60,0.72)",
                    color: boostOn ? "#0D1F3C" : "#fff",
                    backdropFilter: "blur(6px)",
                    cursor: scanPaused ? "not-allowed" : "pointer",
                    opacity: scanPaused ? 0.55 : 1,
                    pointerEvents: scanPaused ? "none" : "auto",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: boostOn ? "0 0 18px rgba(255,228,138,0.5)" : "none",
                    transition: "background 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease",
                  }}
                >
                  {boostOn ? <Sun size={18} strokeWidth={2} /> : <SunDim size={18} strokeWidth={2} />}
                </button>
              )}
              {boostOn && (
                <style>{`[data-qr-scanner-root] video { filter: brightness(1.35) contrast(1.18) saturate(1.05); transition: filter 200ms ease; }`}</style>
              )}
              {boostHint && (
                <div
                  aria-live="polite"
                  role="status"
                  style={{
                    position: "absolute",
                    top: safeInset("top", torchSupported ? 106 : 60),
                    left: 0,
                    right: 0,
                    zIndex: 13,
                    display: "flex",
                    justifyContent: "center",
                    pointerEvents: "none",
                    padding: "0 12px",
                    animation: "qr-torch-pop 220ms cubic-bezier(0.2,0.9,0.3,1.3)",
                  }}
                >
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 14px",
                      borderRadius: 999,
                      background: boostOn ? "rgba(255,228,138,0.96)" : "rgba(13,31,60,0.86)",
                      color: boostOn ? "#0D1F3C" : "#fff",
                      border: "1px solid rgba(255,255,255,0.4)",
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 13,
                      fontWeight: 600,
                      boxShadow: "0 6px 22px rgba(0,0,0,0.25)",
                      backdropFilter: "blur(6px)",
                      maxWidth: "calc(100% - 24px)",
                      textAlign: "center",
                    }}
                  >
                    {boostOn ? <Sun size={15} strokeWidth={2.2} /> : <SunDim size={15} strokeWidth={2.2} />}
                    <span>
                      {boostOn
                        ? (torchSupported ? t("boost.on_hint_torch") : t("boost.on_hint"))
                        : t("boost.off_hint")}
                    </span>
                  </div>
                </div>
              )}
              {scanPaused && (
                <div
                  aria-live="polite"
                  style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(13,31,60,0.32)",
                    backdropFilter: "blur(2px)",
                    pointerEvents: "none",
                    animation: "qr-fade-in 120ms ease-out",
                  }}
                >
                  <div
                    style={{
                      display: "inline-flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 16px 12px",
                      borderRadius: 14,
                      background: "rgba(13,31,60,0.78)",
                      border: "1px solid rgba(255,255,255,0.18)",
                      color: "#fff",
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 12,
                      backdropFilter: "blur(6px)",
                    }}
                  >
                    <span>{t("scanner_restarting")}</span>
                    <span
                      style={{
                        width: 120,
                        height: 3,
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.18)",
                        overflow: "hidden",
                        position: "relative",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          bottom: 0,
                          background: "#2ECC8A",
                          width: "100%",
                          transformOrigin: "left center",
                          animation: "qr-progress 300ms linear forwards",
                        }}
                      />
                    </span>
                  </div>
                  <style>{`
                    @keyframes qr-progress { from { transform: scaleX(0); } to { transform: scaleX(1); } }
                    @keyframes qr-fade-in { from { opacity: 0; } to { opacity: 1; } }
                  `}</style>
                </div>
              )}
              {torchFlash && (
                <div
                  aria-live="polite"
                  role="status"
                  style={{
                    position: "absolute",
                    bottom: 14,
                    left: 0,
                    right: 0,
                    zIndex: 13,
                    display: "flex",
                    justifyContent: "center",
                    pointerEvents: "none",
                    animation: "qr-torch-pop 220ms cubic-bezier(0.2,0.9,0.3,1.3)",
                  }}
                >
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 14px",
                      borderRadius: 999,
                      background:
                        torchFlash === "on" ? "rgba(255,209,77,0.96)" : "rgba(13,31,60,0.86)",
                      color: torchFlash === "on" ? "#0D1F3C" : "#fff",
                      border:
                        torchFlash === "on"
                          ? "1px solid rgba(255,255,255,0.55)"
                          : "1px solid rgba(255,255,255,0.22)",
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 13,
                      fontWeight: 600,
                      boxShadow:
                        torchFlash === "on"
                          ? "0 6px 22px rgba(255,209,77,0.45)"
                          : "0 6px 22px rgba(0,0,0,0.35)",
                      backdropFilter: "blur(6px)",
                    }}
                  >
                    {torchFlash === "on" ? (
                      <Flashlight size={15} strokeWidth={2.2} />
                    ) : (
                      <FlashlightOff size={15} strokeWidth={2.2} />
                    )}
                    <span>{torchFlash === "on" ? t("torch.on_label") : t("torch.off_label")}</span>
                    <Check size={14} strokeWidth={2.6} />
                  </div>
                  <style>{`
                    @keyframes qr-torch-pop {
                      0% { opacity: 0; transform: translateY(8px) scale(0.92); }
                      60% { opacity: 1; transform: translateY(0) scale(1.04); }
                      100% { opacity: 1; transform: translateY(0) scale(1); }
                    }
                  `}</style>
                </div>
              )}
            </div>
          )}



          {!result && !cameraError && !manual && permission !== "denied" && cameras.length > 1 && permission !== "checking" && (
            <div
              style={{
                marginTop: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <SwitchCamera size={18} color="#0D1F3C" strokeWidth={1.8} style={{ flexShrink: 0, opacity: 0.9 }} />
              <select
                aria-label={t("camera_select.aria")}
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
                  background: "rgba(13,31,60,0.04)",
                  color: "#0D1F3C",
                  border: "1px solid rgba(13,31,60,0.18)",
                  borderRadius: 10,
                  padding: "10px 12px",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                  cursor: "pointer",
                  appearance: "none",
                  WebkitAppearance: "none",
                }}
              >
                <option value="__facing:environment">{t("camera_select.back_auto")}</option>
                <option value="__facing:user">{t("camera_select.front_auto")}</option>
                {cameras.map((c) => (
                  <option key={c.deviceId} value={c.deviceId}>
                    {c.label}
                  </option>
                ))}
              </select>
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
                    ? t("error.title_not_found")
                    : cameraError.kind === "in-use"
                      ? t("error.title_in_use")
                      : cameraError.kind === "constraints"
                        ? t("error.title_constraints")
                        : t("error.title_generic")}
                </div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", color: "#5A7090", fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>
                  {cameraError.kind === "in-use"
                    ? t("error.body_in_use")
                    : cameraError.kind === "not-found"
                      ? t("error.body_not_found")
                      : cameraError.kind === "constraints"
                        ? t("error.body_constraints")
                        : t("error.body_generic", { message: cameraError.message })}
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
                    {t("error.retry")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (isFrameMode) { close(); return; }
                      setCameraError(null); setManual(true);
                    }}
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
                    {isFrameMode ? t("error.manual_fallback_close") : t("error.manual_fallback")}
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
                    {t("result.label")}
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
                  {t("result.rescan")}
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
                  {t("result.start_transfer")} <ArrowRight size={16} strokeWidth={2} />
                </a>
              </div>
            </div>
          )}

          {!result && !manual && !isFrameMode && (
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
              {t("manual.no_camera")}{" "}
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
                {t("manual.no_camera_cta")}
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
                htmlFor="qr-manual-code"
                style={{
                  display: "block",
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 500,
                  fontSize: 12,
                  color: "#0D1F3C",
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  marginBottom: 6,
                }}
              >
                {t("manual.label")}
              </label>
              {(() => {
                const showSlots = manualCode.length > 0 || manualFocused;
                return (
                  <div
                    onClick={() => manualInputRef.current?.focus()}
                    onPaste={(e) => {
                      const text = e.clipboardData?.getData("text") ?? "";
                      if (!text) return;
                      e.preventDefault();
                      manualInputRef.current?.focus();
                      setManualCode(sanitizeManual(text));
                    }}
                    style={{
                      width: "100%",
                      background: "#fff",
                      border: "1.5px solid rgba(13,31,60,0.12)",
                      borderRadius: 10,
                      padding: "12px 14px",
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 15,
                      color: "#0D1F3C",
                      outline: "none",
                      boxSizing: "border-box",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      cursor: "text",
                      position: "relative",
                      minHeight: 46,
                      overflow: "hidden",
                    }}
                  >
                    <input
                      ref={manualInputRef}
                      id="qr-manual-code"
                      type="text"
                      inputMode="text"
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      autoComplete="off"
                      value={manualCode}
                      maxLength={MANUAL_MAX}
                      onChange={(e) => setManualCode(sanitizeManual(e.target.value))}
                      onPaste={(e) => {
                        const text = e.clipboardData?.getData("text") ?? "";
                        if (!text) return;
                        e.preventDefault();
                        setManualCode(sanitizeManual(text));
                      }}
                      onFocus={(e) => { setManualFocused(true); e.target.select(); }}
                      onBlur={() => setManualFocused(false)}
                      placeholder={showSlots ? undefined : "UC9K4D3NCJ"}
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        width: "100%",
                        height: "100%",
                        cursor: "text",
                        color: "transparent",
                        caretColor: "transparent",
                        WebkitTextFillColor: "transparent",
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        padding: 0,
                        margin: 0,
                        font: "inherit",
                        zIndex: 2,
                      }}
                    />
                    {showSlots ? (
                      <div style={{ display: "flex", width: "100%", gap: 4, pointerEvents: "none" }}>
                        {Array.from({ length: MANUAL_MAX }).map((_, i) => (
                          <span
                            key={i}
                            style={{
                              flex: 1,
                              textAlign: "center",
                              fontSize: 15,
                              fontFamily: "'DM Sans', sans-serif",
                              fontWeight: i < manualCode.length ? 500 : 400,
                              color: i < manualCode.length ? "#0D1F3C" : "#CBD5E1",
                              borderBottom: `2px solid ${i < manualCode.length ? "#0D1F3C" : "#E2E8F0"}`,
                              paddingBottom: 2,
                              minWidth: 0,
                              transition: "all 0.15s ease",
                            }}
                          >
                            {i < manualCode.length ? manualCode[i] : "_"}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: "#9CA3AF", fontSize: 15, fontFamily: "'DM Sans', sans-serif", pointerEvents: "none" }}>
                        UC9K4D3NCJ
                      </span>
                    )}
                  </div>
                );
              })()}
              <button
                type="button"
                onClick={copyExample}
                aria-label={t("manual.example_aria")}
                style={{
                  marginTop: 8,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                  color: "#5A7090",
                }}
              >
                <span>{t("manual.example_label")}</span>
                <span
                  style={{
                    fontFamily: "'DM Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
                    fontWeight: 500,
                    color: "#0D1F3C",
                    background: "#F1F5F9",
                    padding: "2px 6px",
                    borderRadius: 6,
                    letterSpacing: 0.4,
                  }}
                >
                  UC9K4D3NCJ
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", color: exampleCopied ? "#16A34A" : "#5A7090" }}>
                  {exampleCopied ? <Check size={14} strokeWidth={2.2} /> : <Copy size={14} strokeWidth={2} />}
                </span>
              </button>
              <p
                style={{
                  marginTop: 6,
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                  color: "#94A3B8",
                  lineHeight: 1.4,
                }}
              >
                {t("manual.hint")}
              </p>

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
                {t("manual.confirm")}
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
                {t("manual.have_camera")}{" "}
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
                  {t("manual.have_camera_cta")}
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
