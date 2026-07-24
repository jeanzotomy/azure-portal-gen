import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Eye, Loader2, Download, X } from "lucide-react";
import { InvoicePDFTemplate, type InvoicePDFData, type InvoicePaymentMethodEntry } from "@/components/InvoicePDFTemplate";
import { generateInvoicePDFBlob, generateInvoiceDocxBlob, sanitizeName } from "@/lib/invoice-generator";
import { saveAs } from "file-saver";

interface Props {
  invoiceId: string;
  status: string;
}

export default function InvoiceQuickPreviewButton({ invoiceId, status }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<InvoicePDFData | null>(null);
  const [downloading, setDownloading] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    try {
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
          label: p.label, type: p.type, currency: p.currency ?? undefined,
          bank: p.bank, iban: p.iban, swift: p.swift,
          account_holder: p.account_holder, mobile_number: p.mobile_number, instructions: p.instructions,
        }));
      }

      const pdfData: InvoicePDFData = {
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
      setData(pdfData);
      setOpen(true);
    } catch (e) {
      toast({ title: "Impossible de charger l'aperçu", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = async () => {
    if (!pdfRef.current || !data) return;
    setDownloading(true);
    try {
      const blob = await generateInvoicePDFBlob(pdfRef.current);
      const prefix = status === "proforma" ? "Proforma" : status === "payee" ? "Recu" : "Facture";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${prefix}_${sanitizeName(data.invoice_number)}_${sanitizeName(data.client.client_name)}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast({ title: "Échec du téléchargement", description: (e as Error).message, variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  const downloadWord = async () => {
    if (!data) return;
    setDownloading(true);
    try {
      const blob = await generateInvoiceDocxBlob(data);
      const prefix = status === "proforma" ? "Proforma" : status === "payee" ? "Recu" : "Facture";
      saveAs(blob, `${prefix}_${sanitizeName(data.invoice_number)}_${sanitizeName(data.client.client_name)}.docx`);
    } catch (e) {
      toast({ title: "Échec du téléchargement Word", description: (e as Error).message, variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <Button size="icon" variant="ghost" onClick={() => void load()} disabled={loading} title="Aperçu PDF">
        {loading ? <Loader2 size={14} className="animate-spin text-primary" /> : <Eye size={14} className="text-primary" />}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <Eye size={18} className="text-primary" />
              Aperçu — {data?.invoice_number ?? "Facture"}
            </DialogTitle>
          </DialogHeader>

          {data && (
            <div className="px-6 pb-6 space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => void downloadPdf()} disabled={downloading}>
                  {downloading ? <Loader2 size={14} className="animate-spin mr-1" /> : <Download size={14} className="mr-1" />}
                  Télécharger PDF
                </Button>
                <Button size="sm" variant="outline" onClick={() => void downloadWord()} disabled={downloading}>
                  <Download size={14} className="mr-1" />
                  Télécharger Word
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
                  <X size={14} className="mr-1" />
                  Fermer
                </Button>
              </div>

              <div className="border rounded-md overflow-auto bg-muted/30 p-2">
                <div style={{ transform: "scale(0.75)", transformOrigin: "top left", width: "794px" }}>
                  <InvoicePDFTemplate ref={pdfRef} data={data} />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
