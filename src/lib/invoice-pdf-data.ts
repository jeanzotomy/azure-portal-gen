import { supabase } from "@/integrations/supabase/client";
import type { InvoicePDFData, InvoicePaymentMethodEntry } from "@/components/InvoicePDFTemplate";

/**
 * Charge toutes les données nécessaires au rendu PDF d'une facture
 * (facture, lignes, client, moyens de paiement).
 */
export async function loadInvoicePDFData(invoiceId: string): Promise<InvoicePDFData> {
  const [{ data: full }, { data: items }] = await Promise.all([
    supabase.from("service_invoices").select("*").eq("id", invoiceId).maybeSingle(),
    supabase.from("service_invoice_items").select("*").eq("invoice_id", invoiceId).order("position"),
  ]);
  if (!full) throw new Error("Facture introuvable");

  const { data: client } = await supabase
    .from("service_clients")
    .select("*")
    .eq("id", full.client_id)
    .maybeSingle();

  let methods: InvoicePaymentMethodEntry[] = [];
  const ids = (full.payment_method_ids as string[] | null) ?? [];
  if (ids.length) {
    const { data: pms } = await supabase.from("payment_methods").select("*").in("id", ids);
    methods = (pms ?? []).map((p) => ({
      label: p.label,
      type: p.type,
      currency: p.currency ?? undefined,
      bank: p.bank,
      iban: p.iban,
      swift: p.swift,
      account_holder: p.account_holder,
      mobile_number: p.mobile_number,
      instructions: p.instructions,
    }));
  }

  return {
    invoice_number: full.invoice_number ?? "(sans numéro)",
    invoice_date: full.invoice_date,
    due_date: full.due_date,
    currency: full.currency as "GNF" | "USD" | "EUR",
    is_proforma: full.status === "proforma",
    status: full.status as InvoicePDFData["status"],
    paid_at: full.paid_at,
    client: {
      client_name: client?.client_name ?? "",
      contact_person: client?.contact_person ?? null,
      nif: client?.nif ?? null,
      rccm: client?.rccm ?? null,
      address_line: client?.address_line ?? null,
      city: client?.city ?? null,
      country: client?.country ?? null,
      phone: client?.phone ?? null,
      email: client?.email ?? null,
    },
    payment_details: (full.payment_details as InvoicePDFData["payment_details"]) ?? {},
    payment_methods: methods,
    items: (items ?? []).map((it, i) => ({
      position: it.position ?? i + 1,
      description: it.description,
      subtitle: it.subtitle,
      quantity: Number(it.quantity),
      unit: it.unit,
      unit_price: Number(it.unit_price),
      discount_rate: Number(it.discount_rate ?? 0),
      total: Number(it.total),
      is_recurring: !!it.is_recurring,
      billing_frequency: (it.billing_frequency ?? null) as InvoicePDFData["items"][number]["billing_frequency"],
      periods: it.periods ?? 1,
    })),
    subtotal: Number(full.subtotal),
    discount_rate: Number(full.discount_rate),
    discount_amount: Number(full.discount_amount),
    tax_rate: Number(full.tax_rate),
    tax_amount: Number(full.tax_amount),
    early_payment_discount_rate: Number(full.early_payment_discount_rate ?? 0),
    early_payment_discount_amount: Number(full.early_payment_discount_amount ?? 0),
    total: Number(full.total),
    notes: full.notes,
  };
}

/** Préfixe du fichier selon le statut de la facture. */
export function invoiceFilePrefix(status: string) {
  return status === "proforma" ? "Proforma" : status === "payee" ? "Recu" : "Facture";
}
