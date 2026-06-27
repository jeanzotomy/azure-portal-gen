import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, ExternalLink, RefreshCw, Receipt, Trash2, Pencil, CreditCard, CheckCircle2, Clock, FileEdit } from "lucide-react";
import ServiceInvoiceForm from "@/components/ServiceInvoiceForm";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useExchangeRates, type Currency } from "@/hooks/use-exchange-rates";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ViewModeToggle, useViewMode } from "@/components/ui/view-mode-toggle";

interface InvoiceRow {
  id: string;
  invoice_number: string | null;
  client_id: string;
  invoice_date: string;
  due_date: string | null;
  currency: "GNF" | "USD" | "EUR";
  total: number;
  status: "brouillon" | "emise" | "payee" | "en_retard" | "annulee";
  sharepoint_url: string | null;
  service_clients?: { client_name: string } | null;
}

const STATUS_LABELS: Record<InvoiceRow["status"], { label: string; cls: string }> = {
  brouillon: { label: "Brouillon", cls: "bg-muted text-muted-foreground" },
  emise: { label: "Émise", cls: "bg-blue-500/10 text-blue-600" },
  payee: { label: "Payée", cls: "bg-green-500/10 text-green-600" },
  en_retard: { label: "En retard", cls: "bg-destructive/10 text-destructive" },
  annulee: { label: "Annulée", cls: "bg-orange-500/10 text-orange-600" },
};

