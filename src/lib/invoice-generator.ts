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
  Header,
  PageBreak,
  TabStopType,
  TabStopPosition,
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
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
};

/** Convertit l'élément HTML en Blob PDF (A4). Supporte plusieurs `.invoice-page` enfants. */
export async function generateInvoicePDFBlob(element: HTMLElement): Promise<Blob> {
  const pages = Array.from(element.querySelectorAll<HTMLElement>(".invoice-page"));
  const targets: HTMLElement[] = pages.length > 0 ? pages : [element];

  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < targets.length; i++) {
    const canvas = await html2canvas(targets[i], {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
    });
    const imgData = canvas.toDataURL("image/png");
    const imgProps = pdf.getImageProperties(imgData);
    const ratio = imgProps.width / imgProps.height;
    let imgWidth = pageWidth;
    let imgHeight = pageWidth / ratio;
    if (imgHeight > pageHeight) {
      imgHeight = pageHeight;
      imgWidth = pageHeight * ratio;
    }
    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, "PNG", (pageWidth - imgWidth) / 2, 0, imgWidth, imgHeight);
  }
  return pdf.output("blob");
}


const NAVY = "0B1F33";
const CYAN = "1FB6E5";
const LIGHT = "EAF6FB";
const GREEN = "16A34A";
const GRAY = "6B7280";

const SUBTITLE_MAX_CHARS = 180;
const isLongSubtitle = (s?: string | null) => !!s && s.trim().length > SUBTITLE_MAX_CHARS;

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

/** Notes dynamiques par statut, alignées sur le template PDF. */
function buildDynamicNotes(data: InvoicePDFData): string[] {
  if (data.notes && data.notes.trim().length > 0) return data.notes.split("\n");
  const status = data.status ?? (data.is_proforma ? "proforma" : "emise");
  const dueStr = data.due_date ? formatDate(data.due_date) : null;
  const days = data.due_date
    ? Math.max(
        0,
        Math.round(
          (new Date(data.due_date).getTime() - new Date(data.invoice_date).getTime()) / 86400000,
        ),
      )
    : null;
  const delay =
    days === null ? "à réception" : days <= 0 ? "à réception" : `${days} jour${days > 1 ? "s" : ""} après émission`;
  const dueLine = dueStr
    ? `• Paiement dû au plus tard le ${dueStr} (${delay}).`
    : `• Paiement ${delay}.`;
  switch (status) {
    case "brouillon":
      return [
        "• Document de travail — non contractuel.",
        "• Les montants, délais et conditions restent à valider avant émission.",
        "• Ne constitue ni un devis engageant ni un justificatif comptable.",
      ];
    case "proforma":
      return [
        "• Engagement : 12 mois",
        "• Paiement : annuel",
        "• Début du service : [date prévue]",
        "• Cette facture pro forma est émise à titre informatif et ne constitue pas une facture fiscale finale.",
        "• La facturation finale sera émise après confirmation de la commande et activation des licences.",
      ];
    case "payee":
      return [
        `• Facture réglée${data.paid_at ? ` le ${formatDate(data.paid_at)}` : ""}.`,
        "• Ce document tient lieu de reçu de paiement.",
        "• Merci de votre confiance.",
      ];
    case "annulee":
      return [
        "• Facture annulée — sans valeur comptable.",
        "• Ce document est conservé à titre d'archive uniquement.",
      ];
    case "en_retard":
      return [
        dueLine,
        "• Paiement en retard : des pénalités de 1,5% par mois peuvent s'appliquer.",
        "• Merci de régulariser dans les meilleurs délais.",
        "• TVA applicable selon la réglementation guinéenne en vigueur.",
      ];
    case "emise":
    default:
      return [
        dueLine,
        "• Tout retard de paiement entraînera des pénalités de 1,5% par mois.",
        "• Services soumis aux CGV disponibles sur www.cloudmature.com.",
        "• TVA applicable selon la réglementation guinéenne en vigueur.",
      ];
  }
}

