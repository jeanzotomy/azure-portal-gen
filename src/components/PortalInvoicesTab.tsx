import { useEffect, useState, useCallback, useRef } from"react";
import type { User as SupaUser } from"@supabase/supabase-js";
import { supabase } from"@/integrations/supabase/client";
import { Card, CardContent } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { Badge } from"@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from"@/components/ui/dialog";
import { useStripeCheckout } from"@/hooks/useStripeCheckout";
import { useToast } from"@/hooks/use-toast";
import {
 FileText,
 RefreshCw,
 CreditCard,
 ExternalLink,
 Loader2,
 CheckCircle2,
 XCircle,
 Clock,
 Download,
 Eye,
} from"lucide-react";
import { InvoicePDFTemplate, type InvoicePDFData, type InvoicePaymentMethodEntry } from"@/components/InvoicePDFTemplate";
import { generateInvoicePDFBlob, generateInvoiceDocxBlob, sanitizeName } from"@/lib/invoice-generator";
import { saveAs } from"file-saver";

interface InvoiceRow {
 id: string;
 invoice_number: string | null;
 invoice_date: string;
 due_date: string | null;
 currency:"GNF"|"USD"|"EUR";
 total: number;
 status: string;
 sharepoint_url: string | null;
 notes: string | null;
 paid_at: string | null;
}

type PayState ="paid"|"open"|"failed";

const STATUS_MAP: Record<string, { label: string; state: PayState; cls: string; Icon: typeof CheckCircle2 }> = {
 payee: { label:"Payée", state:"paid", cls:"bg-emerald-600 text-white", Icon: CheckCircle2 },
 emise: { label:"Ouverte", state:"open", cls:"bg-blue-600 text-white", Icon: Clock },
 proforma:{ label:"Proforma", state:"failed", cls:"bg-amber-500 text-white", Icon: Clock },
 brouillon:{ label:"Brouillon", state:"open", cls:"bg-muted text-muted-foreground", Icon: Clock },
 en_retard:{ label:"En retard", state:"failed", cls:"bg-destructive text-destructive-foreground", Icon: XCircle },
 annulee: { label:"Annulée", state:"failed", cls:"bg-muted text-muted-foreground line-through", Icon: XCircle },
};

const fmtMoney = (n: number, c: string) =>
 `${new Intl.NumberFormat("fr-FR").format(Math.round(Number(n) || 0))} ${c}`;
const fmtDate = (iso?: string | null) =>
 iso ? new Date(iso).toLocaleDateString("fr-FR", { day:"2-digit", month:"long", year:"numeric"}) :"-";

