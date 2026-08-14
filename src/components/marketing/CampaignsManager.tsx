import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CAMPAIGN_CHANNELS, CAMPAIGN_STATUSES, CAMPAIGN_TYPES, formatDate, slugify,
  type Campaign, type CampaignStatus, type CampaignType,
} from "./marketing-shared";
import { cn } from "@/lib/utils";
import {
  Archive, Copy, ExternalLink, Eye, Link2, Loader2, Megaphone, MoreVertical, Plus, Upload,
} from "lucide-react";

const SIGNED_URL_TTL = 315_360_000; // 10 ans

interface Props { canDelete: boolean }

interface Counters { views: number; submits: number; qualified: number }

const emptyDraft = () => ({
  title: "", slug: "", type: "annonce" as CampaignType, status: "brouillon" as CampaignStatus,
  short_description: "", content: "", cover_image_url: "", cta_label: "", cta_url: "",
  start_date: "", end_date: "", channels: [] as string[], target_audience: "", planned_budget: "",
});

export function CampaignsManager({ canDelete }: Props) {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [counters, setCounters] = useState<Record<string, Counters>>({});
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const [{ data: rows }, { data: events }, { data: leads }] = await Promise.all([
      supabase.from("marketing_campaigns").select("*").order("created_at", { ascending: false }),
      supabase.from("campaign_events").select("campaign_id, type"),
      supabase.from("marketing_leads").select("campaign_id, priority"),
    ]);
    setCampaigns((rows as Campaign[]) ?? []);
    const map: Record<string, Counters> = {};
    for (const e of events ?? []) {
      if (!e.campaign_id) continue;
      map[e.campaign_id] ??= { views: 0, submits: 0, qualified: 0 };
      if (e.type === "view") map[e.campaign_id].views += 1;
      if (e.type === "submit") map[e.campaign_id].submits += 1;
    }
    for (const l of leads ?? []) {
      if (!l.campaign_id) continue;
      map[l.campaign_id] ??= { views: 0, submits: 0, qualified: 0 };
      if (l.priority === "urgent" || l.priority === "qualifie") map[l.campaign_id].qualified += 1;
    }
    setCounters(map);
  };

  useEffect(() => { void load(); }, []);

  const openNew = () => { setEditing(null); setDraft(emptyDraft()); setEditorOpen(true); };

  const openEdit = (c: Campaign) => {
    setEditing(c);
    setDraft({
      title: c.title, slug: c.slug, type: c.type, status: c.status,
      short_description: c.short_description ?? "", content: c.content ?? "",
      cover_image_url: c.cover_image_url ?? "", cta_label: c.cta_label ?? "", cta_url: c.cta_url ?? "",
      start_date: c.start_date ?? "", end_date: c.end_date ?? "", channels: c.channels ?? [],
      target_audience: c.target_audience ?? "", planned_budget: c.planned_budget?.toString() ?? "",
    });
    setEditorOpen(true);
  };

  const uploadCover = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `campaigns/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("marketing").upload(path, file, { upsert: false });
    if (error) { setUploading(false); toast.error("Téléversement impossible"); return; }
    const { data } = await supabase.storage.from("marketing").createSignedUrl(path, SIGNED_URL_TTL);
    setUploading(false);
    if (!data?.signedUrl) { toast.error("Lien d'image indisponible"); return; }
    setDraft((p) => ({ ...p, cover_image_url: data.signedUrl }));
  };

  const save = async () => {
    if (!draft.title.trim()) { toast.error("Le titre est obligatoire"); return; }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const payload = {
      title: draft.title.trim(),
      slug: (draft.slug.trim() || slugify(draft.title)) || crypto.randomUUID().slice(0, 8),
      type: draft.type,
      status: draft.status,
      short_description: draft.short_description || null,
      content: draft.content || null,
      cover_image_url: draft.cover_image_url || null,
      cta_label: draft.cta_label || null,
      cta_url: draft.cta_url || null,
      start_date: draft.start_date || null,
      end_date: draft.end_date || null,
      channels: draft.channels,
      target_audience: draft.target_audience || null,
      planned_budget: draft.planned_budget ? Number(draft.planned_budget) : null,
    };
    const query = editing
      ? supabase.from("marketing_campaigns").update(payload).eq("id", editing.id).select("*").single()
      : supabase.from("marketing_campaigns").insert({ ...payload, created_by: userData.user?.id ?? null }).select("*").single();
    const { data, error } = await query;
    setSaving(false);
    if (error || !data) {
      toast.error(error?.message?.includes("duplicate") ? "Ce lien (slug) est déjà utilisé" : "Enregistrement impossible");
      return;
    }
    const row = data as Campaign;
    setCampaigns((prev) => editing ? (prev ?? []).map((c) => (c.id === row.id ? row : c)) : [row, ...(prev ?? [])]);
    setEditorOpen(false);
    toast.success(editing ? "Campagne mise à jour" : "Campagne créée");
  };

  const setStatus = async (c: Campaign, status: CampaignStatus) => {
    const { data, error } = await supabase
      .from("marketing_campaigns").update({ status }).eq("id", c.id).select("*").single();
    if (error || !data) { toast.error("Action impossible"); return; }
    setCampaigns((prev) => (prev ?? []).map((x) => (x.id === c.id ? (data as Campaign) : x)));
    toast.success("Statut mis à jour");
  };

  const duplicate = async (c: Campaign) => {
    const { data: userData } = await supabase.auth.getUser();
    const { id, created_at, updated_at, created_by, ...rest } = c;
    const { data, error } = await supabase
      .from("marketing_campaigns")
      .insert({
        ...rest,
        title: `${c.title} (copie)`,
        slug: `${slugify(c.title).slice(0, 45)}-${Math.random().toString(36).slice(2, 7)}`,
        status: "brouillon",
        created_by: userData.user?.id ?? null,
      })
      .select("*").single();
    if (error || !data) { toast.error("Duplication impossible"); return; }
    setCampaigns((prev) => [data as Campaign, ...(prev ?? [])]);
    toast.success("Campagne dupliquée");
  };

  const remove = async (c: Campaign) => {
    const { error } = await supabase.from("marketing_campaigns").delete().eq("id", c.id);
    if (error) { toast.error("Suppression impossible"); return; }
    setCampaigns((prev) => (prev ?? []).filter((x) => x.id !== c.id));
    toast.success("Campagne supprimée");
  };

  const copyLink = (c: Campaign) => {
    void navigator.clipboard.writeText(`${window.location.origin}/campagnes/${c.slug}`);
    toast.success("Lien copié");
  };

  const previewUrl = useMemo(
    () => (draft.slug || slugify(draft.title) ? `/campagnes/${draft.slug || slugify(draft.title)}` : null),
    [draft.slug, draft.title],
  );

  if (campaigns === null) {
    return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-64" />)}</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{campaigns.length} campagne(s)</p>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Nouvelle campagne</Button>
      </div>

      {campaigns.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
          Aucune campagne pour le moment.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((c) => {
            const st = CAMPAIGN_STATUSES.find((s) => s.value === c.status);
            const k = counters[c.id] ?? { views: 0, submits: 0, qualified: 0 };
            return (
              <Card key={c.id} className="overflow-hidden">
                <div className="aspect-[16/9] w-full bg-muted">
                  {c.cover_image_url ? (
                    <img src={c.cover_image_url} alt={c.title} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-primary/5">
                      <Megaphone className="h-8 w-8 text-primary/40" />
                    </div>
                  )}
                </div>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-1.5">
                        <Badge className={cn("border-0", st?.className)}>{st?.label}</Badge>
                        <Badge variant="outline">{CAMPAIGN_TYPES.find((t) => t.value === c.type)?.label}</Badge>
                      </div>
                      <h3 className="truncate font-bold text-foreground">{c.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(c.start_date)} → {formatDate(c.end_date)}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Actions"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(c)}>Modifier</DropdownMenuItem>
                        {c.status !== "publiee" ? (
                          <DropdownMenuItem onClick={() => setStatus(c, "publiee")}>Publier</DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => setStatus(c, "brouillon")}>Dépublier</DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => duplicate(c)}><Copy className="mr-2 h-4 w-4" /> Dupliquer</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStatus(c, "archivee")}><Archive className="mr-2 h-4 w-4" /> Archiver</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => copyLink(c)}><Link2 className="mr-2 h-4 w-4" /> Copier le lien</DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a href={`/campagnes/${c.slug}`} target="_blank" rel="noreferrer">
                            <Eye className="mr-2 h-4 w-4" /> Prévisualiser
                          </a>
                        </DropdownMenuItem>
                        {canDelete && (
                          <DropdownMenuItem className="text-destructive" onClick={() => remove(c)}>
                            Supprimer
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {c.channels?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {c.channels.map((ch) => <Badge key={ch} variant="secondary" className="text-[11px]">{ch}</Badge>)}
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-2 text-center">
                    <div><p className="text-sm font-bold">{k.views}</p><p className="text-[11px] text-muted-foreground">Vues</p></div>
                    <div><p className="text-sm font-bold">{k.submits}</p><p className="text-[11px] text-muted-foreground">Soumissions</p></div>
                    <div><p className="text-sm font-bold">{k.qualified}</p><p className="text-[11px] text-muted-foreground">Qualifiés</p></div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Editor */}
      <Sheet open={editorOpen} onOpenChange={setEditorOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader className="text-left">
            <SheetTitle>{editing ? "Modifier la campagne" : "Nouvelle campagne"}</SheetTitle>
          </SheetHeader>

          <div className="mt-4 grid gap-4">
            <div className="space-y-1.5">
              <Label>Titre</Label>
              <Input
                value={draft.title}
                onChange={(e) => setDraft((p) => ({
                  ...p, title: e.target.value,
                  slug: editing ? p.slug : slugify(e.target.value),
                }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Lien public (slug)</Label>
              <Input value={draft.slug} onChange={(e) => setDraft((p) => ({ ...p, slug: slugify(e.target.value) }))} />
              {previewUrl && (
                <p className="text-xs text-muted-foreground">
                  {window.location.origin}{previewUrl}
                </p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={draft.type} onValueChange={(v) => setDraft((p) => ({ ...p, type: v as CampaignType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <Select value={draft.status} onValueChange={(v) => setDraft((p) => ({ ...p, status: v as CampaignStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date de début</Label>
                <Input type="date" value={draft.start_date} onChange={(e) => setDraft((p) => ({ ...p, start_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Date de fin</Label>
                <Input type="date" value={draft.end_date} onChange={(e) => setDraft((p) => ({ ...p, end_date: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description courte</Label>
              <Textarea rows={2} value={draft.short_description}
                onChange={(e) => setDraft((p) => ({ ...p, short_description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Contenu</Label>
              <Textarea rows={7} value={draft.content}
                onChange={(e) => setDraft((p) => ({ ...p, content: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <Label>Image de couverture</Label>
              <div className="flex items-center gap-3">
                <Button variant="outline" asChild disabled={uploading}>
                  <label className="cursor-pointer">
                    {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    Téléverser
                    <input
                      type="file" accept="image/*" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadCover(f); }}
                    />
                  </label>
                </Button>
                {draft.cover_image_url && (
                  <img src={draft.cover_image_url} alt="Aperçu" className="h-14 w-24 rounded border border-border object-cover" />
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Texte du bouton</Label>
                <Input value={draft.cta_label} onChange={(e) => setDraft((p) => ({ ...p, cta_label: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Lien du bouton</Label>
                <Input value={draft.cta_url} onChange={(e) => setDraft((p) => ({ ...p, cta_url: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Audience cible</Label>
                <Input value={draft.target_audience} onChange={(e) => setDraft((p) => ({ ...p, target_audience: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Budget prévu</Label>
                <Input type="number" value={draft.planned_budget}
                  onChange={(e) => setDraft((p) => ({ ...p, planned_budget: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Canaux de diffusion</Label>
              <div className="flex flex-wrap gap-3">
                {CAMPAIGN_CHANNELS.map((ch) => (
                  <label key={ch} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={draft.channels.includes(ch)}
                      onCheckedChange={(v) => setDraft((p) => ({
                        ...p,
                        channels: v === true ? [...p.channels, ch] : p.channels.filter((x) => x !== ch),
                      }))}
                    />
                    {ch}
                  </label>
                ))}
              </div>
            </div>

            {/* Live preview */}
            <div className="rounded-xl border border-border p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Aperçu</p>
              {draft.cover_image_url && (
                <img src={draft.cover_image_url} alt="" className="mb-3 w-full rounded-lg object-cover" />
              )}
              <h3 className="text-lg font-bold text-foreground">{draft.title || "Titre de la campagne"}</h3>
              {draft.short_description && <p className="mt-1 text-sm text-muted-foreground">{draft.short_description}</p>}
              {draft.cta_label && <Button className="mt-3" size="sm">{draft.cta_label}</Button>}
            </div>
          </div>

          <SheetFooter className="mt-6 gap-2">
            {editing && (
              <Button variant="outline" asChild>
                <a href={`/campagnes/${editing.slug}`} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" /> Voir
                </a>
              </Button>
            )}
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Annuler</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Enregistrer
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
