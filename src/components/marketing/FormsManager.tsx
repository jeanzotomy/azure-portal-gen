import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FORM_STATUS_META, slugifyPath,
  type BannerVariant, type FormLayout, type FormStatus,
  type MarketingForm, type MarketingFormField, type MarketingFormScoringRule,
} from "@/lib/marketing-forms";
import { FieldsBuilder } from "./forms/FieldsBuilder";
import { ScoringBuilder } from "./forms/ScoringBuilder";
import { SharePanel } from "./forms/SharePanel";
import { newId, type DraftField, type DraftRule } from "./forms/types";
import { cn } from "@/lib/utils";
import { publicUrl } from "@/lib/site-url";
import {
  ClipboardList, ExternalLink, Eye, Link2, Loader2, MoreVertical, Pencil, Plus, Trash2,
} from "lucide-react";

interface Props { canDelete: boolean }

interface Draft {
  title: string;
  slug: string;
  internal_name: string;
  status: FormStatus;
  description: string;
  intro_text: string;
  layout: FormLayout;
  banner_variant: BannerVariant;
  start_button_label: string;
  submit_label: string;
  confirmation_title: string;
  confirmation_text: string;
  confirmation_button_label: string;
  confirmation_redirect_url: string;
  notification_email: string;
  consent_required: boolean;
  consent_text: string;
  show_progress: boolean;
  auto_confirmation_enabled: boolean;
  score_urgent_threshold: number;
  score_qualified_threshold: number;
}

const emptyDraft = (): Draft => ({
  title: "", slug: "", internal_name: "", status: "brouillon",
  description: "", intro_text: "", layout: "une_question_par_ecran",
  banner_variant: "aucune", start_button_label: "Commencer", submit_label: "Envoyer",
  confirmation_title: "Merci !", confirmation_text: "", confirmation_button_label: "",
  confirmation_redirect_url: "", notification_email: "",
  consent_required: true, consent_text: "", show_progress: true,
  auto_confirmation_enabled: true, score_urgent_threshold: 60, score_qualified_threshold: 30,
});

const toDraft = (f: MarketingForm): Draft => ({
  title: f.title, slug: f.slug, internal_name: f.internal_name ?? "",
  status: (f.status as FormStatus) ?? "brouillon",
  description: f.description ?? "", intro_text: f.intro_text ?? "",
  layout: (f.layout as FormLayout) ?? "une_question_par_ecran",
  banner_variant: (f.banner_variant as BannerVariant) ?? "aucune",
  start_button_label: f.start_button_label, submit_label: f.submit_label,
  confirmation_title: f.confirmation_title, confirmation_text: f.confirmation_text ?? "",
  confirmation_button_label: f.confirmation_button_label ?? "",
  confirmation_redirect_url: f.confirmation_redirect_url ?? "",
  notification_email: f.notification_email ?? "",
  consent_required: f.consent_required, consent_text: f.consent_text ?? "",
  show_progress: f.show_progress, auto_confirmation_enabled: f.auto_confirmation_enabled,
  score_urgent_threshold: f.score_urgent_threshold, score_qualified_threshold: f.score_qualified_threshold,
});

