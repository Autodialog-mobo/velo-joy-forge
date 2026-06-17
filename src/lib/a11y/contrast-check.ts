// Dev-only WCAG contrast verification for the hero text against the
// (image + overlay) background actually rendered on screen.
//
// Runs only in dev (import.meta.env.DEV). No-op in production.
//
// Evaluates every hero text element (title, subtitle, badge/eyebrow) against
// every background variant (desktop + mobile photo, with the matching
// overlay stack). Results are logged grouped per variant, with pass/fail
// against WCAG AA (4.5:1 normal, 3:1 large) and AAA (7:1 normal).

type RGB = { r: number; g: number; b: number };
type RGBA = RGB & { a: number };

type Rect = { x: number; y: number; w: number; h: number };

export type HeroTextTarget = {
  name: string;
  /** Effective rendered color (resolve alpha against expected backdrop). */
  textColor: string;
  /** "normal" = 4.5/7 thresholds, "large" = 3.0/4.5 (>=18pt or >=14pt bold). */
  size: "normal" | "large";
};

export type HeroBgVariant = {
  name: string;
  imageUrl: string;
  /** Normalized 0–1 region of the source image that sits behind the text. */
  textRegion: Rect;
  /** Overlay stack as CSS rgba() strings, painted bottom-up over the image. */
  overlays: string[];
};

// ---------- color math ----------

const parseRGBA = (input: string): RGBA | null => {
  const m = input.match(/rgba?\(([^)]+)\)/i);
  if (!m) return null;
  const parts = m[1].split(",").map((s) => parseFloat(s.trim()));
  if (parts.length < 3) return null;
  return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
};

const srgbToLin = (c: number) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};

const relLuminance = ({ r, g, b }: RGB) =>
  0.2126 * srgbToLin(r) + 0.7152 * srgbToLin(g) + 0.0722 * srgbToLin(b);

const contrastRatio = (a: RGB, b: RGB) => {
  const la = relLuminance(a);
  const lb = relLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
};

const blend = (base: RGB, overlay: RGBA): RGB => ({
  r: overlay.r * overlay.a + base.r * (1 - overlay.a),
  g: overlay.g * overlay.a + base.g * (1 - overlay.a),
  b: overlay.b * overlay.a + base.b * (1 - overlay.a),
});

// ---------- image sampling ----------

const imageCache = new Map<string, Promise<HTMLImageElement | null>>();

const loadImage = (url: string) => {
  if (!imageCache.has(url)) {
    imageCache.set(
      url,
      new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url;
      }),
    );
  }
  return imageCache.get(url)!;
};

const sampleAverageColor = async (
  imageUrl: string,
  rect: Rect,
): Promise<RGB | null> => {
  const img = await loadImage(imageUrl);
  if (!img) return null;
  try {
    const canvas = document.createElement("canvas");
    const cw = 240;
    const ch = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * cw));
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, cw, ch);
    const sx = Math.max(0, Math.floor(rect.x * cw));
    const sy = Math.max(0, Math.floor(rect.y * ch));
    const sw = Math.max(1, Math.min(cw - sx, Math.floor(rect.w * cw)));
    const sh = Math.max(1, Math.min(ch - sy, Math.floor(rect.h * ch)));
    const data = ctx.getImageData(sx, sy, sw, sh).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
    }
    return { r: r / n, g: g / n, b: b / n };
  } catch {
    return null; // CORS taint — dev hint only
  }
};

// ---------- public API ----------

const verdict = (ratio: number, size: "normal" | "large") => {
  const aa = size === "large" ? 3.0 : 4.5;
  const aaa = size === "large" ? 4.5 : 7.0;
  const passAA = ratio >= aa;
  const passAAA = ratio >= aaa;
  return {
    passAA,
    passAAA,
    label: `${ratio.toFixed(2)}:1 — AA ${passAA ? "✅" : "❌"}  AAA ${passAAA ? "✅" : "❌"}`,
  };
};

export const verifyHeroContrastMatrix = async (opts: {
  variants: HeroBgVariant[];
  texts: HeroTextTarget[];
}) => {
  if (!import.meta.env.DEV) return;

  // eslint-disable-next-line no-console
  console.groupCollapsed("[a11y] Hero WCAG contrast matrix");
  let anyFail = false;

  for (const variant of opts.variants) {
    const base = await sampleAverageColor(variant.imageUrl, variant.textRegion);
    if (!base) {
      // eslint-disable-next-line no-console
      console.info(`[a11y] ${variant.name}: image not sampleable (skipped)`);
      continue;
    }
    let bg: RGB = base;
    for (const o of variant.overlays) {
      const parsed = parseRGBA(o);
      if (parsed) bg = blend(bg, parsed);
    }

    // eslint-disable-next-line no-console
    console.groupCollapsed(
      `[a11y] ${variant.name}  bg≈rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})`,
    );
    for (const t of opts.texts) {
      // Resolve text color: if rgba with a<1, blend against the computed bg.
      const tc = parseRGBA(t.textColor);
      if (!tc) continue;
      const effective: RGB =
        tc.a < 1 ? blend(bg, tc) : { r: tc.r, g: tc.g, b: tc.b };
      const ratio = contrastRatio(effective, bg);
      const v = verdict(ratio, t.size);
      const line = `  ${t.name.padEnd(10)} (${t.size}) ${v.label}`;
      // eslint-disable-next-line no-console
      if (!v.passAA) { console.error(line); anyFail = true; }
      else if (!v.passAAA) console.warn(line);
      else console.info(line);
    }
    // eslint-disable-next-line no-console
    console.groupEnd();
  }

  // eslint-disable-next-line no-console
  if (anyFail) console.error("[a11y] Hero contrast: one or more AA failures — adjust overlay or text shadow.");
  // eslint-disable-next-line no-console
  console.groupEnd();
};
