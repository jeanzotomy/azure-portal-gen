import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, CreditCard, RefreshCw, Building2, Smartphone, Banknote, FileText } from "lucide-react";

type PaymentType = "virement" | "mobile_money" | "especes" | "cheque" | "autre";
type Currency = "GNF" | "USD" | "EUR";

interface PMRow {
  id: string;
  label: string;
  type: PaymentType;
  currency: Currency;
  bank: string | null;
  iban: string | null;
  swift: string | null;
  account_holder: string | null;
  mobile_number: string | null;
  instructions: string | null;
  active: boolean;
  position: number;
}

const TYPE_META: Record<PaymentType, { label: string; icon: typeof CreditCard }> = {
  virement: { label: "Virement bancaire", icon: Building2 },
  mobile_money: { label: "Mobile Money", icon: Smartphone },
  especes: { label: "Espèces", icon: Banknote },
  cheque: { label: "Chèque", icon: FileText },
  autre: { label: "Autre", icon: CreditCard },
};

const empty = (): Partial<PMRow> => ({
  label: "",
  type: "virement",
  currency: "GNF",
  bank: "",
  iban: "",
  swift: "",
  account_holder: "",
  mobile_number: "",
  instructions: "",
  active: true,
  position: 0,
});

export default function PaymentMethodsTab() {
  const { user } = useAuthSession();
  const { toast } = useToast();
  const [rows, setRows] = useState<PMRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<PMRow> | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("payment_methods").select("*").order("position").order("label");
    setRows((data ?? []) as PMRow[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const save = async () => {
    if (!user || !editing?.label?.trim()) {
      toast({ title: "Libellé requis", variant: "destructive" });
      return;
    }
    const payload = {
      label: editing.label!.trim(),
      type: (editing.type ?? "virement") as PaymentType,
      currency: (editing.currency ?? "GNF") as Currency,
      bank: editing.bank || null,
      iban: editing.iban || null,
      swift: editing.swift || null,
      account_holder: editing.account_holder || null,
      mobile_number: editing.mobile_number || null,
      instructions: editing.instructions || null,
      active: editing.active ?? true,
      position: Number(editing.position ?? 0),
    };
    if (editing.id) {
      const { error } = await supabase.from("payment_methods").update(payload).eq("id", editing.id);
      if (error) return toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      const { error } = await supabase.from("payment_methods").insert({ ...payload, created_by: user.id });
      if (error) return toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
    toast({ title: editing.id ? "Mode modifié" : "Mode ajouté" });
    setOpen(false);
    setEditing(null);
    void load();
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce mode de paiement ?")) return;
    const { error } = await supabase.from("payment_methods").delete().eq("id", id);
    if (error) return toast({ title: "Erreur", description: error.message, variant: "destructive" });
    toast({ title: "Supprimé" });
    void load();
  };

  const toggleActive = async (row: PMRow) => {
    await supabase.from("payment_methods").update({ active: !row.active }).eq("id", row.id);
    void load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><CreditCard size={20} /> Modes de paiement</h2>
          <p className="text-sm text-muted-foreground">Catalogue centralisé — apparaîtra dans le formulaire de facture.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </Button>
          <Button size="sm" onClick={() => { setEditing(empty()); setOpen(true); }}>
            <Plus size={14} className="mr-1" /> Ajouter
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {rows.map((r) => {
          const Icon = TYPE_META[r.type].icon;
          return (
            <Card key={r.id} className={r.active ? "" : "opacity-60"}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon size={18} className="text-primary shrink-0" />
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{r.label}</div>
                      <div className="text-xs text-muted-foreground">{TYPE_META[r.type].label} · {r.currency}</div>
                    </div>
                  </div>
                  <Badge variant={r.active ? "default" : "secondary"}>{r.active ? "Actif" : "Inactif"}</Badge>
                </div>
                <div className="text-xs space-y-0.5 text-muted-foreground">
                  {r.bank && <div>Banque : {r.bank}</div>}
                  {r.iban && <div>IBAN : {r.iban}</div>}
                  {r.mobile_number && <div>Mobile : {r.mobile_number}</div>}
                  {r.account_holder && <div>Titulaire : {r.account_holder}</div>}
                </div>
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}>
                    <Pencil size={14} />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleActive(r)}>
                    <Switch checked={r.active} />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void remove(r.id)} className="text-destructive ml-auto">
                    <Trash2 size={14} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {!rows.length && !loading && (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="p-8 text-center text-muted-foreground text-sm">
              Aucun mode de paiement. Cliquez sur « Ajouter » pour en créer un.
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="bg-gradient-to-r from-primary to-[#007aa3] text-primary-foreground -m-6 mb-4 p-6 rounded-t-lg">
            <DialogTitle className="text-primary-foreground flex items-center gap-2">
              <CreditCard size={20} /> {editing?.id ? "Modifier" : "Nouveau"} mode de paiement
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Libellé *</Label>
              <Input value={editing?.label ?? ""} onChange={(e) => setEditing({ ...editing, label: e.target.value })} placeholder="Ex: Virement Ecobank GNF" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={editing?.type ?? "virement"} onValueChange={(v) => setEditing({ ...editing, type: v as PaymentType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Devise</Label>
              <Select value={editing?.currency ?? "GNF"} onValueChange={(v) => setEditing({ ...editing, currency: v as Currency })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GNF">GNF</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Banque</Label>
              <Input value={editing?.bank ?? ""} onChange={(e) => setEditing({ ...editing, bank: e.target.value })} />
            </div>
            <div>
              <Label>Titulaire du compte</Label>
              <Input value={editing?.account_holder ?? ""} onChange={(e) => setEditing({ ...editing, account_holder: e.target.value })} />
            </div>
            <div>
              <Label>IBAN / N° de compte</Label>
              <Input value={editing?.iban ?? ""} onChange={(e) => setEditing({ ...editing, iban: e.target.value })} />
            </div>
            <div>
              <Label>SWIFT / BIC</Label>
              <Input value={editing?.swift ?? ""} onChange={(e) => setEditing({ ...editing, swift: e.target.value })} />
            </div>
            <div>
              <Label>Numéro Mobile Money</Label>
              <Input value={editing?.mobile_number ?? ""} onChange={(e) => setEditing({ ...editing, mobile_number: e.target.value })} />
            </div>
            <div>
              <Label>Ordre d'affichage</Label>
              <Input type="number" value={editing?.position ?? 0} onChange={(e) => setEditing({ ...editing, position: Number(e.target.value) })} />
            </div>
            <div className="col-span-2">
              <Label>Instructions / Référence</Label>
              <Textarea rows={2} value={editing?.instructions ?? ""} onChange={(e) => setEditing({ ...editing, instructions: e.target.value })} placeholder="Ex: Mentionner le numéro de facture en référence" />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Switch checked={editing?.active ?? true} onCheckedChange={(v) => setEditing({ ...editing, active: v })} />
              <Label className="cursor-pointer">Mode actif (proposé dans les factures)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={() => void save()}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