/** Filigrane simulé via un en-tête (Word ne permet pas facilement une rotation sans XML brut).
 * On centre un très grand texte translucide-ish coloré. */
function buildWatermarkHeader(text: string, color: string): Header {
  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 2400, after: 0 },
        children: [
          new TextRun({
            text,
            bold: true,
            size: 200, // 100pt
            color,
            font: "Arial",
          }),
        ],
      }),
    ],
  });
}

/** Génère un Blob .docx. */
export async function generateInvoiceDocxBlob(data: InvoicePDFData): Promise<Blob> {
  const tableWidth = 9360;
  const colWidths = [500, 4060, 700, 1500, 900, 1700];

  const isProforma = !!data.is_proforma || data.status === "proforma";
  const isPaid = data.status === "payee";
  const titleText = isProforma ? "FACTURE PROFORMA" : "FACTURE";

  // En-tête
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
                children: [new TextRun({ text: titleText, bold: true, size: isProforma ? 44 : 56, color: NAVY, font: "Arial" })],
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
              ...(isPaid && data.paid_at
                ? [
                    new Paragraph({
                      alignment: AlignmentType.RIGHT,
                      children: [new TextRun({ text: `Payée le : ${formatDate(data.paid_at)}`, size: 18, color: GREEN, bold: true, font: "Arial" })],
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
  const paymentParagraphs: Paragraph[] = [];
  if (data.payment_methods && data.payment_methods.length > 0) {
    const typeLabels: Record<string, string> = {
      virement: "Virement bancaire",
      mobile_money: "Mobile Money",
      especes: "Espèces",
      cheque: "Chèque",
      depot: "Dépôt en espèces",
      autre: "Autre",
    };
    data.payment_methods.forEach((pm, i) => {
      paymentParagraphs.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: pm.label, bold: true, size: 18, color: NAVY, font: "Arial" }),
            new TextRun({ text: ` · ${typeLabels[pm.type] ?? pm.type}`, size: 16, color: GRAY, font: "Arial" }),
          ],
        }),
      );
      if (pm.bank) paymentParagraphs.push(new Paragraph({ children: [new TextRun({ text: "Banque : ", bold: true, size: 16, font: "Arial" }), new TextRun({ text: pm.bank, size: 16, font: "Arial" })] }));
      if (pm.account_holder) paymentParagraphs.push(new Paragraph({ children: [new TextRun({ text: "Titulaire : ", bold: true, size: 16, font: "Arial" }), new TextRun({ text: pm.account_holder, size: 16, font: "Arial" })] }));
      if (pm.iban) paymentParagraphs.push(new Paragraph({ children: [new TextRun({ text: "IBAN / Compte : ", bold: true, size: 16, font: "Arial" }), new TextRun({ text: pm.iban, size: 16, font: "Arial" })] }));
      if (pm.swift) paymentParagraphs.push(new Paragraph({ children: [new TextRun({ text: "SWIFT : ", bold: true, size: 16, font: "Arial" }), new TextRun({ text: pm.swift, size: 16, font: "Arial" })] }));
      if (pm.mobile_number) paymentParagraphs.push(new Paragraph({ children: [new TextRun({ text: "Mobile Money : ", bold: true, size: 16, font: "Arial" }), new TextRun({ text: pm.mobile_number, size: 16, font: "Arial" })] }));
      if (pm.instructions) paymentParagraphs.push(new Paragraph({ children: [new TextRun({ text: pm.instructions, italics: true, size: 14, color: GRAY, font: "Arial" })] }));
      if (i < data.payment_methods!.length - 1) {
        paymentParagraphs.push(new Paragraph({ children: [new TextRun({ text: "", size: 8 })], spacing: { after: 60 } }));
      }
    });
  } else {
    if (data.payment_details.bank) paymentParagraphs.push(new Paragraph({ children: [new TextRun({ text: "Banque : ", bold: true, size: 18, font: "Arial" }), new TextRun({ text: data.payment_details.bank, size: 18, font: "Arial" })] }));
    if (data.payment_details.iban) paymentParagraphs.push(new Paragraph({ children: [new TextRun({ text: "IBAN / Compte : ", bold: true, size: 18, font: "Arial" }), new TextRun({ text: data.payment_details.iban, size: 18, font: "Arial" })] }));
    if (data.payment_details.swift) paymentParagraphs.push(new Paragraph({ children: [new TextRun({ text: "SWIFT : ", bold: true, size: 18, font: "Arial" }), new TextRun({ text: data.payment_details.swift, size: 18, font: "Arial" })] }));
    if (data.payment_details.mobile_money) paymentParagraphs.push(new Paragraph({ children: [new TextRun({ text: "Mobile Money : ", bold: true, size: 18, font: "Arial" }), new TextRun({ text: data.payment_details.mobile_money, size: 18, font: "Arial" })] }));
    if (data.payment_details.reference) paymentParagraphs.push(new Paragraph({ children: [new TextRun({ text: "Référence : ", bold: true, size: 18, font: "Arial" }), new TextRun({ text: data.payment_details.reference, size: 18, font: "Arial" })] }));
  }

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
            children: paymentParagraphs.length > 0 ? paymentParagraphs : [new Paragraph({ children: [new TextRun({ text: "-", size: 18, font: "Arial" })] })],
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
      cell("QTÉ", { fill: CYAN, color: "FFFFFF", bold: true, width: colWidths[2] }),
      cell("PRIX UNIT.", { fill: CYAN, color: "FFFFFF", bold: true, align: AlignmentType.RIGHT, width: colWidths[3] }),
      cell("REMISE", { fill: CYAN, color: "FFFFFF", bold: true, width: colWidths[4] }),
      cell("TOTAL", { fill: CYAN, color: "FFFFFF", bold: true, align: AlignmentType.RIGHT, width: colWidths[5] }),
    ],
  });

  const FREQ_ADJ: Record<string, string> = {
    mensuel: "Mensuel", trimestriel: "Trimestriel", semestriel: "Semestriel", annuel: "Annuel",
  };
  const FREQ_PERIOD: Record<string, { p: string; pl: string }> = {
    mensuel: { p: "mois", pl: "mois" },
    trimestriel: { p: "trimestre", pl: "trimestres" },
    semestriel: { p: "semestre", pl: "semestres" },
    annuel: { p: "an", pl: "ans" },
  };

  const isSubscriptionLike = (it: typeof data.items[number]) => !!(it.is_recurring || it.billing_frequency);
  const annexItems = data.items.filter((it) => isSubscriptionLike(it) && isLongSubtitle(it.subtitle));
  const hasAnnex = annexItems.length > 0;

  const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n).trimEnd() + "…" : s);

  const itemRows = data.items.map((item) => {
    const freqAdj = item.is_recurring && item.billing_frequency ? FREQ_ADJ[item.billing_frequency] : null;
    const freqPer = item.is_recurring && item.billing_frequency ? FREQ_PERIOD[item.billing_frequency] : null;
    const periods = Math.max(1, item.periods ?? 1);
    const long = isLongSubtitle(item.subtitle);
    const goesToAnnex = isSubscriptionLike(item) && long;
    const subtitleShown = item.subtitle ? (goesToAnnex ? truncate(item.subtitle, 140) : item.subtitle) : null;

    const descChildren: Paragraph[] = [
      new Paragraph({
        children: [
          new TextRun({ text: item.description, bold: true, size: 20, color: NAVY, font: "Arial" }),
          ...(freqAdj ? [new TextRun({ text: `  [Abonnement · ${freqAdj}]`, bold: true, size: 14, color: CYAN, font: "Arial" })] : []),
        ],
      }),
    ];
    if (subtitleShown) {
      descChildren.push(
        new Paragraph({
          spacing: { before: 60 },
          children: [new TextRun({ text: subtitleShown, italics: true, size: 16, color: GRAY, font: "Arial" })],
        }),
      );
    }
    if (goesToAnnex) {
      descChildren.push(
        new Paragraph({
          spacing: { before: 240 },
          children: [new TextRun({ text: "● Détail complet — voir Annexe (p. 2)", bold: true, size: 14, color: CYAN, font: "Arial" })],
        }),
      );
    }

    return new TableRow({
      children: [
        cell(String(item.position), { color: CYAN, bold: true, width: colWidths[0] }),
        new TableCell({
          width: { size: colWidths[1], type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: descChildren,
        }),
        new TableCell({
          width: { size: colWidths[2], type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [new TextRun({ text: `${item.quantity}${item.unit && item.unit !== "unité" ? ` ${item.unit}` : ""}`, size: 20, font: "Arial" })],
            }),
            ...(freqPer ? [new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [new TextRun({ text: `× ${periods} ${periods > 1 ? freqPer.pl : freqPer.p}`, size: 14, color: GRAY, font: "Arial" })],
            })] : []),
          ],
        }),
        cell(formatCurrency(item.unit_price, data.currency) + (freqPer ? `/${freqPer.p}` : ""), { align: AlignmentType.RIGHT, width: colWidths[3] }),
        cell(item.discount_rate ? `−${item.discount_rate}%` : "-", { width: colWidths[4] }),
        cell(formatCurrency(item.total, data.currency), { align: AlignmentType.RIGHT, bold: true, width: colWidths[5] }),
      ],
    });
  });

  const itemsTable = new Table({
    width: { size: tableWidth, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [itemsHeader, ...itemRows],
  });

  // Notes dynamiques
  const notesLines = buildDynamicNotes(data);

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
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [new TextRun({ text: "NOTES & CONDITIONS", bold: true, size: 20, color: NAVY, font: "Arial" })],
              }),
              ...notesLines.map((line) =>
                new Paragraph({
                  alignment: AlignmentType.LEFT,
                  children: [new TextRun({ text: line, size: 16, font: "Arial" })],
                }),
              ),
            ],
          }),
          new TableCell({
            width: { size: 4680, type: WidthType.DXA },
            shading: { fill: LIGHT, type: ShadingType.CLEAR, color: "auto" },
            margins: { top: 120, bottom: 120, left: 120, right: 120 },
            children: [
              new Paragraph({
                tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
                children: [
                  new TextRun({ text: "Sous-total : ", size: 18, font: "Arial" }),
                  new TextRun({ text: "\t" }),
                  new TextRun({ text: formatCurrency(data.subtotal, data.currency), bold: true, size: 18, font: "Arial" }),
                ],
              }),
              ...(data.discount_rate > 0 ? [new Paragraph({
                tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
                children: [
                  new TextRun({ text: `Remise globale (${data.discount_rate}%) : `, size: 18, font: "Arial", color: "DC2626" }),
                  new TextRun({ text: "\t" }),
                  new TextRun({ text: `- ${formatCurrency(data.discount_amount, data.currency)}`, size: 18, font: "Arial", color: "DC2626" }),
                ],
              })] : []),
              new Paragraph({
                tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
                children: [
                  new TextRun({ text: `TVA (${data.tax_rate}%) : `, size: 18, font: "Arial" }),
                  new TextRun({ text: "\t" }),
                  new TextRun({ text: formatCurrency(data.tax_amount, data.currency), size: 18, font: "Arial" }),
                ],
              }),
              ...(data.early_payment_discount_rate && data.early_payment_discount_rate > 0 ? [new Paragraph({
                tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
                children: [
                  new TextRun({ text: `Escompte paiement anticipé (${data.early_payment_discount_rate}%) : `, size: 18, font: "Arial", color: "DC2626" }),
                  new TextRun({ text: "\t" }),
                  new TextRun({ text: `- ${formatCurrency(data.early_payment_discount_amount ?? 0, data.currency)}`, size: 18, font: "Arial", color: "DC2626" }),
                ],
              })] : []),
              new Paragraph({
                tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
                spacing: { before: 200 },
                shading: { fill: CYAN, type: ShadingType.CLEAR, color: "auto" },
                children: [
                  new TextRun({ text: "NET À PAYER : ", bold: true, size: 24, color: "FFFFFF", font: "Arial" }),
                  new TextRun({ text: "\t" }),
                  new TextRun({ text: formatCurrency(data.total, data.currency), bold: true, size: 24, color: "FFFFFF", font: "Arial" }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // Bloc signature/émetteur
  let signatureImage: ArrayBuffer | null = null;
  if (data.issuer?.signature_url) {
    try {
      const res = await fetch(data.issuer.signature_url);
      if (res.ok) signatureImage = await res.arrayBuffer();
    } catch { /* ignore */ }
  }

  const issuerParagraphs: Paragraph[] = [];
  if (data.issuer && (data.issuer.full_name || data.issuer.signature_url)) {
    issuerParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 400 },
        children: [new TextRun({ text: "Émis par", size: 16, color: GRAY, font: "Arial" })],
      })
    );
    if (signatureImage) {
      issuerParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new ImageRun({
              data: signatureImage,
              transformation: { width: 160, height: 60 },
              type: "png",
            }),
          ],
        })
      );
    }
    issuerParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: "_______________________________", size: 16, color: NAVY, font: "Arial" })],
      }),
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: data.issuer.full_name || "-", bold: true, size: 22, color: NAVY, font: "Arial" })],
      })
    );
    if (data.issuer.role) {
      issuerParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: data.issuer.role, size: 18, color: CYAN, bold: true, font: "Arial" })],
        })
      );
    }
  }

  // Annexe
  const annexChildren: Paragraph[] = [];
  if (hasAnnex) {
    annexChildren.push(
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({
        children: [
          new TextRun({ text: "ANNEXE", bold: true, size: 24, color: CYAN, font: "Arial" }),
        ],
      }),
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({ text: "Descriptions détaillées", bold: true, size: 24, color: NAVY, font: "Arial" }),
        ],
      }),
      new Paragraph({
        spacing: { after: 200 },
        alignment: AlignmentType.LEFT,
        children: [
          new TextRun({
            text: "Cette annexe reprend in extenso la description des prestations dont le résumé figure dans le tableau principal. Chaque entrée référence le numéro de ligne d'origine.",
            size: 24,
            color: "374151",
            italics: true,
            font: "Arial",
          }),
        ],
      }),
    );
    annexItems.forEach((it) => {
      annexChildren.push(
        new Paragraph({
          spacing: { before: 240, after: 60 },
          alignment: AlignmentType.LEFT,
          children: [
            new TextRun({ text: `#${it.position} — `, bold: true, size: 24, color: CYAN, font: "Arial" }),
            new TextRun({ text: it.description, bold: true, size: 24, color: NAVY, font: "Arial" }),
          ],
        }),
      );
      (it.subtitle || "").split("\n").forEach((line) => {
        annexChildren.push(
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [new TextRun({ text: line, size: 24, color: "374151", font: "Arial" })],
          }),
        );
      });
    });
  }

  // Watermark (via header, sans rotation — limite de docx-js)
  let watermarkHeader: Header | undefined;
  if (isPaid) {
    watermarkHeader = buildWatermarkHeader("PAYÉ", GREEN);
  } else if (isProforma) {
    watermarkHeader = buildWatermarkHeader("PROFORMA", CYAN);
  }

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
        headers: watermarkHeader ? { default: watermarkHeader } : undefined,
        children: [
          headerTable,
          new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),
          clientPaymentTable,
          new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),
          itemsTable,
          new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),
          totalsTable,
          ...issuerParagraphs,
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 400 },
            children: [
              new TextRun({
                text: "Enregistré sous N° GN.TCC.2025.B18495 · Partenaire : Microsoft · Datadog · Google Cloud",
                size: 14,
                color: GRAY,
                font: "Arial",
              }),
            ],
          }),
          ...annexChildren,
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
