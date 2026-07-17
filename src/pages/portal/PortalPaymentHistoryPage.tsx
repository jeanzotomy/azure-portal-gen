import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Receipt,
  RefreshCw,
  Loader2,
  CheckCircle2,
  ExternalLink,
  FileText,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface PaidInvoice {
  id: string;
  invoice_number: string | null;
  invoice_date: string;
  paid_at: string | null;
  currency: string;
  total: number;
  sharepoint_url: string | null;
}

const fmtMoney = (n: number, c: string) =>
  `${new Intl.NumberFormat("fr-FR").format(Math.round(Number(n) || 0))} ${c}`;
const fmtDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
    : "-";

export default function PortalPaymentHistoryPage() {
  const [rows, setRows] = useState<PaidInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [receiptLoading, setReceiptLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("service_invoices")
      .select("id, invoice_number, invoice_date, paid_at, currency, total, sharepoint_url, status")
      .eq("status", "payee")
      .order("paid_at", { ascending: false });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
    setRows((data ?? []) as PaidInvoice[]);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openReceipt = async (inv: PaidInvoice) => {
    setReceiptLoading(inv.id);
    try {
      const { data, error } = await supabase.functions.invoke("get-invoice-receipt", {
        body: { invoiceId: inv.id, environment: getStripeEnvironment() },
      });
      if (error) throw new Error(error.message);
      if (data?.receiptUrl) {
        window.open(data.receiptUrl, "_blank", "noopener,noreferrer");
      } else {
        toast({
          title: "Reçu indisponible",
          description:
            "Aucun reçu Stripe n'a été trouvé pour cette facture. Elle a peut-être été réglée hors ligne.",
        });
      }
    } catch (e) {
      toast({
        title: "Erreur",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setReceiptLoading(null);
    }
  };

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (r.invoice_number ?? "").toLowerCase().includes(q) ||
      String(r.total).includes(q)
    );
  });

  const totalPaid = filtered.reduce((acc, r) => {
    acc[r.currency] = (acc[r.currency] ?? 0) + Number(r.total || 0);
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="text-primary" /> Historique des paiements
          </h1>
          <p className="text-sm text-muted-foreground">
            Toutes vos factures réglées, avec leur date de paiement et le reçu officiel.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={`mr-1 ${loading ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground">Factures payées</div>
            <div className="text-2xl font-bold text-primary mt-1">{filtered.length}</div>
          </CardContent>
        </Card>
        {Object.entries(totalPaid).slice(0, 2).map(([cur, amount]) => (
          <Card key={cur}>
            <CardContent className="p-4">
              <div className="text-xs uppercase text-muted-foreground">Total réglé ({cur})</div>
              <div className="text-2xl font-bold text-emerald-600 mt-1">
                {fmtMoney(amount, cur)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <Input
          placeholder="Rechercher par numéro…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Receipt className="mx-auto mb-3 opacity-40" size={40} />
            <p>Aucune facture payée pour le moment.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <Card key={r.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{r.invoice_number ?? "(sans numéro)"}</span>
                    <Badge className="bg-emerald-600 text-white gap-1">
                      <CheckCircle2 size={12} /> Payée
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Émise le {fmtDate(r.invoice_date)} · Payée le {fmtDate(r.paid_at)}
                  </div>
                  <div className="text-lg font-bold text-primary mt-1">
                    {fmtMoney(Number(r.total), r.currency)}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {r.sharepoint_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(r.sharepoint_url!, "_blank", "noopener,noreferrer")}
                    >
                      <FileText size={14} className="mr-1" /> Facture
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => openReceipt(r)}
                    disabled={receiptLoading === r.id}
                  >
                    {receiptLoading === r.id ? (
                      <Loader2 size={14} className="mr-1 animate-spin" />
                    ) : (
                      <ExternalLink size={14} className="mr-1" />
                    )}
                    Reçu
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
