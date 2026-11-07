import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, HeadingLevel, ImageRun, Header, Footer, AlignmentType, PageNumber, PageOrientation, ShadingType } from "docx";
import type { Proposal } from "@/components/admin/ProposalsTab";
import { calculateProposalTax } from "@/lib/proposal-tax";
import { documentBrand as brand, loadDocumentBrand } from "@/lib/document-brand";

const money = (n: number) => `${Math.round(n).toLocaleString("fr-FR").replace(/\s/g, " ")} GNF`;
const range = (min: number, max: number) => max > min ? `${money(min)} - ${money(max)}` : money(min);
export function proposalDocumentRows(p: Proposal): string[][] {
  return [
    ["Objectif", ...p.options.map((o) => o.objective || "—")],
    ...p.features.map((f) => [f.label, ...p.options.map((_, i) => f.values[i] === "inclus" ? "Inclus" : f.values[i] === "option" ? "En option" : "Non inclus")]),
    ["Délai", ...p.options.map((o) => o.delay || "—")],
    ["Budget HT", ...p.options.map((o) => range(o.price_min, o.price_max))],
    ["Taxe", ...p.options.map((o) => o.tax_rate === undefined ? "Non appliquée" : `${o.tax_rate} % : ${range(calculateProposalTax(o.price_min, o.tax_rate).tax, calculateProposalTax(o.price_max, o.tax_rate).tax)}`)],
    ["Budget TTC", ...p.options.map((o) => range(calculateProposalTax(o.price_min, o.tax_rate).total, calculateProposalTax(o.price_max, o.tax_rate).total))],
  ];
}
const date = (p: Proposal) => new Date(p.created_at || Date.now()).toLocaleDateString("fr-FR");
const footnote = "Montants indicatifs, ajustés après cadrage détaillé. Bon pour accord : ____________________";
export async function generateProposalPdf(p: Proposal): Promise<Blob> {
  const { dataUrl, colors } = await loadDocumentBrand();
  const pdf = new jsPDF({ orientation: p.options.length > 2 ? "landscape" : "portrait" });
  const width = pdf.internal.pageSize.getWidth();
  const height = pdf.internal.pageSize.getHeight();
  const ink = `#${colors.ink}`, primary = `#${colors.primary}`, muted = `#${colors.muted}`;
  pdf.addImage(dataUrl, "PNG", 14, 12, 17, 17);
  pdf.setTextColor(ink); pdf.setFont("helvetica", "bold"); pdf.setFontSize(18);
  pdf.text(brand.name, 34, 19);
  pdf.setTextColor(primary); pdf.setFont("helvetica", "normal"); pdf.setFontSize(8);
  pdf.text(brand.tagline, 34, 25);
  pdf.setTextColor(muted); pdf.setFontSize(8);
  pdf.text(`${brand.address} · ${brand.city}`, 14, 35);
  pdf.text(`${brand.email} · ${brand.phone} · ${brand.website}`, 14, 40);
  pdf.setFont("helvetica", "bold"); pdf.setTextColor(ink); pdf.setFontSize(13);
  pdf.text("PROPOSITION COMMERCIALE", width - 14, 18, { align: "right" });
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(muted);
  pdf.text(`Date : ${date(p)}`, width - 14, 26, { align: "right" });
  if (p.valid_until) pdf.text(`Valable jusqu'au ${new Date(p.valid_until).toLocaleDateString("fr-FR")}`, width - 14, 32, { align: "right" });
  pdf.setDrawColor(primary); pdf.setLineWidth(0.7); pdf.line(14, 45, width - 14, 45);
  const columns = ["Fonctionnalité", ...p.options.map((o, i) => `${o.name}${p.accepted_option === i ? " (retenue)" : ""}`)];
  const margin = { left: 14, right: 14, top: 25, bottom: 22 };
  const lastY = () => (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 48;
  autoTable(pdf, {
    startY: 49, margin, theme: "plain",
    body: [[p.title], [`PRÉPARÉ POUR : ${p.client_name || "—"}${p.client_contact ? ` · ${p.client_contact}` : ""}`], ...(p.client_email ? [[p.client_email]] : []), ...(p.summary ? [[p.summary]] : [])],
    styles: { fontSize: 9, cellPadding: 2, textColor: ink, overflow: "linebreak" },
    didParseCell: (data) => { if (data.row.index === 0) { data.cell.styles.fontStyle = "bold"; data.cell.styles.fontSize = 16; } else if (data.row.index === 1) { data.cell.styles.fillColor = `#${colors.surface}`; data.cell.styles.fontStyle = "bold"; } },
  });
  const rows = proposalDocumentRows(p);
  const tableStyles = { fontSize: 8.5, cellPadding: 2.5, overflow: "linebreak" as const, textColor: ink, lineColor: `#${colors.border}`, lineWidth: 0.1 };
  const headStyles = { fillColor: primary, textColor: `#${colors.paper}`, fontStyle: "bold" as const };
  const columnStyles = { 0: { cellWidth: (width - 28) * 0.34 } };
  autoTable(pdf, {
    startY: lastY() + 5, head: [columns], body: rows.slice(0, -3), margin, styles: tableStyles, headStyles,
    alternateRowStyles: { fillColor: `#${colors.surface}` }, columnStyles, rowPageBreak: "avoid",
    didParseCell: (data) => {
      if (data.column.index === 0) return;
      data.cell.styles.halign = "center";
      if (data.section !== "body" || data.row.index < 1 || data.row.index > p.features.length) return;
      const value = p.features[data.row.index - 1]?.values[data.column.index - 1];
      data.cell.text = value === "option" ? ["En option"] : [""];
      data.cell.styles.textColor = muted;
    },
    didDrawCell: (data) => {
      if (data.section !== "body" || data.column.index === 0 || data.row.index < 1 || data.row.index > p.features.length) return;
      const value = p.features[data.row.index - 1]?.values[data.column.index - 1];
      if (value === "option") return;
      const x = data.cell.x + data.cell.width / 2;
      const y = data.cell.y + data.cell.height / 2;
      // Vector strokes avoid missing checkmark glyphs in the built-in PDF fonts.
      pdf.saveGraphicsState();
      pdf.setLineWidth(0.35); pdf.setDrawColor(value === "inclus" ? primary : muted);
      if (value === "inclus") { pdf.line(x - 1.5, y, x - 0.4, y + 1); pdf.line(x - 0.4, y + 1, x + 1.7, y - 1.2); }
      else pdf.line(x - 1.4, y, x + 1.4, y);
      pdf.restoreGraphicsState();
    },
  });
  // Keep the three financial rows together, with option names repeated if moved to a new page.
  autoTable(pdf, { startY: lastY() + 5, head: [["BUDGET & TAXES", ...columns.slice(1)]], body: rows.slice(-3), margin, styles: tableStyles, headStyles: { ...headStyles, fillColor: ink }, columnStyles, pageBreak: "avoid", rowPageBreak: "avoid", didParseCell: (data) => { if (data.section === "body" && data.row.index === 2) { data.cell.styles.fillColor = `#${colors.surface}`; data.cell.styles.fontStyle = "bold"; } } });
  autoTable(pdf, { startY: lastY() + 6, theme: "plain", body: [["MODALITÉS DE PAIEMENT"], ...p.milestones.map((m) => [`${m.percent} % — ${m.label}`]), [footnote]], margin, pageBreak: "avoid", styles: { fontSize: 9, cellPadding: 2, textColor: ink, overflow: "linebreak" }, didParseCell: (data) => { if (data.row.index === 0) { data.cell.styles.fontStyle = "bold"; data.cell.styles.textColor = primary; } } });
  const count = pdf.getNumberOfPages();
  for (let i = 1; i <= count; i++) {
    pdf.setPage(i);
    if (i > 1) {
      pdf.addImage(dataUrl, "PNG", 14, 8, 9, 9);
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(9); pdf.setTextColor(ink); pdf.text(brand.name, 26, 14);
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(muted);
      pdf.text(pdf.splitTextToSize(`${p.client_name} · ${p.title}`, width - 110)[0], width - 14, 14, { align: "right" });
    }
    pdf.setDrawColor(`#${colors.border}`); pdf.setLineWidth(0.2); pdf.line(14, height - 18, width - 14, height - 18);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(7); pdf.setTextColor(muted);
    pdf.text(`${brand.email} · ${brand.phone} · ${brand.website}`, 14, height - 12);
    pdf.text(`Page ${i} / ${count}`, width - 14, height - 12, { align: "right" });
  }
  return pdf.output("blob");
}
export async function generateProposalWord(p: Proposal): Promise<Blob> {
  const { bytes, colors } = await loadDocumentBrand();
  const headers = ["Fonctionnalité", ...p.options.map((o, i) => `${o.name}${p.accepted_option === i ? " (retenue)" : ""}`)];
  const tableWidth = (p.options.length > 2 ? 16838 : 11906) - 1600;
  const firstWidth = Math.round(tableWidth * 0.34);
  const optionWidth = Math.floor((tableWidth - firstWidth) / p.options.length);
  const columnWidths = [firstWidth, ...p.options.map((_, i) => i === p.options.length - 1 ? tableWidth - firstWidth - optionWidth * i : optionWidth)];
  const rows = [headers, ...proposalDocumentRows(p)].map((row, index, all) => new TableRow({ tableHeader: index === 0, cantSplit: true, children: row.map((text, column) => new TableCell({
    width: { size: columnWidths[column], type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: index === 0 ? colors.primary : index === all.length - 1 || index % 2 === 0 ? colors.surface : colors.paper },
    margins: { top: 100, bottom: 100, left: 100, right: 100 },
    children: [new Paragraph({ alignment: column === 0 ? AlignmentType.LEFT : AlignmentType.CENTER, keepNext: index === all.length - 3 || index === all.length - 2, spacing: { after: 40 }, children: [new TextRun({
      text: column > 0 && index >= 2 && index <= p.features.length + 1 ? text === "Inclus" ? "✓" : text === "Non inclus" ? "–" : text : text,
      bold: index === 0 || index === all.length - 1,
      color: index === 0 ? colors.paper : column > 0 && index >= 2 && index <= p.features.length + 1 ? text === "Inclus" ? colors.primary : colors.muted : colors.ink,
      font: "Arial", size: 18,
    })] })],
  })) }));
  const line = (text: string, color = colors.muted) => new Paragraph({ spacing: { after: 50 }, children: [new TextRun({ text, color, size: 18 })] });
  const doc = new Document({ styles: { default: { document: { run: { font: "Arial", size: 20, color: colors.ink }, paragraph: { spacing: { after: 120 } } } }, paragraphStyles: [{ id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { color: colors.ink, bold: true, size: 32 }, paragraph: { spacing: { before: 160, after: 160 } } }, { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { color: colors.primary, bold: true, size: 24 }, paragraph: { spacing: { before: 160, after: 100 } } }] }, sections: [{
    properties: { page: { size: { width: 11906, height: 16838, orientation: p.options.length > 2 ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT }, margin: { top: 720, bottom: 850, left: 800, right: 800 } } },
    headers: { default: new Header({ children: [new Paragraph({ children: [new ImageRun({ type: "png", data: bytes, transformation: { width: 42, height: 42 } }), new TextRun({ text: `  ${brand.name}`, bold: true, size: 32, color: colors.ink })] }), line(brand.tagline, colors.primary)] }) },
    footers: { default: new Footer({ children: [line(`${brand.email} · ${brand.phone} · ${brand.website}`), new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Page ", size: 16 }), new TextRun({ children: [PageNumber.CURRENT], size: 16 }), new TextRun({ text: " / ", size: 16 }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16 })] })] }) },
    children: [
    line(`${brand.address} · ${brand.city}`),
    line(`${brand.email} · ${brand.phone} · ${brand.website}`, colors.primary),
    new Paragraph({ children: [new TextRun({ text: "PROPOSITION COMMERCIALE", bold: true, color: colors.primary })] }),
    new Paragraph({ text: p.title, heading: HeadingLevel.HEADING_1 }),
    new Paragraph(`Pour : ${p.client_name}${p.client_contact ? ` · ${p.client_contact}` : ""}`),
    ...(p.client_email ? [line(p.client_email)] : []),
    new Paragraph(`Date : ${date(p)}`),
    ...(p.valid_until ? [new Paragraph(`Valable jusqu'au ${new Date(p.valid_until).toLocaleDateString("fr-FR")}`)] : []),
    ...(p.summary ? [new Paragraph(p.summary)] : []),
    new Table({ width: { size: tableWidth, type: WidthType.DXA }, columnWidths, rows }),
    new Paragraph({ text: "Modalités de paiement", heading: HeadingLevel.HEADING_2 }),
    ...p.milestones.map((m) => new Paragraph(`${m.percent} % — ${m.label}`)), new Paragraph(footnote),
  ] }] });
  return Packer.toBlob(doc);
}
export const proposalFilename = (p: Proposal, extension: "pdf" | "docx") => `Proposition_${p.client_name.replace(/[^\p{L}\p{N}-]+/gu, "_").slice(0, 80) || "client"}.${extension}`;
export async function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1] || ""); reader.onerror = () => reject(new Error("Lecture du document impossible")); reader.readAsDataURL(blob); });
}