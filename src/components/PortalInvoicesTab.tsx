import { useEffect, useState, useCallback } from "react";
import type { User as SupaUser } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { FileText, RefreshCw, CreditCard, ExternalLink, Loader2, CheckCircle2 } from "lucide-react";

interface InvoiceRow {
  id: string;
  invoice_number: string | null;
  invoice_date: string;
  due_date: string | null;
  currency: string;
  total: number;
  status: string;
  sharepoint_url: string | null;
  notes: string | null;
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  brouillon: { label: "Brouillon", cls: "bg-muted text-muted-foreground" },
  emise: { label: "Émise", cls: "bg-blue-600 text-white" },
  payee: { label: "Payée", cls: "bg-emerald-600 text-white" },
  en_retard: { label: "En retard", cls: "bg-destructive text-destructive-foreground" },
  annulee: { label: "Annulée", cls: "bg-muted text-muted-foreground" },
};

export default function PortalInvoicesTab({ user }: { user: SupaUser }) {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { openCheckout, closeCheckout, isOpen, checkoutElement } = useStripeCheckout();

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("service_invoices")
      .select("id, invoice_number, invoice_date, due_date, currency, total, status, sharepoint_url, notes")
      .order("invoice_date", { ascending: false });
    setInvoices((data ?? []) as InvoiceRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pay = (inv: InvoiceRow) => {
    openCheckout({
      invoiceId: inv.id,
      returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="text-primary" /> Mes factures
          </h1>
          <p className="text-sm text-muted-foreground">
            Consultez et réglez en ligne les factures qui vous ont été attribuées.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw size={14} className="mr-1" /> Actualiser
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      ) : invoices.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            <FileText size={36} className="mx-auto mb-2 opacity-40" />
            Aucune facture pour le moment.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {invoices.map((inv) => {
            const st = STATUS_LABEL[inv.status] ?? { label: inv.status, cls: "bg-muted" };
            const isPaid = inv.status === "payee";
            const canPay = !isPaid && inv.status !== "annulee" && Number(inv.total) > 0;
            return (
              <Card key={inv.id}>
                <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3 justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{inv.invoice_number ?? "(sans numéro)"}</span>
                      <Badge className={st.cls}>{st.label}</Badge>
                      {isPaid && <CheckCircle2 size={14} className="text-emerald-600" />}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Émise le {new Date(inv.invoice_date).toLocaleDateString("fr-FR")}
                      {inv.due_date && <> · Échéance {new Date(inv.due_date).toLocaleDateString("fr-FR")}</>}
                    </div>
                    <div className="text-lg font-bold text-primary mt-1">
                      {new Intl.NumberFormat("fr-FR").format(Number(inv.total))} {inv.currency}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {inv.sharepoint_url && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={inv.sharepoint_url} target="_blank" rel="noreferrer">
                          <ExternalLink size={14} className="mr-1" /> Document
                        </a>
                      </Button>
                    )}
                    {canPay && (
                      <Button size="sm" onClick={() => pay(inv)}>
                        <CreditCard size={14} className="mr-1" /> Payer en ligne
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={(o) => { if (!o) closeCheckout(); }}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>Paiement de la facture</DialogTitle>
          </DialogHeader>
          <div className="p-4">{checkoutElement}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
