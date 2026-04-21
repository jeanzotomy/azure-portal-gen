import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Search, Package, RefreshCw } from "lucide-react";
import { FormDialogHeader, formDialogContentClass } from "@/components/FormDialogHeader";

interface CatalogService {
  id: string;
  name: string;
  description: string | null;
  default_unit_price: number;
  default_currency: "GNF" | "USD" | "EUR";
  default_unit: string;
  active: boolean;
  created_at: string;
}

const UNIT_OPTIONS = ["unité", "heure", "jour", "mois", "année", "forfait"] as const;

const empty: Partial<CatalogService> = {
  name: "",
  description: "",
  default_unit_price: 0,
  default_currency: "GNF",
  default_unit: "unité",
  active: true,
};

export default function ServiceCatalogTab() {
  const { user } = useAuthSession();
  const { toast } = useToast();
  const [items, setItems] = useState<CatalogService[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogService | null>(null);
  const [form, setForm] = useState<Partial<CatalogService>>(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("service_catalog").select("*").order("name");
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setDialogOpen(true);
  };

  const openEdit = (s: CatalogService) => {
    setEditing(s);
    setForm(s);
    setDialogOpen(true);
  };

  const save = async () => {
    if (!user) return;
    if (!form.name?.trim()) {
      toast({ title: "Nom requis", variant: "destructive" });
      return;
    }
    setSaving(true);
    if (editing) {
      const { error } = await supabase
        .from("service_catalog")
        .update({
          name: form.name,
          description: form.description || null,
          default_unit_price: form.default_unit_price ?? 0,
          default_currency: form.default_currency ?? "GNF",
          default_unit: form.default_unit ?? "unité",
          active: form.active ?? true,
        })
        .eq("id", editing.id);
      if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
      else {
        toast({ title: "Service modifié" });
        setDialogOpen(false);
        void load();
      }
    } else {
      const { error } = await supabase.from("service_catalog").insert({
        name: form.name!,
        description: form.description || null,
        default_unit_price: form.default_unit_price ?? 0,
        default_currency: form.default_currency ?? "GNF",
        default_unit: form.default_unit ?? "unité",
        active: form.active ?? true,
        created_by: user.id,
      });
      if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
      else {
        toast({ title: "Service ajouté" });
        setDialogOpen(false);
        void load();
      }
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce service du catalogue ?")) return;
    const { error } = await supabase.from("service_catalog").delete().eq("id", id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Service supprimé" });
      void load();
    }
  };

  const filtered = items.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Catalogue de services</h1>
          <p className="text-sm text-muted-foreground">Services réutilisables disponibles dans le formulaire de facture.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw size={14} className="mr-1" /> Actualiser</Button>
          <Button size="sm" onClick={openCreate}><Plus size={14} className="mr-1" /> Nouveau service</Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Package size={36} className="mx-auto mb-2 opacity-40" />
            Aucun service. Ajoutez-en un pour gagner du temps lors de la facturation.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((s) => (
            <Card key={s.id} className={!s.active ? "opacity-60" : ""}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{s.name}</div>
                    {s.description && <div className="text-xs text-muted-foreground italic">{s.description}</div>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(s)}><Pencil size={14} /></Button>
                    <Button size="icon" variant="ghost" onClick={() => void remove(s.id)}><Trash2 size={14} className="text-destructive" /></Button>
                  </div>
                </div>
                <div className="text-xs flex gap-2 items-center flex-wrap">
                  <span className="font-medium">{new Intl.NumberFormat("fr-FR").format(s.default_unit_price)} {s.default_currency}</span>
                  <span className="text-muted-foreground">/ {s.default_unit}</span>
                  {!s.active && <span className="text-muted-foreground">· Inactif</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={`max-w-lg ${formDialogContentClass}`}>
          <FormDialogHeader
            icon={Package}
            title={editing ? "Modifier le service" : "Nouveau service"}
            subtitle="Renseignez les informations du service du catalogue."
            badges={[]}
          />
          <div className="space-y-3 p-4 sm:p-6">
            <div>
              <label className="text-xs font-medium">Nom *</label>
              <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium">Description (sous-titre italique)</label>
              <Textarea rows={2} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium">Prix unitaire par défaut</label>
                <Input type="number" min={0} value={form.default_unit_price ?? 0} onChange={(e) => setForm({ ...form, default_unit_price: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-xs font-medium">Devise</label>
                <Select value={form.default_currency ?? "GNF"} onValueChange={(v) => setForm({ ...form, default_currency: v as "GNF" | "USD" | "EUR" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GNF">GNF</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium">Unité par défaut</label>
                <Select value={form.default_unit ?? "unité"} onValueChange={(v) => setForm({ ...form, default_unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active ?? true} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              <label className="text-xs">Service actif (visible dans le formulaire de facture)</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={() => void save()} disabled={saving}>{saving ? "Enregistrement..." : "Enregistrer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
