// Dev-only WCAG contrast verification for the hero text against the
// (image + overlay) background actually rendered on screen.
//
// Why runtime, not build-time: the effective background behind the text is
// a blend of an external photo, a radial gradient and a linear gradient.
// Computing that statically is fragile; sampling the rendered pixels is
// exact and survives image swaps.
//
// Only runs in dev (import.meta.env.DEV). No-op in production.

type RGB = { r: number; g: number; b: number };

const parseColor = (input: string): RGB | null => {
  const m = input.match(/rgba?\(([^)]+)\)/i);
  if (!m) return null;
  const parts = m[1].split(",").map((s) => parseFloat(s.trim()));
  if (parts.length < 3) return null;
  return { r: parts[0], g: parts[1], b: parts[2] };
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

// Blend overlay rgba over base rgb (standard "source-over").
const blend = (base: RGB, overlay: RGB & { a: number }): RGB => ({
  r: overlay.r * overlay.a + base.r * (1 - overlay.a),
  g: overlay.g * overlay.a + base.g * (1 - overlay.a),
  b: overlay.b * overlay.a + base.b * (1 - overlay.a),
});

const parseRGBA = (input: string): (RGB & { a: number }) | null => {
  const m = input.match(/rgba?\(([^)]+)\)/i);
  if (!m) return null;
  const parts = m[1].split(",").map((s) => parseFloat(s.trim()));
  if (parts.length < 3) return null;
  return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
};

const sampleAverageColorBehind = async (
  imageUrl: string,
  rectFractions: { x: number; y: number; w: number; h: number },
): Promise<RGB | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const cw = 240;
        const ch = Math.round((img.naturalHeight / img.naturalWidth) * cw);
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, cw, ch);
        const sx = Math.floor(rectFractions.x * cw);
        const sy = Math.floor(rectFractions.y * ch);
        const sw = Math.max(1, Math.floor(rectFractions.w * cw));
        const sh = Math.max(1, Math.floor(rectFractions.h * ch));
        const data = ctx.getImageData(sx, sy, sw, sh).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
        }
        resolve({ r: r / n, g: g / n, b: b / n });
      } catch {
        // CORS taint — silently bail; this is a dev hint only.
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });
};

export const verifyHeroContrast = async (opts: {
  imageUrl: string;
  // Approximate text region within the hero image, normalized 0–1.
  // Text sits on the left half, vertically centered.
  textRegion?: { x: number; y: number; w: number; h: number };
  textColor?: string; // CSS color of the text
  overlays?: string[]; // CSS rgba() strings stacked over the image at the text region
  label?: string;
}) => {
  if (!import.meta.env.DEV) return;
  const region = opts.textRegion ?? { x: 0.08, y: 0.35, w: 0.35, h: 0.3 };
  const base = await sampleAverageColorBehind(opts.imageUrl, region);
  if (!base) {
    console.info("[a11y] Hero contrast check skipped (image not sampleable)");
    return;
  }
  // Approximate overlay stack at the text region: strong dark.
  const overlays = (opts.overlays ?? [
    "rgba(6,14,28,0.78)",   // radial center
    "rgba(6,14,28,0.90)",   // linear gradient near left
  ])
    .map(parseRGBA)
    .filter((c): c is RGB & { a: number } => !!c);

  let bg: RGB = base;
  for (const o of overlays) bg = blend(bg, o);

  const text = parseColor(opts.textColor ?? "rgb(255,255,255)");
  if (!text) return;
  const ratio = contrastRatio(text, bg);

  const label = opts.label ?? "hero text";
  const passAANormal = ratio >= 4.5;
  const passAALarge = ratio >= 3.0;
  const passAAANormal = ratio >= 7.0;

  const summary =
    `[a11y] ${label} contrast ${ratio.toFixed(2)}:1 — ` +
    `AA(normal) ${passAANormal ? "✅" : "❌"}  ` +
    `AA(large) ${passAALarge ? "✅" : "❌"}  ` +
    `AAA(normal) ${passAAANormal ? "✅" : "❌"}`;

  if (!passAALarge) console.error(summary);
  else if (!passAANormal) console.warn(summary);
  else console.info(summary);
};
