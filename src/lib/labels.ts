import { jsPDF } from "jspdf";

export interface LabelData {
  shipping_name: string | null;
  shipping_line1: string | null;
  shipping_line2?: string | null;
  shipping_postal_code: string | null;
  shipping_city: string | null;
  shipping_country: string | null;
  id: string;
  lines: { bundle_sku: string; quantity: number }[];
  sticker_count?: number | null;
  lang?: string | null;
}

// DYMO LabelWriter 450 — Standard Address Label S0722370
// Physical label: 28 mm (height) × 89 mm (width), landscape
const W = 89; // page width  (mm)
const H = 28; // page height (mm)
const PAD_X = 2; // 2 mm left/right padding (leading-edge safe area)
const PAD_Y = 2; // 2 mm top/bottom padding

const PT_TO_MM = 0.3528;

export function generateLabelsPdf(orders: LabelData[]): Blob {
  const doc = new jsPDF({
    unit: "mm",
    format: [W, H],
    orientation: "landscape",
  });

  orders.forEach((o, idx) => {
    if (idx > 0) doc.addPage([W, H], "landscape");

    const name = (o.shipping_name || "").trim();
    const line1 = (o.shipping_line1 || "").trim();
    const line2 = (o.shipping_line2 || "").trim();
    const cityLine = `${o.shipping_postal_code ?? ""} ${o.shipping_city ?? ""}`.trim();
    const country = (o.shipping_country || "").toUpperCase().trim();

    const rawLines: { text: string; bold: boolean }[] = [];
    if (name) rawLines.push({ text: name, bold: true });
    if (line1) rawLines.push({ text: line1, bold: false });
    if (line2) rawLines.push({ text: line2, bold: false });
    if (cityLine) rawLines.push({ text: cityLine, bold: false });
    if (country) rawLines.push({ text: country, bold: false });

    const availW = W - PAD_X * 2;
    const availH = H - PAD_Y * 2;

    // Auto-fit: start at 11pt, shrink until everything fits both width and height.
    const LINE_GAP = 1.25;
    let fontSize = 11;
    let fitted: string[] = [];
    while (fontSize >= 6) {
      doc.setFontSize(fontSize);
      fitted = [];
      for (const ln of rawLines) {
        doc.setFont("helvetica", ln.bold ? "bold" : "normal");
        const wrapped = doc.splitTextToSize(ln.text, availW) as string[];
        for (const w of wrapped) fitted.push((ln.bold ? "\x01" : "\x00") + w);
      }
      const lineH = fontSize * PT_TO_MM * LINE_GAP;
      const totalH = fitted.length * lineH;
      if (totalH <= availH) break;
      fontSize -= 0.5;
    }

    doc.setFontSize(fontSize);
    doc.setTextColor(0, 0, 0);
    const lineH = fontSize * PT_TO_MM * LINE_GAP;
    // Anchor at top-left (leading edge of the DYMO label). Baseline is the
    // text bottom in jsPDF, so offset by ~0.85 × cap height for the first line.
    let y = PAD_Y + fontSize * PT_TO_MM * 0.85;

    for (const tagged of fitted) {
      const bold = tagged.charCodeAt(0) === 1;
      const text = tagged.slice(1);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.text(text, PAD_X, y, { align: "left" });
      y += lineH;
    }

    // Caption (bottom-right): "<count> · <LANG>"
    const stickerCount = Number(o.sticker_count ?? 0);
    const langCode = (o.lang || "").toString().trim().toUpperCase();
    if (stickerCount > 0 || langCode) {
      const captionParts = [
        stickerCount > 0 ? String(stickerCount) : null,
        langCode || null,
      ].filter(Boolean) as string[];
      const caption = captionParts.join(" \u00B7 ");
      const captionSize = 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(captionSize);
      doc.setTextColor(110, 110, 110);
      // Baseline near the bottom of the safe area, right-aligned.
      const cy = H - PAD_Y;
      doc.text(caption, W - PAD_X, cy, { align: "right" });
    }
  });

  return doc.output("blob");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ordersToCsv(rows: Record<string, any>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    if (v == null) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
}
