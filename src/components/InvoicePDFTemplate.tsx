import { forwardRef } from "react";
import logo from "@/assets/cloudmature-logo.png";

export type BillingFrequency = "mensuel" | "trimestriel" | "semestriel" | "annuel";

export interface InvoiceItemData {
  position: number;
  description: string;
  subtitle?: string | null;
  quantity: number;
  unit?: string | null;
  unit_price: number;
  discount_rate?: number;
  total: number;
  is_recurring?: boolean;
  billing_frequency?: BillingFrequency | null;
  periods?: number;
}

const FREQ_PERIOD_LABEL: Record<BillingFrequency, { adj: string; period: string; periodPlural: string }> = {
  mensuel:     { adj: "Mensuel",     period: "mois",      periodPlural: "mois"
  },
  trimestriel: { adj: "Trimestriel", period: "trimestre", periodPlural: "trimestres"
  },
  semestriel:  { adj: "Semestriel",  period: "semestre",  periodPlural: "semestres"
  },
  annuel:      { adj: "Annuel",      period: "an",        periodPlural: "ans"
  },
};

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
  is_proforma?: boolean;
  status?: "brouillon" | "proforma" | "emise" | "payee" | "en_retard" | "annulee";
  paid_at?: string | null;
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
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric"
  });
};

/** Caractères au-delà desquels une description est considérée "longue" et renvoyée en annexe. */
const SUBTITLE_MAX_CHARS = 180;

const isLongSubtitle = (s?: string | null) => !!s && s.trim().length > SUBTITLE_MAX_CHARS;