export default function ServiceInvoicesTab() {
  const { toast } = useToast();
  const { user } = useAuthSession();
  const { openCheckout, closeCheckout, isOpen, checkoutElement } = useStripeCheckout();
  const { convert, rates, loading: ratesLoading, refresh: refreshRates } = useExchangeRates();
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [displayCurrency, setDisplayCurrency] = useState<Currency>("GNF");
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [view, setView] = useViewMode("service-invoices", "table");

  const payInvoice = (id: string) => {
    openCheckout({
      invoiceId: id,
      customerEmail: user?.email,
      userId: user?.id,
      returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
    });
  };

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("service_invoices")
      .select("id, invoice_number, client_id, invoice_date, due_date, currency, total, status, sharepoint_url, service_clients(client_name)")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else setRows((data ?? []) as unknown as InvoiceRow[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const updateStatus = async (id: string, status: InvoiceRow["status"]) => {
    const patch: import("@/integrations/supabase/types").TablesUpdate<"service_invoices"> = { status };
    if (status === "payee") patch.paid_at = new Date().toISOString();
    const { error } = await supabase.from("service_invoices").update(patch).eq("id", id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else void load();
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cette facture ?")) return;
    const { error } = await supabase.from("service_invoices").delete().eq("id", id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "Facture supprimée" }); void load(); }
  };

  const filtered = rows.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    const q = search.toLowerCase();
    if (!q) return true;
    return (r.invoice_number ?? "").toLowerCase().includes(q) || (r.service_clients?.client_name ?? "").toLowerCase().includes(q);
  });

  // Conversion vers la devise d'affichage choisie
  const convertedTotal = filtered.reduce((sum, r) => {
    if (r.status === "annulee") return sum;
    return sum + convert(Number(r.total), r.currency, displayCurrency);
  }, 0);
  const paidTotal = filtered.reduce((sum, r) => {
    if (r.status !== "payee") return sum;
    return sum + convert(Number(r.total), r.currency, displayCurrency);
  }, 0);
  const pendingTotal = filtered.reduce((sum, r) => {
    if (r.status !== "emise" && r.status !== "en_retard") return sum;
    return sum + convert(Number(r.total), r.currency, displayCurrency);
  }, 0);

  const countBy = (st: InvoiceRow["status"]) => filtered.filter((r) => r.status === st).length;
  const fmt = (val: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(val));

  const STAT_CARDS = [
    { label: "Total factures", value: filtered.length.toString(), sub: `${countBy("brouillon")} brouillon · ${countBy("annulee")} annulée(s)`, icon: Receipt, tone: "text-foreground" },
    { label: `Payées (${displayCurrency})`, value: fmt(paidTotal), sub: `${countBy("payee")} facture(s)`, icon: CheckCircle2, tone: "text-emerald-600" },
    { label: `En attente (${displayCurrency})`, value: fmt(pendingTotal), sub: `${countBy("emise")} émise · ${countBy("en_retard")} en retard`, icon: Clock, tone: "text-blue-600" },
    { label: `Total facturé (${displayCurrency})`, value: fmt(convertedTotal), sub: "Hors annulées", icon: FileEdit, tone: "text-primary" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Receipt size={22} /> Facturation services</h1>
          <p className="text-sm text-muted-foreground">Générez des factures professionnelles (PDF + Word) stockées dans SharePoint.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw size={14} className="mr-1" /> Actualiser</Button>
          <Button size="sm" onClick={() => { setEditId(null); setFormOpen(true); }}><Plus size={14} className="mr-1" /> Nouvelle facture</Button>
        </div>
      </div>

      {/* Sélecteur de devise d'affichage */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Afficher en :</span>
        <div className="inline-flex rounded-md border border-border overflow-hidden">
          {(["GNF", "USD", "EUR"] as Currency[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setDisplayCurrency(c)}
              className={`px-3 py-1 text-xs font-semibold transition-colors ${
                displayCurrency === c
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        {rates && rates.timestamp > 0 && (
          <span className="text-[10px] text-muted-foreground">
            Taux : 1 USD ≈ {fmt(rates.rates.GNF ?? 0)} GNF · {(rates.rates.EUR ?? 0).toFixed(2)} EUR
          </span>
        )}
        <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => void refreshRates(true)} disabled={ratesLoading}>
          <RefreshCw size={10} className={`mr-1 ${ratesLoading ? "animate-spin" : ""}`} /> Taux
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STAT_CARDS.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                  <Icon size={14} className={s.tone} />
                </div>
                <div className={`text-xl font-bold ${s.tone}`}>{s.value}</div>
                <div className="text-[10px] text-muted-foreground mt-1">{s.sub}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Rechercher par N° ou client..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="brouillon">Brouillon</SelectItem>
            <SelectItem value="emise">Émise</SelectItem>
            <SelectItem value="payee">Payée</SelectItem>
            <SelectItem value="en_retard">En retard</SelectItem>
            <SelectItem value="annulee">Annulée</SelectItem>
          </SelectContent>
        </Select>
        <ViewModeToggle value={view} onChange={setView} />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          <Receipt size={36} className="mx-auto mb-2 opacity-40" />
          Aucune facture. Cliquez sur "Nouvelle facture" pour créer la première.
        </CardContent></Card>
      ) : view === "table" ? (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead className="hidden lg:table-cell">Échéance</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const s = STATUS_LABELS[r.status];
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-bold text-primary whitespace-nowrap">{r.invoice_number}</TableCell>
                      <TableCell className="font-medium">{r.service_clients?.client_name ?? "Client supprimé"}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground whitespace-nowrap">{new Date(r.invoice_date).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground whitespace-nowrap">{r.due_date ? new Date(r.due_date).toLocaleDateString("fr-FR") : "—"}</TableCell>
                      <TableCell className="text-right font-mono font-semibold whitespace-nowrap">{new Intl.NumberFormat("fr-FR").format(Number(r.total))} {r.currency}</TableCell>
                      <TableCell>
                        <Select value={r.status} onValueChange={(v) => void updateStatus(r.id, v as InvoiceRow["status"])}>
                          <SelectTrigger className={`w-[120px] h-7 text-xs ${s.cls} border-0`}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="brouillon">Brouillon</SelectItem>
                            <SelectItem value="emise">Émise</SelectItem>
                            <SelectItem value="payee">Payée</SelectItem>
                            <SelectItem value="en_retard">En retard</SelectItem>
                            <SelectItem value="annulee">Annulée</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex">
                          {(r.status === "emise" || r.status === "en_retard") && (
                            <Button size="icon" variant="ghost" onClick={() => payInvoice(r.id)} title="Payer en ligne">
                              <CreditCard size={14} className="text-primary" />
                            </Button>
                          )}
                          {r.sharepoint_url && (
                            <Button size="icon" variant="ghost" asChild>
                              <a href={r.sharepoint_url} target="_blank" rel="noreferrer" title="SharePoint"><ExternalLink size={14} /></a>
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" onClick={() => { setEditId(r.id); setFormOpen(true); }} title="Modifier">
                            <Pencil size={14} className="text-primary" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => void remove(r.id)} title="Supprimer"><Trash2 size={14} className="text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const s = STATUS_LABELS[r.status];
            return (
              <Card key={r.id}><CardContent className="p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-primary">{r.invoice_number}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                    </div>
                    <div className="text-sm font-medium mt-0.5">{r.service_clients?.client_name ?? "Client supprimé"}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(r.invoice_date).toLocaleDateString("fr-FR")}
                      {r.due_date && ` · Échéance ${new Date(r.due_date).toLocaleDateString("fr-FR")}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{new Intl.NumberFormat("fr-FR").format(Number(r.total))} {r.currency}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Select value={r.status} onValueChange={(v) => void updateStatus(r.id, v as InvoiceRow["status"])}>
                      <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="brouillon">Brouillon</SelectItem>
                        <SelectItem value="emise">Émise</SelectItem>
                        <SelectItem value="payee">Payée</SelectItem>
                        <SelectItem value="en_retard">En retard</SelectItem>
                        <SelectItem value="annulee">Annulée</SelectItem>
                      </SelectContent>
                    </Select>
                    {(r.status === "emise" || r.status === "en_retard") && (
                      <Button size="icon" variant="ghost" onClick={() => payInvoice(r.id)} title="Payer en ligne (Stripe)">
                        <CreditCard size={14} className="text-primary" />
                      </Button>
                    )}
                    {r.sharepoint_url && (
                      <Button size="icon" variant="ghost" asChild>
                        <a href={r.sharepoint_url} target="_blank" rel="noreferrer" title="Ouvrir dans SharePoint"><ExternalLink size={14} /></a>
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => { setEditId(r.id); setFormOpen(true); }} title="Modifier la facture">
                      <Pencil size={14} className="text-primary" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => void remove(r.id)} title="Supprimer"><Trash2 size={14} className="text-destructive" /></Button>
                  </div>
                </div>
              </CardContent></Card>
            );
          })}
        </div>
      )}

      <ServiceInvoiceForm open={formOpen} onOpenChange={(v) => { setFormOpen(v); if (!v) setEditId(null); }} editId={editId} onSaved={() => void load()} />

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
