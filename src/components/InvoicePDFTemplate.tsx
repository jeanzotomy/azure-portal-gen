import { forwardRef } from "react";
import logo from "@/assets/cloudmature-logo.png";

export interface InvoiceItemData {
  position: number;
  description: string;
  subtitle?: string | null;
  quantity: number;
  unit?: string | null;
  unit_price: number;
  discount_rate?: number;
  total: number;
}

export interface InvoicePaymentDetails {
  bank?: string;
  iban?: string;
  swift?: string;
  mobile_money?: string;
  reference?: string;
}

export interface InvoicePaymentMethodEntry {
  label: string;
  type: "virement" | "mobile_money" | "especes" | "cheque" | "depot" | "autre";
  currency?: string;
  bank?: string | null;
  iban?: string | null;
  swift?: string | null;
  account_holder?: string | null;
  mobile_number?: string | null;
  instructions?: string | null;
}

export interface InvoicePDFData {
  invoice_number: string;
  invoice_date: string; // ISO yyyy-mm-dd
  due_date?: string | null;
  currency: "GNF" | "USD" | "EUR";
  client: {
    client_name: string;
    nif?: string | null;
    rccm?: string | null;
    address_line?: string | null;
    city?: string | null;
    country?: string | null;
    phone?: string | null;
    email?: string | null;
    contact_person?: string | null;
  };
  payment_details: InvoicePaymentDetails;
  payment_methods?: InvoicePaymentMethodEntry[];
  items: InvoiceItemData[];
  subtotal: number;
  discount_rate: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  early_payment_discount_rate?: number;
  early_payment_discount_amount?: number;
  total: number;
  notes?: string | null;
  issuer?: {
    full_name?: string | null;
    role?: string | null;
    signature_url?: string | null;
  } | null;
}

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

/**
 * Reproduit fidèlement le modèle CloudMature (PDF/Word).
 * Largeur fixe en pixels (794 = A4 à 96 dpi) pour rendu html2canvas constant.
 */
