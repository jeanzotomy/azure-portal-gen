import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search, Building2, RefreshCw, User, FileText, MapPin, Phone, Mail, StickyNote, Hash } from "lucide-react";
import { Label } from "@/components/ui/label";

interface ServiceClient {
  id: string;
  client_name: string;
  contact_person: string | null;
  nif: string | null;
  rccm: string | null;
  address_line: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
}

const empty: Partial<ServiceClient> = {
  client_name: "",
  contact_person: "",
  nif: "",
  rccm: "",
  address_line: "",
  city: "",
  country: "Guinée",
  phone: "",
  email: "",
  notes: "",
};

export default function ServiceClientsTab() {
  const { user } = useAuthSession();
  const { toast } = useToast();
  const [clients, setClients] = useState<ServiceClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceClient | null>(null);
  const [form, setForm] = useState<Partial<ServiceClient>>(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("service_clients")
      .select("*")
      .order("client_name", { ascending: true });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setClients(data ?? []);
    }
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

  const openEdit = (c: ServiceClient) => {
    setEditing(c);
    setForm(c);
    setDialogOpen(true);
  };

  const save = async () => {
    if (!user) return;
    if (!form.client_name?.trim()) {
      toast({ title: "Nom requis", description: "Le nom du client est obligatoire.", variant: "destructive" });
      return;
    }
    setSaving(true);
    if (editing) {
      const { error } = await supabase
        .from("service_clients")
        .update({
          client_name: form.client_name,
          contact_person: form.contact_person || null,
          nif: form.nif || null,
          rccm: form.rccm || null,
          address_line: form.address_line || null,
          city: form.city || null,
          country: form.country || null,
          phone: form.phone || null,
          email: form.email || null,
          notes: form.notes || null,
        })
        .eq("id", editing.id);
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Client modifié" });
        setDialogOpen(false);
        void load();
      }
    } else {
      const { error } = await supabase.from("service_clients").insert({
        client_name: form.client_name!,
        contact_person: form.contact_person || null,
        nif: form.nif || null,
        rccm: form.rccm || null,
        address_line: form.address_line || null,
        city: form.city || null,
        country: form.country || null,
        phone: form.phone || null,
        email: form.email || null,
        notes: form.notes || null,
        created_by: user.id,
      });
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Client ajouté" });
        setDialogOpen(false);
        void load();
      }
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce client ? Les factures associées seront conservées si elles existent.")) return;
    const { error } = await supabase.from("service_clients").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Client supprimé" });
      void load();
    }
  };

  const filtered = clients.filter((c) =>
    c.client_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (c.nif ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Clients facturables</h1>
          <p className="text-sm text-muted-foreground">Gérez les clients pour lesquels vous générez des factures de service.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw size={14} className="mr-1" /> Actualiser
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus size={14} className="mr-1" /> Nouveau client
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Rechercher par nom, email, NIF..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Building2 size={36} className="mx-auto mb-2 opacity-40" />
            Aucun client trouvé. Cliquez sur "Nouveau client" pour commencer.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{c.client_name}</div>
                    {c.contact_person && <div className="text-xs text-muted-foreground">{c.contact_person}</div>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil size={14} /></Button>
                    <Button size="icon" variant="ghost" onClick={() => void remove(c.id)}><Trash2 size={14} className="text-destructive" /></Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {c.email && <div>📧 {c.email}</div>}
                  {c.phone && <div>📞 {c.phone}</div>}
                  {c.nif && <div>NIF : {c.nif}</div>}
                  {c.city && <div>📍 {c.city}{c.country ? `, ${c.country}` : ""}</div>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0 gap-0">
          <DialogHeader className="bg-gradient-to-r from-primary to-[#007aa3] text-white px-6 py-4 rounded-t-lg">
            <DialogTitle className="text-white flex items-center gap-2 text-lg">
              <Building2 size={20} />
              {editing ? "Modifier le client" : "Nouveau client facturable"}
            </DialogTitle>
            <p className="text-xs text-white/80 mt-1">
              {editing ? "Mettez à jour les informations du client." : "Renseignez les informations pour facturer ce client."}
            </p>
          </DialogHeader>

          <div className="p-6 space-y-6">
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary border-b pb-1">
                <User size={16} /> Identité
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs font-medium flex items-center gap-1">
                    <Building2 size={12} /> Nom du client / société <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="Ex : ACME Guinée SARL"
                    value={form.client_name ?? ""}
                    onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs font-medium flex items-center gap-1">
                    <User size={12} /> Personne de contact
                  </Label>
                  <Input
                    placeholder="Nom du référent"
                    value={form.contact_person ?? ""}
                    onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary border-b pb-1">
                <FileText size={16} /> Informations légales
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium flex items-center gap-1">
                    <Hash size={12} /> NIF
                  </Label>
                  <Input
                    placeholder="Numéro d'identification fiscale"
                    value={form.nif ?? ""}
                    onChange={(e) => setForm({ ...form, nif: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium flex items-center gap-1">
                    <Hash size={12} /> N°RCCM
                  </Label>
                  <Input
                    placeholder="Registre du commerce"
                    value={form.rccm ?? ""}
                    onChange={(e) => setForm({ ...form, rccm: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary border-b pb-1">
                <MapPin size={16} /> Adresse
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs font-medium">Adresse complète</Label>
                  <Input
                    placeholder="Rue, quartier, immeuble..."
                    value={form.address_line ?? ""}
                    onChange={(e) => setForm({ ...form, address_line: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">Ville</Label>
                  <Input
                    placeholder="Conakry"
                    value={form.city ?? ""}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">Pays</Label>
                  <Input
                    value={form.country ?? ""}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary border-b pb-1">
                <Phone size={16} /> Coordonnées
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium flex items-center gap-1">
                    <Phone size={12} /> Téléphone
                  </Label>
                  <Input
                    placeholder="+224 6XX XX XX XX"
                    value={form.phone ?? ""}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium flex items-center gap-1">
                    <Mail size={12} /> Email
                  </Label>
                  <Input
                    type="email"
                    placeholder="contact@societe.com"
                    value={form.email ?? ""}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary border-b pb-1">
                <StickyNote size={16} /> Notes internes
              </div>
              <Textarea
                rows={3}
                placeholder="Conditions particulières, remarques, historique..."
                value={form.notes ?? ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </section>
          </div>

          <DialogFooter className="border-t bg-muted/30 px-6 py-3 rounded-b-lg">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={() => void save()} disabled={saving} className="bg-primary hover:bg-primary/90">
              {saving ? "Enregistrement..." : editing ? "Mettre à jour" : "Enregistrer le client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
