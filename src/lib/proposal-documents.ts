import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, HeadingLevel } from "docx";
import type { Proposal } from "@/components/admin/ProposalsTab";
import { calculateProposalTax } from "@/lib/proposal-tax";

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
  const pdf = new jsPDF({ orientation: p.options.length > 2 ? "landscape" : "portrait" });
  const width = pdf.internal.pageSize.getWidth();
  const columns = ["Fonctionnalité", ...p.options.map((o, i) => `${o.name}${p.accepted_option === i ? " (retenue)" : ""}`)];
  // AutoTable handles wrapping, repeated headers and page breaks for every section.
  autoTable(pdf, {
    startY: 16, margin: { left: 14, right: 14, bottom: 18 }, theme: "plain",
    body: [["CloudMature"], [p.title], [`Pour : ${p.client_name}${p.client_contact ? ` · ${p.client_contact}` : ""}`], [`Date : ${date(p)}${p.valid_until ? ` · Valable jusqu'au ${new Date(p.valid_until).toLocaleDateString("fr-FR")}` : ""}`], ...(p.summary ? [[p.summary]] : [])],
    styles: { fontSize: 10, cellPadding: 2, overflow: "linebreak" },
    didParseCell: (data) => { if (data.row.index < 2) { data.cell.styles.fontStyle = "bold"; data.cell.styles.fontSize = data.row.index === 1 ? 16 : 12; } },
  });
  const lastY = () => (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 16;
  autoTable(pdf, { startY: lastY() + 6, head: [columns], body: proposalDocumentRows(p), margin: { left: 14, right: 14, bottom: 18 }, styles: { fontSize: 9, cellPadding: 3, overflow: "linebreak" }, headStyles: { fillColor: [0, 122, 163] }, columnStyles: { 0: { cellWidth: (width - 28) * 0.35 } }, rowPageBreak: "avoid" });
  autoTable(pdf, { startY: lastY() + 6, theme: "plain", body: [["Modalités de paiement"], ...p.milestones.map((m) => [`${m.percent} % — ${m.label}`]), [footnote]], margin: { left: 14, right: 14, bottom: 18 }, styles: { fontSize: 10, cellPadding: 2, overflow: "linebreak" } });
  const count = pdf.getNumberOfPages();
  for (let i = 1; i <= count; i++) { pdf.setPage(i); pdf.setFontSize(8); pdf.text(`CloudMature · ${i} / ${count}`, 14, pdf.internal.pageSize.getHeight() - 9); }
  return pdf.output("blob");
}
export async function generateProposalWord(p: Proposal): Promise<Blob> {
  const headers = ["Fonctionnalité", ...p.options.map((o, i) => `${o.name}${p.accepted_option === i ? " (retenue)" : ""}`)];
  const rows = [headers, ...proposalDocumentRows(p)].map((row, index) => new TableRow({ tableHeader: index === 0, children: row.map((text) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text, bold: index === 0 })] })] })) }));
  const doc = new Document({ sections: [{ properties: { page: { size: { orientation: p.options.length > 2 ? "landscape" : "portrait" } } }, children: [
    new Paragraph({ text: "CloudMature", heading: HeadingLevel.HEADING_2 }),
    new Paragraph({ text: p.title, heading: HeadingLevel.HEADING_1 }),
    new Paragraph(`Pour : ${p.client_name}${p.client_contact ? ` · ${p.client_contact}` : ""}`),
    new Paragraph(`Date : ${date(p)}`),
    ...(p.valid_until ? [new Paragraph(`Valable jusqu'au ${new Date(p.valid_until).toLocaleDateString("fr-FR")}`)] : []),
    ...(p.summary ? [new Paragraph(p.summary)] : []),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }),
    new Paragraph({ text: "Modalités de paiement", heading: HeadingLevel.HEADING_2 }),
    ...p.milestones.map((m) => new Paragraph(`${m.percent} % — ${m.label}`)), new Paragraph(footnote),
  ] }] });
  return Packer.toBlob(doc);
}
export const proposalFilename = (p: Proposal, extension: "pdf" | "docx") => `Proposition_${p.client_name.replace(/[^\p{L}\p{N}-]+/gu, "_").slice(0, 80) || "client"}.${extension}`;
export async function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1] || ""); reader.onerror = () => reject(new Error("Lecture du document impossible")); reader.readAsDataURL(blob); });
}