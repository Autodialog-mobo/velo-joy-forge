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
}

const SENDER = "Velopass BV · Stokerijstraat 29/a1 · 2110 Wijnegem";

// C6 envelope: 162 x 114 mm
const W = 162;
const H = 114;
const MX = 12; // horizontal margin
const MY = 8;  // vertical margin

// Convert pt to mm (1pt = 0.3528mm)
const PT = 0.3528;

export function generateLabelsPdf(orders: LabelData[]): Blob {
  const doc = new jsPDF({ unit: "mm", format: [W, H], orientation: "landscape" });

  orders.forEach((o, idx) => {
    if (idx > 0) doc.addPage([W, H], "landscape");

    // ── AFZENDER (top, 8mm from top) ──
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(136, 136, 136);
    doc.text(SENDER, MX, MY + 8 * PT);

    // ── KLANT (vertically centered) ──
    const name = (o.shipping_name || "").trim() || "—";
    const line1 = (o.shipping_line1 || "").trim();
    const line2 = (o.shipping_line2 || "").trim();
    const cityLine = `${o.shipping_postal_code ?? ""} ${o.shipping_city ?? ""}`.trim();
    const country = (o.shipping_country || "").toUpperCase().trim();

    const nameLineH = 16 * PT * 1.3;   // ~7.3mm
    const addrLineH = 14 * PT * 1.4;   // ~6.9mm

    const addrLines = [line1, line2, cityLine, country].filter(Boolean);
    const blockH = nameLineH + addrLines.length * addrLineH;
    let y = (H - blockH) / 2 + nameLineH * 0.75; // baseline of first line

    doc.setTextColor(13, 31, 60); // #0D1F3C navy
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(name, MX, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    for (const ln of addrLines) {
      y += addrLineH;
      doc.text(ln, MX, y);
    }

    // ── META (bottom, 8mm from bottom) ──
    const skuStr = o.lines.map((l) => `${l.bundle_sku}×${l.quantity}`).join(", ");
    const orderShort = o.id.slice(0, 8).toUpperCase();
    const metaText = `${skuStr || "—"} · #${orderShort}`;

    const metaBaselineY = H - MY;
    const dividerY = metaBaselineY - 7 * PT - 2; // ~2mm above meta

    doc.setDrawColor(221, 221, 221);
    doc.setLineWidth(0.2);
    doc.line(MX, dividerY, W - MX, dividerY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(136, 136, 136);
    doc.text(metaText, MX, metaBaselineY);
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
