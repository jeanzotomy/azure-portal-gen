import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Search, Package, RefreshCw, Copy, Globe, GlobeLock, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface CatalogService {
  id: string;
  name: string;
  description: string | null;
  default_unit_price: number;
  default_currency: "GNF" | "USD" | "EUR";
  default_unit: string;
  active: boolean;
  published: boolean;
  display_order: number;
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
  published: false,
  display_order: 0,
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
    const { data, error } = await supabase.from("service_catalog").select("*").order("display_order", { ascending: true }).order("name");
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
          published: form.published ?? false,
          display_order: form.display_order ?? 0,
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
        published: form.published ?? false,
        display_order: form.display_order ?? 0,
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

  const duplicate = async (s: CatalogService) => {
    if (!user) return;
    const { error } = await supabase.from("service_catalog").insert({
      name: `${s.name} (copie)`,
      description: s.description,
      default_unit_price: s.default_unit_price,
      default_currency: s.default_currency,
      default_unit: s.default_unit,
      active: s.active,
      published: false,
      display_order: s.display_order,
      created_by: user.id,
    });
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Service dupliqué" });
      void load();
    }
  };

  const togglePublish = async (s: CatalogService) => {
    const next = !s.published;
    const { error } = await supabase
      .from("service_catalog")
      .update({ published: next })
      .eq("id", s.id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else {
      toast({ title: next ? "Publié sur le site" : "Retiré du site" });
      void load();
    }
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
  const publishedItems = filtered.filter((s) => s.published);
  const otherItems = filtered.filter((s) => !s.published);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = publishedItems.findIndex((s) => s.id === active.id);
    const newIndex = publishedItems.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(publishedItems, oldIndex, newIndex);
    // Optimistic update
    const reorderedWithOrder = reordered.map((s, i) => ({ ...s, display_order: i }));
    const byId = new Map(reorderedWithOrder.map((s) => [s.id, s]));
    setItems((prev) => prev.map((s) => byId.get(s.id) ?? s).sort((a, b) => {
      if (a.published !== b.published) return a.published ? -1 : 1;
      return (a.display_order ?? 0) - (b.display_order ?? 0) || a.name.localeCompare(b.name);
    }));
    // Persist each updated display_order
    const updates = await Promise.all(
      reorderedWithOrder.map((s) =>
        supabase.from("service_catalog").update({ display_order: s.display_order }).eq("id", s.id)
      )
    );
    const firstErr = updates.find((u) => u.error);
    if (firstErr?.error) {
      toast({ title: "Erreur d'ordre", description: firstErr.error.message, variant: "destructive" });
      void load();
    }
  };

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
        <div className="space-y-6">
          {publishedItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Globe size={14} /> Publiés sur /pricing
                <span className="text-xs text-muted-foreground font-normal">· glissez-déposez pour réordonner</span>
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={publishedItems.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {publishedItems.map((s) => (
                      <SortableServiceCard
                        key={s.id}
                        service={s}
                        onTogglePublish={() => void togglePublish(s)}
                        onDuplicate={() => void duplicate(s)}
                        onEdit={() => openEdit(s)}
                        onRemove={() => void remove(s.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}

          {otherItems.length > 0 && (
            <div className="space-y-2">
              {publishedItems.length > 0 && (
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <GlobeLock size={14} /> Non publiés
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {otherItems.map((s) => (
                  <ServiceCardView
                    key={s.id}
                    service={s}
                    onTogglePublish={() => void togglePublish(s)}
                    onDuplicate={() => void duplicate(s)}
                    onEdit={() => openEdit(s)}
                    onRemove={() => void remove(s.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto w-[95vw] sm:w-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier le service" : "Nouveau service"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">Nom *</label>
              <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium">Description (sous-titre italique)</label>
              <Textarea rows={2} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
            <div className="flex items-center gap-2">
              <Switch checked={form.published ?? false} onCheckedChange={(v) => setForm({ ...form, published: v })} />
              <label className="text-xs">Publié sur le site (visible publiquement sur /pricing)</label>
            </div>
            <div>
              <label className="text-xs font-medium">Ordre d'affichage sur /pricing</label>
              <Input
                type="number"
                value={form.display_order ?? 0}
                onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Plus le nombre est petit, plus le service apparaît en premier. À égalité, tri par nom.
              </p>
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

interface CardActionProps {
  service: CatalogService;
  onTogglePublish: () => void;
  onDuplicate: () => void;
  onEdit: () => void;
  onRemove: () => void;
  dragHandle?: React.ReactNode;
}

function ServiceCardContent({ service: s, onTogglePublish, onDuplicate, onEdit, onRemove, dragHandle }: CardActionProps) {
  return (
    <CardContent className="p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          {dragHandle}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">{s.name}</span>
              {s.published && (
                <Badge variant="secondary" className="gap-1 text-[10px]">
                  <Globe size={10} /> Publié
                </Badge>
              )}
            </div>
            {s.description && <div className="text-xs text-muted-foreground italic">{s.description}</div>}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button size="icon" variant="ghost" onClick={onTogglePublish} title={s.published ? "Dépublier" : "Publier sur le site"}>
            {s.published ? <GlobeLock size={14} className="text-primary" /> : <Globe size={14} />}
          </Button>
          <Button size="icon" variant="ghost" onClick={onDuplicate} title="Dupliquer"><Copy size={14} /></Button>
          <Button size="icon" variant="ghost" onClick={onEdit} title="Modifier"><Pencil size={14} /></Button>
          <Button size="icon" variant="ghost" onClick={onRemove} title="Supprimer"><Trash2 size={14} className="text-destructive" /></Button>
        </div>
      </div>
      <div className="text-xs flex gap-2 items-center flex-wrap">
        <span className="font-medium">{new Intl.NumberFormat("fr-FR").format(s.default_unit_price)} {s.default_currency}</span>
        <span className="text-muted-foreground">/ {s.default_unit}</span>
        {!s.active && <span className="text-muted-foreground">· Inactif</span>}
      </div>
    </CardContent>
  );
}

function ServiceCardView(props: CardActionProps) {
  return (
    <Card className={!props.service.active ? "opacity-60" : ""}>
      <ServiceCardContent {...props} />
    </Card>
  );
}

function SortableServiceCard(props: CardActionProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.service.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto",
  };
  const handle = (
    <button
      type="button"
      className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none mt-0.5"
      aria-label="Glisser pour réordonner"
      {...attributes}
      {...listeners}
    >
      <GripVertical size={16} />
    </button>
  );
  return (
    <div ref={setNodeRef} style={style}>
      <Card className={!props.service.active ? "opacity-60" : ""}>
        <ServiceCardContent {...props} dragHandle={handle} />
      </Card>
    </div>
  );
}
