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
const M = 8; // 8mm margin

export function generateLabelsPdf(orders: LabelData[]): Blob {
  const doc = new jsPDF({ unit: "mm", format: [W, H], orientation: "landscape" });

  orders.forEach((o, idx) => {
    if (idx > 0) doc.addPage([W, H], "landscape");

    // Background (Nacht is dark navy in design — but printing on envelope, keep white background)
    // Sender (top, small)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text(SENDER, M, M + 3);

    // Divider line in green accent
    doc.setDrawColor(46, 204, 138);
    doc.setLineWidth(0.3);
    doc.line(M, M + 5, W - M, M + 5);

    // Recipient (large, centered vertically)
    const name = (o.shipping_name || "").trim() || "—";
    const line1 = (o.shipping_line1 || "").trim();
    const line2 = (o.shipping_line2 || "").trim();
    const cityLine = `${o.shipping_postal_code ?? ""} ${o.shipping_city ?? ""}`.trim();
    const country = (o.shipping_country || "").toUpperCase().trim();

    doc.setTextColor(13, 31, 60); // Nacht
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    let y = 35;
    doc.text(name, M + 8, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    if (line1) {
      doc.text(line1, M + 8, y);
      y += 6;
    }
    if (line2) {
      doc.text(line2, M + 8, y);
      y += 6;
    }
    if (cityLine) {
      doc.text(cityLine, M + 8, y);
      y += 6;
    }
    if (country) {
      doc.setFont("helvetica", "bold");
      doc.text(country, M + 8, y);
    }

    // Footer: bundle info + order id
    const skuStr = o.lines.map((l) => `${l.bundle_sku}×${l.quantity}`).join("  ");
    const orderShort = o.id.slice(0, 8).toUpperCase();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text(`${skuStr || "—"}   |   #${orderShort}`, M, H - M);
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
