import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, ExternalLink, RefreshCw, Receipt, Trash2, FileText } from "lucide-react";
import ServiceInvoiceForm from "@/components/ServiceInvoiceForm";

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
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);

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
    const patch: Record<string, unknown> = { status };
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

  const totals = filtered.reduce((acc, r) => {
    if (r.status !== "annulee") acc[r.currency] = (acc[r.currency] ?? 0) + Number(r.total);
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Receipt size={22} /> Facturation services</h1>
          <p className="text-sm text-muted-foreground">Générez des factures professionnelles (PDF + Word) stockées dans SharePoint.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw size={14} className="mr-1" /> Actualiser</Button>
          <Button size="sm" onClick={() => setFormOpen(true)}><Plus size={14} className="mr-1" /> Nouvelle facture</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total factures</div><div className="text-xl font-bold">{filtered.length}</div></CardContent></Card>
        {Object.entries(totals).map(([cur, val]) => (
          <Card key={cur}><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total {cur}</div><div className="text-xl font-bold">{new Intl.NumberFormat("fr-FR").format(val)}</div></CardContent></Card>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
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
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          <Receipt size={36} className="mx-auto mb-2 opacity-40" />
          Aucune facture. Cliquez sur "Nouvelle facture" pour créer la première.
        </CardContent></Card>
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
                    {r.sharepoint_url && (
                      <Button size="icon" variant="ghost" asChild>
                        <a href={r.sharepoint_url} target="_blank" rel="noreferrer" title="Ouvrir dans SharePoint"><ExternalLink size={14} /></a>
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => void remove(r.id)}><Trash2 size={14} className="text-destructive" /></Button>
                  </div>
                </div>
              </CardContent></Card>
            );
          })}
        </div>
      )}

      <ServiceInvoiceForm open={formOpen} onOpenChange={setFormOpen} onSaved={() => void load()} />
    </div>
  );
}