export default function PortalInvoicesTab({ user: _user }: { user: SupaUser }) {
 const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
 const [loading, setLoading] = useState(true);
 const [detail, setDetail] = useState<InvoicePDFData | null>(null);
 const [detailRow, setDetailRow] = useState<InvoiceRow | null>(null);
 const [detailLoading, setDetailLoading] = useState(false);
 const [downloading, setDownloading] = useState(false);
 const pdfRef = useRef<HTMLDivElement>(null);
 const { openCheckout, closeCheckout, isOpen, checkoutElement } = useStripeCheckout();
 const { toast } = useToast();

 const load = useCallback(async () => {
 setLoading(true);
 const { data, error } = await supabase
 .from("service_invoices")
 .select("id, invoice_number, invoice_date, due_date, currency, total, status, sharepoint_url, notes, paid_at")
 .order("invoice_date", { ascending: false });
 if (error) {
 toast({ title:"Erreur", description: error.message, variant:"destructive"});
 }
 setInvoices((data ?? []) as InvoiceRow[]);
 setLoading(false);
 }, [toast]);

 useEffect(() => {
 void load();
 }, [load]);

  const pay = (inv: InvoiceRow) => {
  window.open(`/portal/pay/${inv.id}`, "_blank", "noopener,noreferrer");
  };

 const openDetail = async (inv: InvoiceRow) => {
 setDetailRow(inv);
 setDetail(null);
 setDetailLoading(true);
 try {
 const [{ data: full }, { data: items }] = await Promise.all([
 supabase.from("service_invoices").select("*").eq("id", inv.id).maybeSingle(),
 supabase.from("service_invoice_items").select("*").eq("invoice_id", inv.id).order("position"),
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
 const { data: pms } = await supabase
 .from("payment_methods")
 .select("*")
 .in("id", ids);
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

 const data: InvoicePDFData = {
 invoice_number: full.invoice_number ??"(sans numéro)",
 invoice_date: full.invoice_date,
 due_date: full.due_date,
			currency: full.currency as"GNF"|"USD"|"EUR",
 is_proforma: full.status === "proforma",
 status: full.status as InvoicePDFData["status"],
 paid_at: full.paid_at,
 client: {
 client_name: client?.client_name ??"",
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
 setDetail(data);
 } catch (e) {
 toast({ title:"Impossible de charger la facture", description: (e as Error).message, variant:"destructive"});
 setDetailRow(null);
 } finally {
 setDetailLoading(false);
 }
 };

 const downloadPdf = async () => {
 if (!pdfRef.current || !detail) return;
 setDownloading(true);
 try {
 const blob = await generateInvoicePDFBlob(pdfRef.current);
  const prefix = detailRow?.status === "proforma" ? "Proforma" : detailRow?.status === "payee" ? "Recu" : "Facture";
  const fileName = `${prefix}_${sanitizeName(detail.invoice_number)}_${sanitizeName(detail.client.client_name)}.pdf`;
 const url = URL.createObjectURL(blob);
 const a = document.createElement("a");
 a.href = url;
 a.download = fileName;
 document.body.appendChild(a);
 a.click();
 a.remove();
 URL.revokeObjectURL(url);
 } catch (e) {
 toast({ title:"Échec du téléchargement", description: (e as Error).message, variant:"destructive"});
 } finally {
 setDownloading(false);
 }
 };

 return (
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold flex items-center gap-2">
 <FileText className="text-primary"/> Mes factures
 </h1>
 <p className="text-sm text-muted-foreground">
 Consultez et réglez en ligne les factures qui vous ont été attribuées.
 </p>
 </div>
 <Button variant="outline"size="sm"onClick={() => void load()}>
 <RefreshCw size={14} className="mr-1"/> Actualiser
 </Button>
 </div>

 {loading ? (
 <div className="flex justify-center py-12">
 <Loader2 className="animate-spin text-primary"size={28} />
 </div>
 ) : invoices.length === 0 ? (
 <Card>
 <CardContent className="p-10 text-center text-muted-foreground">
 <FileText size={36} className="mx-auto mb-2 opacity-40"/>
 Aucune facture pour le moment.
 </CardContent>
 </Card>
 ) : (
 <div className="grid gap-3">
 {invoices.map((inv) => {
 const st = STATUS_MAP[inv.status] ?? { label: inv.status, state:"open"as PayState, cls:"bg-muted", Icon: Clock };
 const Icon = st.Icon;
 const canPay = st.state ==="open"&& Number(inv.total) > 0;
 return (
 <Card key={inv.id}>
 <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3 justify-between">
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <span className="font-semibold">{inv.invoice_number ??"(sans numéro)"}</span>
 <Badge className={`${st.cls} gap-1`}>
 <Icon size={12} /> {st.label}
 </Badge>
 </div>
 <div className="text-xs text-muted-foreground mt-1">
 Émise le {fmtDate(inv.invoice_date)}
 {inv.due_date && <> · Échéance {fmtDate(inv.due_date)}</>}
 {inv.paid_at && <> · Payée le {fmtDate(inv.paid_at)}</>}
 </div>
 <div className="text-lg font-bold text-primary mt-1">
 {fmtMoney(Number(inv.total), inv.currency)}
 </div>
 </div>
 <div className="flex flex-wrap items-center gap-2">
 <Button size="sm"variant="outline"onClick={() => void openDetail(inv)}>
 <Eye size={14} className="mr-1"/> Détails
 </Button>
 {inv.sharepoint_url && (
 <Button size="sm"variant="outline"asChild>
 <a href={inv.sharepoint_url} target="_blank"rel="noreferrer">
 <ExternalLink size={14} className="mr-1"/> Document
 </a>
 </Button>
 )}
 {canPay && (
 <Button size="sm"onClick={() => pay(inv)}>
 <CreditCard size={14} className="mr-1"/> Payer en ligne
 </Button>
 )}
 </div>
 </CardContent>
 </Card>
 );
 })}
 </div>
 )}

 {/* Detail dialog */}
 <Dialog open={!!detailRow} onOpenChange={(o) => { if (!o) { setDetailRow(null); setDetail(null); } }}>
 <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2 flex-wrap">
 <FileText size={18} className="text-primary"/>
 Facture {detailRow?.invoice_number ??""}
 {detailRow && (() => {
 const st = STATUS_MAP[detailRow.status] ?? { label: detailRow.status, cls:"bg-muted", Icon: Clock, state:"open"as PayState };
 const Icon = st.Icon;
 return <Badge className={`${st.cls} gap-1`}><Icon size={12} /> {st.label}</Badge>;
 })()}
 </DialogTitle>
 </DialogHeader>

 {detailLoading || !detail ? (
 <div className="flex justify-center py-12">
 <Loader2 className="animate-spin text-primary"size={28} />
 </div>
 ) : (
 <div className="space-y-4">
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
 <div>
 <div className="text-xs text-muted-foreground">Date d'émission</div>
 <div className="font-medium">{fmtDate(detail.invoice_date)}</div>
 </div>
 <div>
 <div className="text-xs text-muted-foreground">Échéance</div>
 <div className="font-medium">{fmtDate(detail.due_date)}</div>
 </div>
 <div>
 <div className="text-xs text-muted-foreground">Statut</div>
 <div className="font-medium">
 {STATUS_MAP[detailRow?.status ??""]?.label ?? detailRow?.status}
 </div>
 </div>
 <div>
 <div className="text-xs text-muted-foreground">Total TTC</div>
 <div className="font-bold text-primary">{fmtMoney(detail.total, detail.currency)}</div>
 </div>
 </div>

 <div className="flex flex-wrap gap-2">
  <Button onClick={() => void downloadPdf()} disabled={downloading}>
  {downloading ? <Loader2 className="animate-spin mr-1"size={14} /> : <Download size={14} className="mr-1"/>}
  Télécharger le PDF
  </Button>
  <Button
    variant="outline"
    disabled={downloading}
    onClick={async () => {
      if (!detail) return;
      setDownloading(true);
      try {
        const blob = await generateInvoiceDocxBlob(detail);
        const prefix = detailRow?.status === "proforma" ? "Proforma" : detailRow?.status === "payee" ? "Recu" : "Facture";
        saveAs(blob, `${prefix}_${sanitizeName(detail.invoice_number)}_${sanitizeName(detail.client.client_name)}.docx`);
      } catch (e) {
        toast({ title: "Échec du téléchargement Word", description: (e as Error).message, variant: "destructive" });
      } finally {
        setDownloading(false);
      }
    }}
  >
    <Download size={14} className="mr-1"/> Télécharger Word
  </Button>
  {detailRow && STATUS_MAP[detailRow.status]?.state ==="open"&& Number(detailRow.total) > 0 && (
 <Button variant="default"onClick={() => detailRow && pay(detailRow)}>
 <CreditCard size={14} className="mr-1"/> Payer en ligne
 </Button>
 )}
 {detailRow?.sharepoint_url && (
 <Button variant="outline"asChild>
 <a href={detailRow.sharepoint_url} target="_blank"rel="noreferrer">
 <ExternalLink size={14} className="mr-1"/> Ouvrir dans SharePoint
 </a>
 </Button>
 )}
 </div>

 <div className="border rounded-md overflow-auto bg-muted/30 p-2">
 <div style={{ transform:"scale(0.75)", transformOrigin:"top left", width:"794px"}}>
 <InvoicePDFTemplate ref={pdfRef} data={detail} />
 </div>
 </div>
 </div>
 )}
 </DialogContent>
 </Dialog>

 {/* Checkout dialog */}
 <Dialog open={isOpen} onOpenChange={(o) => { if (!o) closeCheckout(); }}>
 <DialogContent className="max-w-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col gap-0">
 <DialogHeader className="sticky top-0 z-10 bg-primary text-primary-foreground px-6 py-5 shadow-md [&>button]:text-primary-foreground [&>button]:opacity-100 [&>button:hover]:opacity-80">
 <DialogTitle className="text-primary-foreground text-lg font-semibold tracking-tight flex items-center gap-2">
 <CreditCard size={20} /> Paiement de la facture
 </DialogTitle>
 </DialogHeader>
 <div className="p-4 overflow-y-auto flex-1">{checkoutElement}</div>
 </DialogContent>
 </Dialog>
 </div>
 );
}

