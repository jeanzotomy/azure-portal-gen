import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Trash2, Pencil, Plus, Upload, ExternalLink, ArrowUp, ArrowDown, Loader2 } from "lucide-react";

type Partner = {
  id: string;
  name: string;
  logo_url: string;
  website_url: string | null;
  display_order: number;
  published: boolean;
};

const BUCKET = "partner-logos";
const SIGN_TTL = 60 * 60 * 24 * 365 * 10; // 10 years

export default function PartnersManager() {
  const { toast } = useToast();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [rows, setRows] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [form, setForm] = useState<{ name: string; website_url: string; published: boolean; display_order: number; logo_url: string }>({
    name: "", website_url: "", published: true, display_order: 0, logo_url: "",
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("partners")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    setRows((data as Partner[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setEditing(null);
    setForm({ name: "", website_url: "", published: true, display_order: (rows.at(-1)?.display_order ?? 0) + 10, logo_url: "" });
  };

  const startEdit = (p: Partner) => {
    setEditing(p);
    setForm({
      name: p.name,
      website_url: p.website_url ?? "",
      published: p.published,
      display_order: p.display_order,
      logo_url: p.logo_url,
    });
  };

  const uploadLogo = async (file: File) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Fichier trop volumineux", description: "Max 2 Mo.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      if (up.error) throw up.error;
      const signed = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGN_TTL);
      if (signed.error) throw signed.error;
      setForm((f) => ({ ...f, logo_url: signed.data.signedUrl }));
      toast({ title: "Logo importé" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur d'upload";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const save = async () => {
    if (!form.name.trim() || !form.logo_url.trim()) {
      toast({ title: "Champs requis", description: "Nom et logo sont obligatoires.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      website_url: form.website_url.trim() || null,
      published: form.published,
      display_order: Number(form.display_order) || 0,
      logo_url: form.logo_url.trim(),
    };
    const res = editing
      ? await supabase.from("partners").update(payload).eq("id", editing.id)
      : await supabase.from("partners").insert({ ...payload, created_by: (await supabase.auth.getUser()).data.user?.id });
    setSaving(false);
    if (res.error) {
      toast({ title: "Erreur", description: res.error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing ? "Partenaire mis à jour" : "Partenaire ajouté" });
    resetForm();
    load();
  };

  const remove = (p: Partner) => {
    confirm({
      title: "Supprimer ce partenaire ?",
      description: p.name,
      confirmLabel: "Supprimer",
      variant: "destructive",
      onConfirm: async () => {
        const { error } = await supabase.from("partners").delete().eq("id", p.id);
        if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
        else { toast({ title: "Supprimé" }); load(); }
      },
    });
  };

  const move = async (p: Partner, dir: -1 | 1) => {
    const idx = rows.findIndex((r) => r.id === p.id);
    const swap = rows[idx + dir];
    if (!swap) return;
    const a = supabase.from("partners").update({ display_order: swap.display_order }).eq("id", p.id);
    const b = supabase.from("partners").update({ display_order: p.display_order }).eq("id", swap.id);
    const [ra, rb] = await Promise.all([a, b]);
    if (ra.error || rb.error) toast({ title: "Erreur", description: (ra.error || rb.error)?.message, variant: "destructive" });
    load();
  };

  const togglePublished = async (p: Partner) => {
    const { error } = await supabase.from("partners").update({ published: !p.published }).eq("id", p.id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Partenaires</h2>
        <p className="text-sm text-muted-foreground">Gérez les logos affichés dans le pied de page public du site.</p>
      </div>

      <Card className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-foreground">{editing ? "Modifier le partenaire" : "Nouveau partenaire"}</h3>
          {editing && <Button variant="ghost" size="sm" onClick={resetForm}>Annuler</Button>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Nom *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Microsoft Azure" />
          </div>
          <div className="space-y-1.5">
            <Label>Site web</Label>
            <Input value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} placeholder="https://…" />
          </div>
          <div className="space-y-1.5">
            <Label>Ordre d'affichage</Label>
            <Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-3 pt-6">
            <Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} />
            <Label>Publié</Label>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Logo *</Label>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="w-32 h-20 rounded-md border border-border bg-muted/40 flex items-center justify-center overflow-hidden">
              {form.logo_url ? (
                <img src={form.logo_url} alt="Aperçu logo" className="max-w-full max-h-full object-contain" />
              ) : (
                <span className="text-xs text-muted-foreground">Aperçu</span>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Importer un logo
            </Button>
            <span className="text-xs text-muted-foreground">PNG/SVG/WebP, max 2 Mo. Fond transparent recommandé.</span>
          </div>
          <Input
            className="mt-2"
            placeholder="…ou coller une URL de logo"
            value={form.logo_url}
            onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            {editing ? "Mettre à jour" : "Ajouter"}
          </Button>
        </div>
      </Card>

      <Card className="p-4 md:p-6">
        <h3 className="font-medium text-foreground mb-4">Partenaires enregistrés ({rows.length})</h3>
        {loading ? (
          <div className="text-sm text-muted-foreground">Chargement…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">Aucun partenaire pour l'instant.</div>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((p, i) => (
              <div key={p.id} className="flex items-center gap-4 py-3">
                <div className="w-24 h-14 rounded-md bg-muted/40 border border-border flex items-center justify-center overflow-hidden shrink-0">
                  <img src={p.logo_url} alt={p.name} className="max-w-full max-h-full object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                    <span>Ordre: {p.display_order}</span>
                    {p.website_url && (
                      <a href={p.website_url} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                        {p.website_url} <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    <span className={p.published ? "text-emerald-600" : "text-muted-foreground"}>{p.published ? "Publié" : "Masqué"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => move(p, -1)} disabled={i === 0} title="Monter"><ArrowUp className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => move(p, 1)} disabled={i === rows.length - 1} title="Descendre"><ArrowDown className="h-4 w-4" /></Button>
                  <Switch checked={p.published} onCheckedChange={() => togglePublished(p)} />
                  <Button variant="ghost" size="icon" onClick={() => startEdit(p)} title="Modifier"><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(p)} title="Supprimer"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      {confirmDialog}
    </div>
  );
}
