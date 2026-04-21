import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
  HeightRule,
} from "docx";
import type { InvoicePDFData } from "@/components/InvoicePDFTemplate";

const formatCurrency = (n: number, currency: string) => {
  const formatted = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(n));
  return `${formatted} ${currency}`;
};

const formatDate = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
};

/** Convertit l'élément HTML en Blob PDF (A4). */
export async function generateInvoicePDFBlob(element: HTMLElement): Promise<Blob> {
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
  });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgProps = pdf.getImageProperties(imgData);
  const ratio = imgProps.width / imgProps.height;
  let imgWidth = pageWidth;
  let imgHeight = pageWidth / ratio;
  if (imgHeight > pageHeight) {
    imgHeight = pageHeight;
    imgWidth = pageHeight * ratio;
  }
  pdf.addImage(imgData, "PNG", (pageWidth - imgWidth) / 2, 0, imgWidth, imgHeight);
  return pdf.output("blob");
}

const NAVY = "0B1F33";
const CYAN = "1FB6E5";
const LIGHT = "EAF6FB";

const cell = (text: string, opts?: {
  bold?: boolean;
  color?: string;
  fill?: string;
  align?: typeof AlignmentType[keyof typeof AlignmentType];
  italic?: boolean;
  size?: number;
  width?: number;
}) => {
  return new TableCell({
    width: opts?.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    shading: opts?.fill
      ? { fill: opts.fill, type: ShadingType.CLEAR, color: "auto" }
      : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [
      new Paragraph({
        alignment: opts?.align ?? AlignmentType.LEFT,
        children: [
          new TextRun({
            text,
            bold: opts?.bold,
            italics: opts?.italic,
            color: opts?.color,
            size: opts?.size ?? 20,
            font: "Arial",
          }),
        ],
      }),
    ],
  });
};

const noBorder = {
  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};

