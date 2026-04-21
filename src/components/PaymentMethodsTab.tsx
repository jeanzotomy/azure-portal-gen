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
import { Plus, Pencil, Trash2, CreditCard, RefreshCw, Building2, Smartphone, Banknote, FileText, PiggyBank } from "lucide-react";

type PaymentType = "virement" | "mobile_money" | "especes" | "cheque" | "depot" | "autre";
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
  depot: { label: "Dépôt en espèces", icon: PiggyBank },
  especes: { label: "Espèces", icon: Banknote },
  cheque: { label: "Chèque", icon: FileText },
  autre: { label: "Autre", icon: CreditCard },
};

// Définit quels champs afficher selon le type
const FIELDS_BY_TYPE: Record<PaymentType, {
  bank?: boolean;
  account_holder?: boolean;
  iban?: boolean;
  swift?: boolean;
  mobile_number?: boolean;
  mobileLabel?: string;
  ibanLabel?: string;
  bankLabel?: string;
}> = {
  virement: { bank: true, account_holder: true, iban: true, swift: true, ibanLabel: "IBAN / N° de compte" },
  mobile_money: { mobile_number: true, account_holder: true, bank: true, bankLabel: "Opérateur (Orange, MTN…)", mobileLabel: "Numéro Mobile Money" },
  depot: { bank: true, account_holder: true, iban: true, bankLabel: "Banque destinataire", ibanLabel: "N° de compte à créditer" },
  especes: { account_holder: true },
  cheque: { account_holder: true, bank: true, bankLabel: "Banque émettrice (à l'ordre de)" },
  autre: { bank: true, account_holder: true, iban: true, mobile_number: true },
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
    const type = (editing.type ?? "virement") as PaymentType;
    const fields = FIELDS_BY_TYPE[type];
    // Nettoyer les champs non pertinents pour ce type
    const payload = {
      label: editing.label!.trim(),
      type,
      currency: (editing.currency ?? "GNF") as Currency,
      bank: fields.bank ? (editing.bank || null) : null,
      iban: fields.iban ? (editing.iban || null) : null,
      swift: fields.swift ? (editing.swift || null) : null,
      account_holder: fields.account_holder ? (editing.account_holder || null) : null,
      mobile_number: fields.mobile_number ? (editing.mobile_number || null) : null,
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

  const currentType = (editing?.type ?? "virement") as PaymentType;
  const currentFields = FIELDS_BY_TYPE[currentType];

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
                <div className="text-xs space-y-0.5 text-muted-foreground break-words">
                  {r.bank && <div>Banque : {r.bank}</div>}
                  {r.iban && <div className="break-all">IBAN : {r.iban}</div>}
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
          <Card className="sm:col-span-2 lg:col-span-3">
            <CardContent className="p-8 text-center text-muted-foreground text-sm">
              Aucun mode de paiement. Cliquez sur « Ajouter » pour en créer un.
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:w-auto max-w-2xl max-h-[92vh] overflow-y-auto p-0 gap-0 [&>button]:text-white [&>button]:opacity-90 [&>button]:hover:opacity-100 [&>button]:top-4 [&>button]:right-4">
          <DialogHeader className="bg-gradient-to-r from-primary to-[#007aa3] text-primary-foreground px-4 sm:px-6 py-4 rounded-t-lg pr-14">
            <DialogTitle className="text-primary-foreground flex items-center gap-2 text-base sm:text-lg">
              <CreditCard size={20} className="shrink-0" />
              <span className="truncate">{editing?.id ? "Modifier" : "Nouveau"} mode de paiement</span>
            </DialogTitle>
          </DialogHeader>

          <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Libellé *</Label>
              <Input value={editing?.label ?? ""} onChange={(e) => setEditing({ ...editing, label: e.target.value })} placeholder="Ex: Virement Ecobank GNF" />
            </div>

            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={currentType} onValueChange={(v) => setEditing({ ...editing, type: v as PaymentType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
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

            {currentFields.bank && (
              <div className="space-y-1.5">
                <Label>{currentFields.bankLabel ?? "Banque"}</Label>
                <Input value={editing?.bank ?? ""} onChange={(e) => setEditing({ ...editing, bank: e.target.value })} />
              </div>
            )}

            {currentFields.account_holder && (
              <div className="space-y-1.5">
                <Label>Titulaire / Bénéficiaire</Label>
                <Input value={editing?.account_holder ?? ""} onChange={(e) => setEditing({ ...editing, account_holder: e.target.value })} />
              </div>
            )}

            {currentFields.iban && (
              <div className="space-y-1.5">
                <Label>{currentFields.ibanLabel ?? "IBAN / N° de compte"}</Label>
                <Input value={editing?.iban ?? ""} onChange={(e) => setEditing({ ...editing, iban: e.target.value })} />
              </div>
            )}

            {currentFields.swift && (
              <div className="space-y-1.5">
                <Label>SWIFT / BIC</Label>
                <Input value={editing?.swift ?? ""} onChange={(e) => setEditing({ ...editing, swift: e.target.value })} />
              </div>
            )}

            {currentFields.mobile_number && (
              <div className="space-y-1.5">
                <Label>{currentFields.mobileLabel ?? "Numéro de téléphone"}</Label>
                <Input value={editing?.mobile_number ?? ""} onChange={(e) => setEditing({ ...editing, mobile_number: e.target.value })} placeholder="+224 ..." />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Ordre d'affichage</Label>
              <Input type="number" value={editing?.position ?? 0} onChange={(e) => setEditing({ ...editing, position: Number(e.target.value) })} />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label>Instructions / Référence</Label>
              <Textarea
                rows={2}
                value={editing?.instructions ?? ""}
                onChange={(e) => setEditing({ ...editing, instructions: e.target.value })}
                placeholder={
                  currentType === "especes" ? "Ex: Paiement à remettre au caissier au siège social" :
                  currentType === "depot" ? "Ex: Mentionner le n° de facture sur le bordereau de dépôt" :
                  currentType === "cheque" ? "Ex: Chèque à libeller au nom de…" :
                  "Ex: Mentionner le numéro de facture en référence"
                }
              />
            </div>

            <div className="sm:col-span-2 flex items-center gap-2 pt-1">
              <Switch checked={editing?.active ?? true} onCheckedChange={(v) => setEditing({ ...editing, active: v })} />
              <Label className="cursor-pointer">Mode actif (proposé dans les factures)</Label>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 px-4 sm:px-6 pb-4 sm:pb-6 border-t pt-4 bg-muted/30">
            <Button variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">Annuler</Button>
            <Button onClick={() => void save()} className="w-full sm:w-auto">Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