export const InvoicePDFTemplate = forwardRef<HTMLDivElement, { data: InvoicePDFData }>(
  ({ data }, ref) => {
    const cyan = "#1FB6E5";
    const navy = "#0B1F33";

    // Items qui nécessitent une annexe : abonnements/licences avec un sous-titre long.
    // Les services sans description (ou description courte) ne sont pas renvoyés en annexe.
    const isSubscriptionLike = (it: InvoiceItemData) =>
      !!(it.is_recurring || it.billing_frequency);
    const annexItems = data.items.filter(
      (it) => isSubscriptionLike(it) && isLongSubtitle(it.subtitle)
    );
    const hasAnnex = annexItems.length > 0;

    const pageStyle: React.CSSProperties = {
      width: "794px",
      minHeight: "1123px",
      background: "#ffffff",
      color: "#111827",
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      padding: "32px 40px",
      boxSizing: "border-box",
      fontSize: "12px",
      lineHeight: 1.4,
      position: "relative",
    };

    return (
      <div ref={ref} style={{ width: "794px", background: "#ffffff"
  }}>
        <div className="invoice-page" style={{ ...pageStyle, overflow: "hidden" }}>

        {/* Filigrane PROFORMA */}
        {data.is_proforma && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
              zIndex: 0,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                transform: "rotate(-30deg)",
                fontSize: "130px",
                fontWeight: 900,
                color: cyan,
                opacity: 0.10,
                whiteSpace: "nowrap",
                letterSpacing: "4px",
                userSelect: "none",
              }}
            >
              PROFORMA
            </div>

          </div>
        )}

        {/* Filigrane PAYÉ (reçu) */}
        {data.status === "payee" && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
              zIndex: 0,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                transform: "rotate(-30deg)",
                fontSize: "150px",
                fontWeight: 900,
                color: "#16A34A",
                opacity: 0.12,
                whiteSpace: "nowrap",
                letterSpacing: "6px",
                userSelect: "none",
              }}
            >
              PAYÉ
            </div>

          </div>
        )}

        <div style={{ position: "relative", zIndex: 1 }}>

        {/* En-tête */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start"
  }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px"
  }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px"
  }}>
              <img src={logo} alt="CloudMature" style={{ height: "44px"
  }} />
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

          <div style={{ textAlign: "right"
  }}>
            <div style={{ fontSize: data.is_proforma ? "26px" : "32px", fontWeight: 800, color: navy, letterSpacing: "1px"
  }}>
              {data.is_proforma ? "FACTURE PROFORMA" : "FACTURE"}
            </div>
            <div style={{ fontSize: "12px", color: cyan, fontWeight: 600, marginTop: "4px"
  }}>
              N° {data.invoice_number}
            </div>
            <div style={{ fontSize: "11px", color: "#374151", marginTop: "8px"
  }}>
              Date : {formatDate(data.invoice_date)}
            </div>
            {data.due_date && (
              <div style={{ fontSize: "11px", color: "#374151"
  }}>
                Échéance : {formatDate(data.due_date)}
              </div>
            )}
          </div>
        </div>

        {/* Bandeau Client / Détails de paiement */}
        <div style={{ marginTop: "24px", display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: "0"
  }}>
          <div style={{ background: navy, color: "#fff", padding: "8px 12px", fontSize: "11px", fontWeight: 600 }}>
            CLIENT
          </div>
          <div style={{ background: navy, color: "#fff", padding: "8px 12px", fontSize: "11px", fontWeight: 600 }}>
            DÉTAILS DE PAIEMENT
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: "0", background: "#EAF6FB"
  }}>
          <div style={{ padding: "12px", borderRight: "2px solid #fff"
  }}>
            <div style={{ fontWeight: 700, fontSize: "13px", color: navy }}>{data.client.client_name}</div>
            {data.client.contact_person && (
              <div style={{ fontSize: "11px", color: "#374151", marginTop: "2px"
  }}>
                À l'attention de : {data.client.contact_person}
              </div>
            )}
            {data.client.nif && (
              <div style={{ fontSize: "11px", color: "#374151", marginTop: "4px"
  }}>
                NIF : {data.client.nif}
              </div>
            )}
            {data.client.rccm && (
              <div style={{ fontSize: "11px", color: "#374151"
  }}>
                N°RCCM : {data.client.rccm}
              </div>
            )}
            {(data.client.address_line || data.client.city) && (
              <div style={{ fontSize: "11px", color: "#374151", marginTop: "4px"
  }}>
                {[data.client.address_line, data.client.city, data.client.country].filter(Boolean).join(", ")}
              </div>
            )}
            {data.client.phone && (
              <div style={{ fontSize: "11px", color: "#374151"
  }}>{data.client.phone}</div>
            )}
            {data.client.email && (
              <div style={{ fontSize: "11px", color: cyan }}>{data.client.email}</div>
            )}
          </div>
          <div style={{ padding: "12px"
  }}>
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
                  <div key={i} style={{ marginBottom: i < (data.payment_methods!.length - 1) ? "8px" : 0, paddingBottom: i < (data.payment_methods!.length - 1) ? "6px" : 0, borderBottom: i < (data.payment_methods!.length - 1) ? "1px dashed #B6D8E5" : "none"
  }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: navy }}>
                      {pm.label} <span style={{ fontWeight: 400, color: "#6B7280"
  }}>· {typeLabels[pm.type] ?? pm.type}</span>
                    </div>
                    {pm.bank && <div style={{ fontSize: "10.5px", marginTop: "2px"
  }}><b>Banque :</b> {pm.bank}</div>}
                    {pm.account_holder && <div style={{ fontSize: "10.5px"
  }}><b>Titulaire :</b> {pm.account_holder}</div>}
                    {pm.iban && <div style={{ fontSize: "10.5px"
  }}><b>IBAN / Compte :</b> {pm.iban}</div>}
                    {pm.swift && <div style={{ fontSize: "10.5px"
  }}><b>SWIFT :</b> {pm.swift}</div>}
                    {pm.mobile_number && <div style={{ fontSize: "10.5px"
  }}><b>Mobile Money :</b> {pm.mobile_number}</div>}
                    {pm.instructions && <div style={{ fontSize: "10px", fontStyle: "italic", color: "#6B7280", marginTop: "2px"
  }}>{pm.instructions}</div>}
                  </div>
                );
              })
            ) : (
              <>
                {data.payment_details.bank && (
                  <div style={{ fontSize: "11px"
  }}>
                    <span style={{ fontWeight: 700, textDecoration: "underline"
  }}>Banque :</span>{" "}
                    {data.payment_details.bank}
                  </div>
                )}
                {data.payment_details.iban && (
                  <div style={{ fontSize: "11px", marginTop: "2px"
  }}>
                    <span style={{ fontWeight: 700 }}>IBAN / Compte :</span> {data.payment_details.iban}
                  </div>
                )}
                {data.payment_details.swift && (
                  <div style={{ fontSize: "11px", marginTop: "2px"
  }}>
                    <span style={{ fontWeight: 700, textDecoration: "underline"
  }}>SWIFT :</span>{" "}
                    {data.payment_details.swift}
                  </div>
                )}
                {data.payment_details.mobile_money && (
                  <div style={{ fontSize: "11px", marginTop: "2px"
  }}>
                    <span style={{ fontWeight: 700 }}>Mobile Money :</span> {data.payment_details.mobile_money}
                  </div>
                )}
                {data.payment_details.reference && (
                  <div style={{ fontSize: "11px", marginTop: "2px"
  }}>
                    <span style={{ fontWeight: 700 }}>Référence :</span> {data.payment_details.reference}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Tableau des lignes */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "20px", fontSize: "11px"
  }}>
          <thead>
            <tr style={{ background: cyan, color: "#fff"
  }}>
              <th style={{ padding: "8px", textAlign: "left", width: "30px", fontWeight: 700 }}>#</th>
              <th style={{ padding: "8px", textAlign: "left", fontWeight: 700 }}>DESCRIPTION</th>
              <th style={{ padding: "8px", textAlign: "center", width: "50px", fontWeight: 700 }}>QTÉ</th>
              <th style={{ padding: "8px", textAlign: "right", width: "100px", fontWeight: 700 }}>PRIX UNIT.</th>
              <th style={{ padding: "8px", textAlign: "center", width: "55px", fontWeight: 700 }}>REMISE</th>
              <th style={{ padding: "8px", textAlign: "right", width: "120px", fontWeight: 700 }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, idx) => {
              const freq = item.billing_frequency ? FREQ_PERIOD_LABEL[item.billing_frequency] : null;
              const periods = Math.max(1, item.periods ?? 1);
              const isRecurring = !!(item.is_recurring || freq);
              return (
              <tr key={idx} style={{ borderBottom: "1px solid #E5E7EB"
  }}>
                <td style={{ padding: "10px 8px", color: cyan, fontWeight: 700, verticalAlign: "top"
  }}>
                  {item.position}
                </td>
                <td style={{ padding: "10px 8px", verticalAlign: "top"
  }}>
                  <div style={{ fontWeight: 600, color: navy }}>{item.description}</div>
                  {isRecurring && (
                    <div style={{ marginTop: "4px", lineHeight: 1.2 }}>
                      <span style={{
                        display: "inline-block",
                        color: cyan,
                        fontSize: "9px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        whiteSpace: "nowrap",
                      }}>
                        <span style={{ color: cyan }}>●</span>{" "}
                        Abonnement{freq ? ` · ${freq.adj}` : ""} · {periods}{" "}
                        {freq ? (periods > 1 ? freq.periodPlural : freq.period) : (periods > 1 ? "périodes" : "période")}
                      </span>
                    </div>
                  )}
                  {item.subtitle && (() => {
                    const long = isLongSubtitle(item.subtitle);
                    const goesToAnnex = isRecurring && long;
                    return (
                      <>
                        <div
                          style={{
                            fontStyle: "italic",
                            color: "#6B7280",
                            marginTop: "4px",
                            fontSize: "10px",
                            display: "-webkit-box",
                            WebkitLineClamp: goesToAnnex ? 2 : undefined,
                            WebkitBoxOrient: "vertical",
                            overflow: goesToAnnex ? "hidden" : "visible",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {item.subtitle}
                        </div>
                        {goesToAnnex && (
                          <div style={{ marginTop: "3px", fontSize: "9px", color: cyan, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "4px"
  }}>
                            <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: cyan }} />
                            Détail complet - voir Annexe (p. 2)
                          </div>
                        )}
                      </>
                    );
                  })()}

                </td>
                <td style={{ padding: "10px 8px", textAlign: "center", verticalAlign: "top"
  }}>
                  <div>{item.quantity}{item.unit && item.unit !== "unité" ? ` ${item.unit}` : ""}</div>
                  {isRecurring && (
                    <div style={{ fontSize: "9px", color: "#6B7280", marginTop: "2px", fontWeight: 600 }}>
                      × {periods} {freq ? (periods > 1 ? freq.periodPlural : freq.period) : (periods > 1 ? "périodes" : "période")}
                    </div>
                  )}
                </td>
                <td style={{ padding: "10px 8px", textAlign: "right", verticalAlign: "top"
  }}>
                  <div>{formatCurrency(item.unit_price, data.currency)}</div>
                  {freq && (
                    <div style={{ fontSize: "9px", color: "#6B7280", marginTop: "2px"
  }}>
                      /{item.unit && item.unit !== "unité" ? `${item.unit}/` : ""}{freq.period}
                    </div>
                  )}
                </td>
                <td style={{ padding: "10px 8px", textAlign: "center", verticalAlign: "top", color: item.discount_rate ? "#DC2626" : "#9CA3AF"
  }}>
                  {item.discount_rate ? `−${item.discount_rate}%` : "-"}
                </td>
                <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 700, verticalAlign: "top"
  }}>
                  {formatCurrency(item.total, data.currency)}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>

        {/* Notes + Totaux */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "24px"
  }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "11px", color: navy, marginBottom: "6px"
  }}>
              NOTES & CONDITIONS
            </div>
            <div style={{ fontSize: "10px", color: "#374151", whiteSpace: "pre-line", lineHeight: 1.5, textAlign: "left" }}>
              {data.notes && data.notes.trim().length > 0
                ? data.notes
                : (() => {
                    const status = data.status ?? (data.is_proforma ? "proforma" : "emise");
                    const dueStr = data.due_date ? formatDate(data.due_date) : null;
                    const days = data.due_date
                      ? Math.max(
                          0,
                          Math.round(
                            (new Date(data.due_date).getTime() - new Date(data.invoice_date).getTime()) /
                              86400000,
                          ),
                        )
                      : null;
                    const delay =
                      days === null
                        ? "à réception"
                        : days <= 0
                          ? "à réception"
                          : `${days} jour${days > 1 ? "s" : ""} après émission`;
                    const dueLine = dueStr
                      ? `• Paiement dû au plus tard le ${dueStr} (${delay}).`
                      : `• Paiement ${delay}.`;
                    switch (status) {
                      case "brouillon":
                        return `• Document de travail — non contractuel.
• Les montants, délais et conditions restent à valider avant émission.
• Ne constitue ni un devis engageant ni un justificatif comptable.`;
                      case "proforma":
                        return `• Devis proforma valable 30 jours à compter de la date d'émission.
• Ce document ne constitue pas une facture définitive et ne vaut pas justificatif comptable.
${dueLine}
• TVA applicable selon la réglementation guinéenne en vigueur.`;
                      case "payee":
                        return `• Facture réglée${data.paid_at ? ` le ${formatDate(data.paid_at)}` : ""}.
• Ce document tient lieu de reçu de paiement.
• Merci de votre confiance.`;
                      case "annulee":
                        return `• Facture annulée — sans valeur comptable.
• Ce document est conservé à titre d'archive uniquement.`;
                      case "en_retard":
                        return `${dueLine}
• Paiement en retard : des pénalités de 1,5% par mois peuvent s'appliquer.
• Merci de régulariser dans les meilleurs délais.
• TVA applicable selon la réglementation guinéenne en vigueur.`;
                      case "emise":
                      default:
                        return `${dueLine}
• Tout retard de paiement entraînera des pénalités de 1,5% par mois.
• Services soumis aux CGV disponibles sur www.cloudmature.com.
• TVA applicable selon la réglementation guinéenne en vigueur.`;
                    }
                  })()}
            </div>
          </div>
          <div style={{ background: "#EAF6FB", padding: "12px"
  }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "11px"
  }}>
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
              <span>- {formatCurrency(data.discount_amount, data.currency)}</span>
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
                <span>- {formatCurrency(data.early_payment_discount_amount ?? 0, data.currency)}</span>
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
          <div style={{ marginTop: "32px", display: "flex", justifyContent: "flex-end"
  }}>
            <div style={{ minWidth: "260px", textAlign: "center"
  }}>
              <div style={{ fontSize: "10px", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px"
  }}>
                Émis par
              </div>
              {data.issuer.signature_url && (
                <img
                  src={data.issuer.signature_url}
                  alt="Signature"
                  crossOrigin="anonymous"
                  style={{ maxHeight: "70px", maxWidth: "240px", objectFit: "contain", display: "block", margin: "0 auto"
  }}
                />
              )}
              <div style={{ borderTop: `1px solid ${navy}`, marginTop: "4px", paddingTop: "4px"
  }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: navy }}>
                  {data.issuer.full_name || "-"}
                </div>
                {data.issuer.role && (
                  <div style={{ fontSize: "10px", color: cyan, fontWeight: 600, textTransform: "capitalize"
  }}>
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
          {hasAnnex && <span style={{ float: "right", color: navy, fontWeight: 600 }}>Page 1 / 2</span>}
        </div>
        </div>
        </div>
        {/* ───────── ANNEXE - Descriptions détaillées ───────── */}
        {hasAnnex && (
          <div className="invoice-page" style={{ ...pageStyle, pageBreakBefore: "always"
  }}>
            {/* En-tête annexe */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `2px solid ${cyan}`, paddingBottom: "12px"
  }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px"
  }}>
                <img src={logo} alt="CloudMature" style={{ height: "34px"
  }} />
                <div>
                  <div style={{ fontSize: "11px", color: cyan, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase"
  }}>Annexe</div>
                  <div style={{ fontSize: "16px", fontWeight: 800, color: navy }}>Descriptions détaillées</div>
                </div>
              </div>
              <div style={{ textAlign: "right"
  }}>
                <div style={{ fontSize: "11px", color: "#6B7280"
  }}>Facture</div>
                <div style={{ fontSize: "14px", color: cyan, fontWeight: 700 }}>N° {data.invoice_number}</div>
                <div style={{ fontSize: "10px", color: "#6B7280", marginTop: "2px"
  }}>{formatDate(data.invoice_date)}</div>
              </div>
            </div>

            <div style={{ marginTop: "14px", fontSize: "10.5px", color: "#374151", background: "#EAF6FB", padding: "10px 14px", borderLeft: `3px solid ${cyan}` }}>
              Cette annexe reprend in extenso la description des prestations dont le résumé figure dans le tableau principal.
              Chaque entrée référence le numéro de ligne d'origine.
            </div>

            <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "16px"
  }}>
              {annexItems.map((it) => (
                <div key={it.position} style={{ display: "grid", gridTemplateColumns: "44px 1fr", gap: "14px", padding: "14px 16px", border: `1px solid #E5E7EB`, borderLeft: `4px solid ${cyan}`, borderRadius: "4px", background: "#FBFEFF"
  }}>
                  <div style={{ background: navy, color: "#fff", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "13px"
  }}>
                    {it.position}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: navy, fontSize: "12.5px"
  }}>{it.description}</div>
                    <div style={{ marginTop: "6px", fontSize: "10.5px", color: "#374151", whiteSpace: "pre-line", lineHeight: 1.55 }}>
                      {it.subtitle}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer annexe */}
            <div
              style={{
                position: "absolute",
                left: "40px",
                right: "40px",
                bottom: "24px",
                paddingTop: "12px",
                borderTop: `2px solid ${cyan}`,
                fontSize: "9px",
                color: "#6B7280",
                textAlign: "center",
              }}
            >
              Annexe à la facture N° {data.invoice_number} · Cloud Mature · www.cloudmature.com
              <span style={{ float: "right", color: navy, fontWeight: 600 }}>Page 2 / 2</span>
            </div>
          </div>
        )}
      </div>
    );
  }
);

InvoicePDFTemplate.displayName = "InvoicePDFTemplate";