/** Génère un Blob .docx. */
export async function generateInvoiceDocxBlob(data: InvoicePDFData): Promise<Blob> {
  const tableWidth = 9360;
  const colWidths = [500, 4060, 700, 1500, 900, 1700];

  // En-tête (logo placé via texte/branding simple — Word ne charge pas l'image facilement sans assets binaires)
  const headerTable = new Table({
    width: { size: tableWidth, type: WidthType.DXA },
    columnWidths: [4680, 4680],
    borders: noBorder,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: "Cloud Mature", bold: true, size: 36, color: NAVY, font: "Arial" })],
              }),
              new Paragraph({
                children: [new TextRun({ text: "Innover • Optimiser • Automatiser", size: 16, color: CYAN, font: "Arial" })],
              }),
              new Paragraph({ children: [new TextRun({ text: "Kipé Centre Émetteur, C/Ratoma", size: 18, font: "Arial" })] }),
              new Paragraph({ children: [new TextRun({ text: "Conakry, Guinée", size: 18, font: "Arial" })] }),
              new Paragraph({ children: [new TextRun({ text: "info@cloudmature.com", size: 18, color: CYAN, font: "Arial" })] }),
              new Paragraph({ children: [new TextRun({ text: "+224 626 441 150", size: 18, font: "Arial" })] }),
              new Paragraph({ children: [new TextRun({ text: "www.cloudmature.com", size: 18, color: CYAN, font: "Arial" })] }),
            ],
          }),
          new TableCell({
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: "FACTURE", bold: true, size: 56, color: NAVY, font: "Arial" })],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: `N° ${data.invoice_number}`, bold: true, size: 22, color: CYAN, font: "Arial" })],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: `Date : ${formatDate(data.invoice_date)}`, size: 18, font: "Arial" })],
              }),
              ...(data.due_date
                ? [
                    new Paragraph({
                      alignment: AlignmentType.RIGHT,
                      children: [new TextRun({ text: `Échéance : ${formatDate(data.due_date)}`, size: 18, font: "Arial" })],
                    }),
                  ]
                : []),
            ],
          }),
        ],
      }),
    ],
  });

  // Bandeaux client/paiement
  const clientPaymentTable = new Table({
    width: { size: tableWidth, type: WidthType.DXA },
    columnWidths: [4080, 5280],
    rows: [
      new TableRow({
        height: { value: 400, rule: HeightRule.ATLEAST },
        children: [
          cell("CLIENT", { fill: NAVY, color: "FFFFFF", bold: true, width: 4080 }),
          cell("DÉTAILS DE PAIEMENT", { fill: NAVY, color: "FFFFFF", bold: true, width: 5280 }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 4080, type: WidthType.DXA },
            shading: { fill: LIGHT, type: ShadingType.CLEAR, color: "auto" },
            margins: { top: 120, bottom: 120, left: 120, right: 120 },
            children: [
              new Paragraph({ children: [new TextRun({ text: data.client.client_name, bold: true, size: 22, color: NAVY, font: "Arial" })] }),
              ...(data.client.contact_person ? [new Paragraph({ children: [new TextRun({ text: `À l'attention de : ${data.client.contact_person}`, size: 18, font: "Arial" })] })] : []),
              ...(data.client.nif ? [new Paragraph({ children: [new TextRun({ text: `NIF : ${data.client.nif}`, size: 18, font: "Arial" })] })] : []),
              ...(data.client.rccm ? [new Paragraph({ children: [new TextRun({ text: `N°RCCM : ${data.client.rccm}`, size: 18, font: "Arial" })] })] : []),
              ...(data.client.address_line || data.client.city
                ? [new Paragraph({ children: [new TextRun({ text: [data.client.address_line, data.client.city, data.client.country].filter(Boolean).join(", "), size: 18, font: "Arial" })] })]
                : []),
              ...(data.client.phone ? [new Paragraph({ children: [new TextRun({ text: data.client.phone, size: 18, font: "Arial" })] })] : []),
              ...(data.client.email ? [new Paragraph({ children: [new TextRun({ text: data.client.email, size: 18, color: CYAN, font: "Arial" })] })] : []),
            ],
          }),
          new TableCell({
            width: { size: 5280, type: WidthType.DXA },
            shading: { fill: LIGHT, type: ShadingType.CLEAR, color: "auto" },
            margins: { top: 120, bottom: 120, left: 120, right: 120 },
            children: [
              ...(data.payment_details.bank ? [new Paragraph({ children: [new TextRun({ text: "Banque : ", bold: true, size: 18, font: "Arial" }), new TextRun({ text: data.payment_details.bank, size: 18, font: "Arial" })] })] : []),
              ...(data.payment_details.iban ? [new Paragraph({ children: [new TextRun({ text: "IBAN / Compte : ", bold: true, size: 18, font: "Arial" }), new TextRun({ text: data.payment_details.iban, size: 18, font: "Arial" })] })] : []),
              ...(data.payment_details.swift ? [new Paragraph({ children: [new TextRun({ text: "SWIFT : ", bold: true, size: 18, font: "Arial" }), new TextRun({ text: data.payment_details.swift, size: 18, font: "Arial" })] })] : []),
              ...(data.payment_details.mobile_money ? [new Paragraph({ children: [new TextRun({ text: "Mobile Money : ", bold: true, size: 18, font: "Arial" }), new TextRun({ text: data.payment_details.mobile_money, size: 18, font: "Arial" })] })] : []),
              ...(data.payment_details.reference ? [new Paragraph({ children: [new TextRun({ text: "Référence : ", bold: true, size: 18, font: "Arial" }), new TextRun({ text: data.payment_details.reference, size: 18, font: "Arial" })] })] : []),
            ],
          }),
        ],
      }),
    ],
  });

  // Items
  const itemsHeader = new TableRow({
    tableHeader: true,
    children: [
      cell("#", { fill: CYAN, color: "FFFFFF", bold: true, width: colWidths[0] }),
      cell("DESCRIPTION", { fill: CYAN, color: "FFFFFF", bold: true, width: colWidths[1] }),
      cell("QTÉ", { fill: CYAN, color: "FFFFFF", bold: true, align: AlignmentType.CENTER, width: colWidths[2] }),
      cell("PRIX UNIT.", { fill: CYAN, color: "FFFFFF", bold: true, align: AlignmentType.RIGHT, width: colWidths[3] }),
      cell("REMISE", { fill: CYAN, color: "FFFFFF", bold: true, align: AlignmentType.CENTER, width: colWidths[4] }),
      cell("TOTAL", { fill: CYAN, color: "FFFFFF", bold: true, align: AlignmentType.RIGHT, width: colWidths[5] }),
    ],
  });

  const itemRows = data.items.map(
    (item) =>
      new TableRow({
        children: [
          cell(String(item.position), { color: CYAN, bold: true, width: colWidths[0] }),
          new TableCell({
            width: { size: colWidths[1], type: WidthType.DXA },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [
              new Paragraph({ children: [new TextRun({ text: item.description, bold: true, size: 20, color: NAVY, font: "Arial" })] }),
              ...(item.subtitle
                ? [new Paragraph({ children: [new TextRun({ text: item.subtitle, italics: true, size: 16, color: "6B7280", font: "Arial" })] })]
                : []),
            ],
          }),
          cell(`${item.quantity}${item.unit && item.unit !== "unité" ? ` ${item.unit}` : ""}`, { align: AlignmentType.CENTER, width: colWidths[2] }),
          cell(formatCurrency(item.unit_price, data.currency), { align: AlignmentType.RIGHT, width: colWidths[3] }),
          cell(item.discount_rate ? `−${item.discount_rate}%` : "—", { align: AlignmentType.CENTER, width: colWidths[4] }),
          cell(formatCurrency(item.total, data.currency), { align: AlignmentType.RIGHT, bold: true, width: colWidths[5] }),
        ],
      })
  );

  const itemsTable = new Table({
    width: { size: tableWidth, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [itemsHeader, ...itemRows],
  });

  // Totaux
  const totalsTable = new Table({
    width: { size: tableWidth, type: WidthType.DXA },
    columnWidths: [4680, 4680],
    borders: noBorder,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 4680, type: WidthType.DXA },
            margins: { top: 80, bottom: 80, left: 0, right: 120 },
            children: [
              new Paragraph({ children: [new TextRun({ text: "NOTES & CONDITIONS", bold: true, size: 20, color: NAVY, font: "Arial" })] }),
              ...(data.notes || `• Paiement dû dans les 30 jours suivant la date de facturation.\n• Tout retard de paiement entraînera des pénalités de 1,5% par mois.\n• Les services sont soumis aux CGV disponibles sur www.cloudmature.com.\n• TVA applicable selon la réglementation guinéenne en vigueur.`)
                .split("\n")
                .map((line) => new Paragraph({ children: [new TextRun({ text: line, size: 16, font: "Arial" })] })),
            ],
          }),
          new TableCell({
            width: { size: 4680, type: WidthType.DXA },
            shading: { fill: LIGHT, type: ShadingType.CLEAR, color: "auto" },
            margins: { top: 120, bottom: 120, left: 120, right: 120 },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: "Sous-total : ", size: 18, font: "Arial" }),
                  new TextRun({ text: formatCurrency(data.subtotal, data.currency), bold: true, size: 18, font: "Arial" }),
                ],
              }),
              ...(data.discount_rate > 0 ? [new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: `Remise globale (${data.discount_rate}%) : `, size: 18, font: "Arial", color: "DC2626" }),
                  new TextRun({ text: `— ${formatCurrency(data.discount_amount, data.currency)}`, size: 18, font: "Arial", color: "DC2626" }),
                ],
              })] : []),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: `TVA (${data.tax_rate}%) : `, size: 18, font: "Arial" }),
                  new TextRun({ text: formatCurrency(data.tax_amount, data.currency), size: 18, font: "Arial" }),
                ],
              }),
              ...(data.early_payment_discount_rate && data.early_payment_discount_rate > 0 ? [new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: `Escompte paiement anticipé (${data.early_payment_discount_rate}%) : `, size: 18, font: "Arial", color: "DC2626" }),
                  new TextRun({ text: `— ${formatCurrency(data.early_payment_discount_amount ?? 0, data.currency)}`, size: 18, font: "Arial", color: "DC2626" }),
                ],
              })] : []),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { before: 200 },
                shading: { fill: CYAN, type: ShadingType.CLEAR, color: "auto" },
                children: [
                  new TextRun({ text: "NET À PAYER : ", bold: true, size: 24, color: "FFFFFF", font: "Arial" }),
                  new TextRun({ text: formatCurrency(data.total, data.currency), bold: true, size: 24, color: "FFFFFF", font: "Arial" }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Arial", size: 20 } } },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        children: [
          headerTable,
          new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),
          clientPaymentTable,
          new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),
          itemsTable,
          new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),
          totalsTable,
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 400 },
            children: [
              new TextRun({
                text: "Enregistré sous N° GN.TCC.2025.B18495 · Partenaire : Microsoft · Datadog · Google Cloud",
                size: 14,
                color: "6B7280",
                font: "Arial",
              }),
            ],
          }),
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/** Sanitize folder/file name for SharePoint */
export function sanitizeName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "_").substring(0, 200);
}