export function FormsManager({ canDelete }: Props) {
  const [forms, setForms] = useState<MarketingForm[] | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<MarketingForm | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [fields, setFields] = useState<DraftField[]>([]);
  const [rules, setRules] = useState<DraftRule[]>([]);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("general");

  const load = async () => {
    const { data, error } = await supabase
      .from("marketing_forms").select("*").order("created_at", { ascending: false });
    if (error) { toast.error("Chargement des formulaires impossible"); return; }
    setForms((data as MarketingForm[]) ?? []);
  };

  useEffect(() => { void load(); }, []);

  const openNew = () => {
    setEditing(null);
    setDraft(emptyDraft());
    setFields([]);
    setRules([]);
    setTab("general");
    setEditorOpen(true);
  };

  const openEdit = async (f: MarketingForm) => {
    setEditing(f);
    setDraft(toDraft(f));
    setTab("general");
    setEditorOpen(true);
    const [{ data: flds }, { data: rls }] = await Promise.all([
      supabase.from("marketing_form_fields").select("*").eq("form_id", f.id).order("position"),
      supabase.from("marketing_form_scoring_rules").select("*").eq("form_id", f.id).order("position"),
    ]);
    setFields(((flds as MarketingFormField[]) ?? []).map(({ created_at, updated_at, ...rest }) => rest));
    setRules(((rls as MarketingFormScoringRule[]) ?? []).map(({ created_at, updated_at, ...rest }) => rest));
  };

  const save = async () => {
    if (!draft.title.trim()) { toast.error("Le titre est obligatoire"); setTab("general"); return; }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const payload = {
      title: draft.title.trim(),
      slug: (draft.slug.trim() || slugifyPath(draft.title)),
      internal_name: draft.internal_name || null,
      status: draft.status,
      description: draft.description || null,
      intro_text: draft.intro_text || null,
      layout: draft.layout,
      banner_variant: draft.banner_variant,
      start_button_label: draft.start_button_label || "Commencer",
      submit_label: draft.submit_label || "Envoyer",
      confirmation_title: draft.confirmation_title || "Merci !",
      confirmation_text: draft.confirmation_text || null,
      confirmation_button_label: draft.confirmation_button_label || null,
      confirmation_redirect_url: draft.confirmation_redirect_url || null,
      notification_email: draft.notification_email || null,
      consent_required: draft.consent_required,
      consent_text: draft.consent_text || null,
      show_progress: draft.show_progress,
      auto_confirmation_enabled: draft.auto_confirmation_enabled,
      score_urgent_threshold: draft.score_urgent_threshold,
      score_qualified_threshold: draft.score_qualified_threshold,
    };

    let formId = editing?.id;
    if (editing) {
      const { error } = await supabase.from("marketing_forms").update(payload).eq("id", editing.id);
      if (error) {
        setSaving(false);
        toast.error(error.message.includes("duplicate") ? "Ce lien (slug) est déjà utilisé" : "Enregistrement impossible");
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("marketing_forms")
        .insert({ ...payload, created_by: userData.user?.id ?? null })
        .select("id").single();
      if (error || !data) {
        setSaving(false);
        toast.error(error?.message.includes("duplicate") ? "Ce lien (slug) est déjà utilisé" : "Création impossible");
        return;
      }
      formId = data.id;
    }

    // Remplacement complet des champs et des règles (ordre = position)
    await supabase.from("marketing_form_fields").delete().eq("form_id", formId);
    await supabase.from("marketing_form_scoring_rules").delete().eq("form_id", formId);
    if (fields.length > 0) {
      const { error } = await supabase.from("marketing_form_fields").insert(
        fields.map((f, i) => ({ ...f, id: f.id || newId(), form_id: formId, position: i })),
      );
      if (error) { setSaving(false); toast.error("Enregistrement des champs impossible"); return; }
    }
    if (rules.length > 0) {
      const { error } = await supabase.from("marketing_form_scoring_rules").insert(
        rules.map((r, i) => ({ ...r, id: r.id || newId(), form_id: formId, position: i })),
      );
      if (error) { setSaving(false); toast.error("Enregistrement des règles impossible"); return; }
    }

    setSaving(false);
    setEditorOpen(false);
    toast.success(editing ? "Formulaire mis à jour" : "Formulaire créé");
    void load();
  };

  const setStatus = async (f: MarketingForm, status: FormStatus) => {
    const { error } = await supabase.from("marketing_forms").update({ status }).eq("id", f.id);
    if (error) { toast.error("Action impossible"); return; }
    setForms((prev) => (prev ?? []).map((x) => (x.id === f.id ? { ...x, status } : x)));
    toast.success("Statut mis à jour");
  };

  const remove = async (f: MarketingForm) => {
    const { error } = await supabase.from("marketing_forms").delete().eq("id", f.id);
    if (error) { toast.error("Suppression impossible"); return; }
    setForms((prev) => (prev ?? []).filter((x) => x.id !== f.id));
    toast.success("Formulaire supprimé");
  };

  const copyLink = (f: MarketingForm) => {
    void navigator.clipboard.writeText(publicUrl(`/f/${f.slug}`));
    toast.success("Lien copié");
  };

  if (forms === null) {
    return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40" />)}</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{forms.length} formulaire(s)</p>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Nouveau formulaire</Button>
      </div>

      {forms.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
          Aucun formulaire pour le moment.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {forms.map((f) => {
            const st = FORM_STATUS_META.find((s) => s.value === f.status);
            return (
              <Card key={f.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Badge className={cn("mb-1 border-0", st?.className)}>{st?.label ?? f.status}</Badge>
                      <h3 className="truncate font-bold text-foreground">{f.title}</h3>
                      <p className="truncate text-xs text-muted-foreground">/f/{f.slug}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Actions"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => void openEdit(f)}>
                          <Pencil className="mr-2 h-4 w-4" /> Modifier
                        </DropdownMenuItem>
                        {f.status !== "publiee" ? (
                          <DropdownMenuItem onClick={() => setStatus(f, "publiee")}>Publier</DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => setStatus(f, "brouillon")}>Dépublier</DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => setStatus(f, "fermee")}>Fermer</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => copyLink(f)}>
                          <Link2 className="mr-2 h-4 w-4" /> Copier le lien
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a href={`/f/${f.slug}`} target="_blank" rel="noreferrer">
                            <Eye className="mr-2 h-4 w-4" /> Prévisualiser
                          </a>
                        </DropdownMenuItem>
                        {canDelete && (
                          <DropdownMenuItem className="text-destructive" onClick={() => remove(f)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {f.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{f.description}</p>
                  )}
                  <Button variant="outline" size="sm" className="w-full" onClick={() => void openEdit(f)}>
                    <Pencil className="mr-2 h-4 w-4" /> Modifier le formulaire
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Sheet open={editorOpen} onOpenChange={setEditorOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-4xl">
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              {editing ? "Modifier le formulaire" : "Nouveau formulaire"}
            </SheetTitle>
          </SheetHeader>

          <Tabs value={tab} onValueChange={setTab} className="mt-4">
            <TabsList className="inline-flex h-auto w-fit max-w-full flex-wrap">
              <TabsTrigger value="general">Général</TabsTrigger>
              <TabsTrigger value="fields">Champs</TabsTrigger>
              <TabsTrigger value="scoring">Qualification</TabsTrigger>
              <TabsTrigger value="share" disabled={!editing}>Partage</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="mt-4 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Titre public</Label>
                  <Input
                    value={draft.title}
                    onChange={(e) => setDraft((p) => ({
                      ...p, title: e.target.value,
                      slug: editing ? p.slug : slugifyPath(e.target.value),
                    }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Lien public (slug)</Label>
                  <Input value={draft.slug}
                    onChange={(e) => setDraft((p) => ({ ...p, slug: slugifyPath(e.target.value) }))} />
                  {draft.slug && (
                    <p className="text-xs text-muted-foreground">{publicUrl(`/f/${draft.slug}`)}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Nom interne (visible par l'équipe)</Label>
                  <Input value={draft.internal_name}
                    onChange={(e) => setDraft((p) => ({ ...p, internal_name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Statut</Label>
                  <Select value={draft.status} onValueChange={(v) => setDraft((p) => ({ ...p, status: v as FormStatus }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FORM_STATUS_META.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Présentation</Label>
                  <Select value={draft.layout} onValueChange={(v) => setDraft((p) => ({ ...p, layout: v as FormLayout }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="une_question_par_ecran">Une question par écran</SelectItem>
                      <SelectItem value="page_unique">Page unique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Bannière</Label>
                  <Select value={draft.banner_variant} onValueChange={(v) => setDraft((p) => ({ ...p, banner_variant: v as BannerVariant }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aucune">Aucune</SelectItem>
                      <SelectItem value="audit_microsoft">Audit Microsoft</SelectItem>
                      <SelectItem value="image">Image personnalisée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Description courte</Label>
                <Textarea rows={2} value={draft.description}
                  onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Texte d'introduction</Label>
                <Textarea rows={3} value={draft.intro_text}
                  onChange={(e) => setDraft((p) => ({ ...p, intro_text: e.target.value }))} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Bouton de démarrage</Label>
                  <Input value={draft.start_button_label}
                    onChange={(e) => setDraft((p) => ({ ...p, start_button_label: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Bouton d'envoi</Label>
                  <Input value={draft.submit_label}
                    onChange={(e) => setDraft((p) => ({ ...p, submit_label: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Titre de confirmation</Label>
                  <Input value={draft.confirmation_title}
                    onChange={(e) => setDraft((p) => ({ ...p, confirmation_title: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>E-mail de notification interne</Label>
                  <Input type="email" value={draft.notification_email}
                    onChange={(e) => setDraft((p) => ({ ...p, notification_email: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Texte de confirmation</Label>
                <Textarea rows={2} value={draft.confirmation_text}
                  onChange={(e) => setDraft((p) => ({ ...p, confirmation_text: e.target.value }))} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                  Barre de progression
                  <Switch checked={draft.show_progress}
                    onCheckedChange={(v) => setDraft((p) => ({ ...p, show_progress: v }))} />
                </label>
                <label className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                  E-mail de confirmation automatique
                  <Switch checked={draft.auto_confirmation_enabled}
                    onCheckedChange={(v) => setDraft((p) => ({ ...p, auto_confirmation_enabled: v }))} />
                </label>
                <label className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm sm:col-span-2">
                  Consentement obligatoire
                  <Switch checked={draft.consent_required}
                    onCheckedChange={(v) => setDraft((p) => ({ ...p, consent_required: v }))} />
                </label>
              </div>
              {draft.consent_required && (
                <div className="space-y-1.5">
                  <Label>Texte de consentement</Label>
                  <Textarea rows={2} value={draft.consent_text}
                    onChange={(e) => setDraft((p) => ({ ...p, consent_text: e.target.value }))} />
                </div>
              )}
            </TabsContent>

            <TabsContent value="fields" className="mt-4">
              <FieldsBuilder
                formId={editing?.id ?? "brouillon"}
                fields={fields}
                onChange={setFields}
              />
            </TabsContent>

            <TabsContent value="scoring" className="mt-4">
              <ScoringBuilder
                formId={editing?.id ?? "brouillon"}
                fields={fields}
                rules={rules}
                urgentThreshold={draft.score_urgent_threshold}
                qualifiedThreshold={draft.score_qualified_threshold}
                onRulesChange={setRules}
                onThresholdsChange={(u, q) => setDraft((p) => ({
                  ...p, score_urgent_threshold: u, score_qualified_threshold: q,
                }))}
              />
            </TabsContent>

            <TabsContent value="share" className="mt-4">
              {editing && (
                <SharePanel slug={editing.slug} title={editing.title} published={editing.status === "publiee"} />
              )}
            </TabsContent>
          </Tabs>

          <SheetFooter className="mt-6 gap-2">
            {editing && (
              <Button variant="outline" asChild>
                <a href={`/f/${editing.slug}`} target="_blank" rel="noreferrer">
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