export const InvoicePDFTemplate = forwardRef<HTMLDivElement, { data: InvoicePDFData }>(
  ({ data }, ref) => {
    const cyan = "#1FB6E5";
    const navy = "#0B1F33";

    return (
      <div
        ref={ref}
        style={{
          width: "794px",
          minHeight: "1123px",
          background: "#ffffff",
          color: "#111827",
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
          padding: "32px 40px",
          boxSizing: "border-box",
          fontSize: "12px",
          lineHeight: 1.4,
        }}
      >
        {/* En-tête */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <img src={logo} alt="CloudMature" style={{ height: "44px" }} />
              <div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: navy }}>Cloud Mature</div>
                <div style={{ fontSize: "10px", color: cyan, fontWeight: 500 }}>
                  Innover • Optimiser • Automatiser
                </div>
              </div>
            </div>
            <div style={{ fontSize: "11px", color: "#374151", marginTop: "8px", lineHeight: 1.5 }}>
              <div>Kipé Centre Émetteur, C/Ratoma</div>
              <div>Conakry, Guinée</div>
              <div style={{ color: cyan }}>info@cloudmature.com</div>
              <div>+224 626 441 150</div>
              <div style={{ color: cyan }}>www.cloudmature.com</div>
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "32px", fontWeight: 800, color: navy, letterSpacing: "1px" }}>
              FACTURE
            </div>
            <div style={{ fontSize: "12px", color: cyan, fontWeight: 600, marginTop: "4px" }}>
              N° {data.invoice_number}
            </div>
            <div style={{ fontSize: "11px", color: "#374151", marginTop: "8px" }}>
              Date : {formatDate(data.invoice_date)}
            </div>
            {data.due_date && (
              <div style={{ fontSize: "11px", color: "#374151" }}>
                Échéance : {formatDate(data.due_date)}
              </div>
            )}
          </div>
        </div>

        {/* Bandeau Client / Détails de paiement */}
        <div style={{ marginTop: "24px", display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: "0" }}>
          <div style={{ background: navy, color: "#fff", padding: "8px 12px", fontSize: "11px", fontWeight: 600 }}>
            CLIENT
          </div>
          <div style={{ background: navy, color: "#fff", padding: "8px 12px", fontSize: "11px", fontWeight: 600 }}>
            DÉTAILS DE PAIEMENT
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: "0", background: "#EAF6FB" }}>
          <div style={{ padding: "12px", borderRight: "2px solid #fff" }}>
            <div style={{ fontWeight: 700, fontSize: "13px", color: navy }}>{data.client.client_name}</div>
            {data.client.contact_person && (
              <div style={{ fontSize: "11px", color: "#374151", marginTop: "2px" }}>
                À l'attention de : {data.client.contact_person}
              </div>
            )}
            {data.client.nif && (
              <div style={{ fontSize: "11px", color: "#374151", marginTop: "4px" }}>
                NIF : {data.client.nif}
              </div>
            )}
            {data.client.rccm && (
              <div style={{ fontSize: "11px", color: "#374151" }}>
                N°RCCM : {data.client.rccm}
              </div>
            )}
            {(data.client.address_line || data.client.city) && (
              <div style={{ fontSize: "11px", color: "#374151", marginTop: "4px" }}>
                {[data.client.address_line, data.client.city, data.client.country].filter(Boolean).join(", ")}
              </div>
            )}
            {data.client.phone && (
              <div style={{ fontSize: "11px", color: "#374151" }}>{data.client.phone}</div>
            )}
            {data.client.email && (
              <div style={{ fontSize: "11px", color: cyan }}>{data.client.email}</div>
            )}
          </div>
          <div style={{ padding: "12px" }}>
            {data.payment_methods && data.payment_methods.length > 0 ? (
              data.payment_methods.map((pm, i) => {
                const typeLabels: Record<string, string> = {
                  virement: "Virement bancaire",
                  mobile_money: "Mobile Money",
                  especes: "Espèces",
                  cheque: "Chèque",
                  depot: "Dépôt en espèces",
                  autre: "Autre",
                };
                return (
                  <div key={i} style={{ marginBottom: i < (data.payment_methods!.length - 1) ? "8px" : 0, paddingBottom: i < (data.payment_methods!.length - 1) ? "6px" : 0, borderBottom: i < (data.payment_methods!.length - 1) ? "1px dashed #B6D8E5" : "none" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: navy }}>
                      {pm.label} <span style={{ fontWeight: 400, color: "#6B7280" }}>· {typeLabels[pm.type] ?? pm.type}</span>
                    </div>
                    {pm.bank && <div style={{ fontSize: "10.5px", marginTop: "2px" }}><b>Banque :</b> {pm.bank}</div>}
                    {pm.account_holder && <div style={{ fontSize: "10.5px" }}><b>Titulaire :</b> {pm.account_holder}</div>}
                    {pm.iban && <div style={{ fontSize: "10.5px" }}><b>IBAN / Compte :</b> {pm.iban}</div>}
                    {pm.swift && <div style={{ fontSize: "10.5px" }}><b>SWIFT :</b> {pm.swift}</div>}
                    {pm.mobile_number && <div style={{ fontSize: "10.5px" }}><b>Mobile Money :</b> {pm.mobile_number}</div>}
                    {pm.instructions && <div style={{ fontSize: "10px", fontStyle: "italic", color: "#6B7280", marginTop: "2px" }}>{pm.instructions}</div>}
                  </div>
                );
              })
            ) : (
              <>
                {data.payment_details.bank && (
                  <div style={{ fontSize: "11px" }}>
                    <span style={{ fontWeight: 700, textDecoration: "underline" }}>Banque :</span>{" "}
                    {data.payment_details.bank}
                  </div>
                )}
                {data.payment_details.iban && (
                  <div style={{ fontSize: "11px", marginTop: "2px" }}>
                    <span style={{ fontWeight: 700 }}>IBAN / Compte :</span> {data.payment_details.iban}
                  </div>
                )}
                {data.payment_details.swift && (
                  <div style={{ fontSize: "11px", marginTop: "2px" }}>
                    <span style={{ fontWeight: 700, textDecoration: "underline" }}>SWIFT :</span>{" "}
                    {data.payment_details.swift}
                  </div>
                )}
                {data.payment_details.mobile_money && (
                  <div style={{ fontSize: "11px", marginTop: "2px" }}>
                    <span style={{ fontWeight: 700 }}>Mobile Money :</span> {data.payment_details.mobile_money}
                  </div>
                )}
                {data.payment_details.reference && (
                  <div style={{ fontSize: "11px", marginTop: "2px" }}>
                    <span style={{ fontWeight: 700 }}>Référence :</span> {data.payment_details.reference}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Tableau des lignes */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "20px", fontSize: "11px" }}>
          <thead>
            <tr style={{ background: cyan, color: "#fff" }}>
              <th style={{ padding: "8px", textAlign: "left", width: "30px", fontWeight: 700 }}>#</th>
              <th style={{ padding: "8px", textAlign: "left", fontWeight: 700 }}>DESCRIPTION</th>
              <th style={{ padding: "8px", textAlign: "center", width: "50px", fontWeight: 700 }}>QTÉ</th>
              <th style={{ padding: "8px", textAlign: "right", width: "100px", fontWeight: 700 }}>PRIX UNIT.</th>
              <th style={{ padding: "8px", textAlign: "center", width: "55px", fontWeight: 700 }}>REMISE</th>
              <th style={{ padding: "8px", textAlign: "right", width: "120px", fontWeight: 700 }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: "1px solid #E5E7EB" }}>
                <td style={{ padding: "10px 8px", color: cyan, fontWeight: 700, verticalAlign: "top" }}>
                  {item.position}
                </td>
                <td style={{ padding: "10px 8px", verticalAlign: "top" }}>
                  <div style={{ fontWeight: 600, color: navy }}>{item.description}</div>
                  {item.subtitle && (
                    <div style={{ fontStyle: "italic", color: "#6B7280", marginTop: "2px", fontSize: "10px" }}>
                      {item.subtitle}
                    </div>
                  )}
                </td>
                <td style={{ padding: "10px 8px", textAlign: "center", verticalAlign: "top" }}>
                  {item.quantity}{item.unit && item.unit !== "unité" ? ` ${item.unit}` : ""}
                </td>
                <td style={{ padding: "10px 8px", textAlign: "right", verticalAlign: "top" }}>
                  {formatCurrency(item.unit_price, data.currency)}
                </td>
                <td style={{ padding: "10px 8px", textAlign: "center", verticalAlign: "top", color: item.discount_rate ? "#DC2626" : "#9CA3AF" }}>
                  {item.discount_rate ? `−${item.discount_rate}%` : "—"}
                </td>
                <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 700, verticalAlign: "top" }}>
                  {formatCurrency(item.total, data.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Notes + Totaux */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "24px" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "11px", color: navy, marginBottom: "6px" }}>
              NOTES & CONDITIONS
            </div>
            <div style={{ fontSize: "10px", color: "#374151", whiteSpace: "pre-line", lineHeight: 1.5 }}>
              {data.notes ||
                `• Paiement dû dans les 30 jours suivant la date de facturation.
• Tout retard de paiement entraînera des pénalités de 1,5% par mois.
• Les services sont soumis aux CGV disponibles sur www.cloudmature.com.
• TVA applicable selon la réglementation guinéenne en vigueur.`}
            </div>
          </div>
          <div style={{ background: "#EAF6FB", padding: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "11px" }}>
              <span style={{ fontWeight: 600 }}>Sous-total</span>
              <span style={{ fontWeight: 700 }}>{formatCurrency(data.subtotal, data.currency)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 0",
                fontSize: "11px",
                borderTop: "1px solid #fff",
              }}
            >
              <span>Remise ({data.discount_rate}%)</span>
              <span>— {formatCurrency(data.discount_amount, data.currency)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 0",
                fontSize: "11px",
                borderTop: "1px solid #fff",
              }}
            >
              <span>TVA ({data.tax_rate}%)</span>
              <span>{formatCurrency(data.tax_amount, data.currency)}</span>
            </div>
            {!!data.early_payment_discount_rate && data.early_payment_discount_rate > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "6px 0",
                  fontSize: "11px",
                  borderTop: "1px solid #fff",
                  color: "#DC2626",
                }}
              >
                <span>Escompte paiement anticipé ({data.early_payment_discount_rate}%)</span>
                <span>— {formatCurrency(data.early_payment_discount_amount ?? 0, data.currency)}</span>
              </div>
            )}
            <div
              style={{
                background: cyan,
                color: "#fff",
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 12px",
                marginTop: "8px",
                fontSize: "13px",
                fontWeight: 800,
              }}
            >
              <span>NET À PAYER</span>
              <span>{formatCurrency(data.total, data.currency)}</span>
            </div>
          </div>
        </div>

        {/* Bloc Émis par (signataire) */}
        {data.issuer && (data.issuer.full_name || data.issuer.signature_url) && (
          <div style={{ marginTop: "32px", display: "flex", justifyContent: "flex-end" }}>
            <div style={{ minWidth: "260px", textAlign: "center" }}>
              <div style={{ fontSize: "10px", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
                Émis par
              </div>
              {data.issuer.signature_url && (
                <img
                  src={data.issuer.signature_url}
                  alt="Signature"
                  crossOrigin="anonymous"
                  style={{ maxHeight: "70px", maxWidth: "240px", objectFit: "contain", display: "block", margin: "0 auto" }}
                />
              )}
              <div style={{ borderTop: `1px solid ${navy}`, marginTop: "4px", paddingTop: "4px" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: navy }}>
                  {data.issuer.full_name || "—"}
                </div>
                {data.issuer.role && (
                  <div style={{ fontSize: "10px", color: cyan, fontWeight: 600, textTransform: "capitalize" }}>
                    {data.issuer.role}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            marginTop: "24px",
            paddingTop: "12px",
            borderTop: `2px solid ${cyan}`,
            fontSize: "9px",
            color: "#6B7280",
            textAlign: "center",
          }}
        >
          Enregistré sous N° GN.TCC.2025.B18495 · Partenaire : Microsoft · Datadog · Google Cloud
        </div>
      </div>
    );
  }
);

InvoicePDFTemplate.displayName = "InvoicePDFTemplate";
