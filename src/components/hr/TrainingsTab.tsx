import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  GraduationCap, Plus, Pencil, Trash2, ExternalLink, Loader2, RefreshCw, Users, Sparkles, CheckCircle2, Clock,
} from "lucide-react";

interface Training {
  id: string;
  title: string;
  description: string | null;
  url: string;
  duration_minutes: number | null;
  category: string | null;
  target_job_titles: string[];
  departments: string[];
  sectors: string[];
  active: boolean;
}

interface CandidateRow {
  process_id: string;
  candidate_name: string;
  candidate_email: string;
  job_title: string | null;
  assigned: { id: string; training_id: string; completed_at: string | null }[];
}

const empty = {
  title: "",
  description: "",
  url: "",
  duration_minutes: "",
  departments: [] as string[],
  sectors: [] as string[],
  active: true,
};

export default function TrainingsTab({ readOnly = false }: { readOnly?: boolean }) {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Training | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [assignTarget, setAssignTarget] = useState<CandidateRow | null>(null);
  const [assignSel, setAssignSel] = useState<Set<string>>(new Set());
  const [departmentsList, setDepartmentsList] = useState<string[]>([]);
  const [sectorsList, setSectorsList] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: trs }, { data: procs }, { data: deps }, { data: secs }] = await Promise.all([
      supabase.from("trainings").select("*").order("created_at", { ascending: false }),
      supabase.from("onboarding_processes").select("id, candidate_name, candidate_email, job_id, created_at").order("created_at", { ascending: false }),
      supabase.from("departments").select("name").order("name"),
      supabase.from("sectors").select("name").order("name"),
    ]);
    setTrainings((trs || []) as Training[]);
    setDepartmentsList(((deps || []) as { name: string }[]).map(d => d.name));
    setSectorsList(((secs || []) as { name: string }[]).map(s => s.name));

    const procIds = (procs || []).map(p => p.id);
    const jobIds = Array.from(new Set((procs || []).map(p => p.job_id).filter(Boolean) as string[]));
    const [{ data: assigned }, { data: jobs }] = await Promise.all([
      procIds.length ? supabase.from("onboarding_assigned_trainings").select("id, process_id, training_id, completed_at").in("process_id", procIds) : Promise.resolve({ data: [] as any }),
      jobIds.length ? supabase.from("job_postings").select("id, title").in("id", jobIds) : Promise.resolve({ data: [] as any }),
    ]);
    const jobMap = new Map<string, string>((jobs || []).map((j: any) => [j.id as string, j.title as string]));
    setCandidates((procs || []).map(p => ({
      process_id: p.id,
      candidate_name: p.candidate_name,
      candidate_email: p.candidate_email,
      job_title: p.job_id ? jobMap.get(p.job_id) || null : null,
      assigned: (assigned || []).filter((a: any) => a.process_id === p.id).map((a: any) => ({ id: a.id, training_id: a.training_id, completed_at: a.completed_at })),
    })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setForm(empty); setDialogOpen(true); };
  const openEdit = (t: Training) => {
    setEditing(t);
    setForm({
      title: t.title,
      description: t.description || "",
      url: t.url,
      duration_minutes: t.duration_minutes?.toString() || "",
      departments: t.departments || [],
      sectors: t.sectors || [],
      active: t.active,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.url.trim()) { toast.error("Titre et URL requis"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      url: form.url.trim(),
      duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
      departments: form.departments,
      sectors: form.sectors,
      active: form.active,
    };
    const res = editing
      ? await supabase.from("trainings").update(payload).eq("id", editing.id)
      : await supabase.from("trainings").insert({ ...payload, created_by: user!.id });
    if (res.error) return toast.error(res.error.message);
    toast.success(editing ? "Formation modifiée" : "Formation ajoutée");
    setDialogOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cette formation ?")) return;
    const { error } = await supabase.from("trainings").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const openAssign = (c: CandidateRow) => {
    setAssignTarget(c);
    setAssignSel(new Set(c.assigned.map(a => a.training_id)));
  };

  const saveAssignments = async () => {
    if (!assignTarget) return;
    const { data: { user } } = await supabase.auth.getUser();
    const current = new Set(assignTarget.assigned.map(a => a.training_id));
    const toAdd = [...assignSel].filter(id => !current.has(id));
    const toRemoveIds = assignTarget.assigned.filter(a => !assignSel.has(a.training_id)).map(a => a.id);

    if (toAdd.length) {
      const { error } = await supabase.from("onboarding_assigned_trainings").insert(
        toAdd.map(tid => ({ process_id: assignTarget.process_id, training_id: tid, assigned_by: user!.id }))
      );
      if (error) return toast.error(error.message);
    }
    if (toRemoveIds.length) {
      const { error } = await supabase.from("onboarding_assigned_trainings").delete().in("id", toRemoveIds);
      if (error) return toast.error(error.message);
    }
    toast.success("Assignations mises à jour");
    setAssignTarget(null);
    load();
  };

  const suggestedFor = (jobTitle: string | null) => {
    if (!jobTitle) return [];
    const j = jobTitle.toLowerCase();
    return trainings.filter(t => t.active && t.target_job_titles.some(tj => j.includes(tj.toLowerCase()) || tj.toLowerCase().includes(j)));
  };

  return (
    <div className="space-y-6">
      {/* Library */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Bibliothèque de formations ({trainings.length})</h3>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Actualiser</Button>
            {!readOnly && <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />Ajouter</Button>}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : trainings.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">Aucune formation. Ajoutez votre premier lien.</Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {trainings.map(t => (
              <Card key={t.id} className={`p-4 ${!t.active ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 className="font-semibold">{t.title}</h4>
                      {!t.active && <Badge variant="outline">Inactif</Badge>}
                      {t.category && <Badge variant="secondary">{t.category}</Badge>}
                      {t.duration_minutes && <Badge variant="outline" className="text-xs">{t.duration_minutes} min</Badge>}
                    </div>
                    {t.description && <p className="text-sm text-muted-foreground line-clamp-2">{t.description}</p>}
                    {t.target_job_titles.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {t.target_job_titles.map(jt => <Badge key={jt} variant="outline" className="text-xs">{jt}</Badge>)}
                      </div>
                    )}
                    <a href={t.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-2">
                      <ExternalLink className="h-3 w-3" />{t.url}
                    </a>
                  </div>
                  {!readOnly && (
                    <div className="flex flex-col gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Assignments */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Assignation aux candidats ({candidates.length})</h3>
        </div>
        {candidates.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">Aucun candidat en onboarding.</Card>
        ) : (
          <div className="grid gap-3">
            {candidates.map(c => {
              const suggested = suggestedFor(c.job_title);
              return (
                <Card key={c.process_id} className="p-4">
                  <div className="flex items-start gap-3 flex-wrap">
                    <div className="flex-1 min-w-[220px]">
                      <div className="font-semibold">{c.candidate_name}</div>
                      <div className="text-xs text-muted-foreground">{c.candidate_email} · {c.job_title || "Poste inconnu"}</div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {c.assigned.length === 0 && <span className="text-xs text-muted-foreground">Aucune formation assignée</span>}
                        {c.assigned.map(a => {
                          const t = trainings.find(x => x.id === a.training_id);
                          return (
                            <Badge key={a.id} variant={a.completed_at ? "default" : "outline"} className={a.completed_at ? "bg-emerald-500" : ""}>
                              {a.completed_at ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                              {t?.title || "Formation"}
                            </Badge>
                          );
                        })}
                      </div>
                      {suggested.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1 flex-wrap">
                          <Sparkles className="h-3 w-3 text-amber-500" />
                          Suggérées : {suggested.map(s => s.title).join(", ")}
                        </div>
                      )}
                    </div>
                    {!readOnly && (
                      <Button size="sm" variant="outline" onClick={() => openAssign(c)}>
                        <Plus className="h-4 w-4 mr-1" />Assigner
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Form dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader className="bg-gradient-to-r from-primary to-[#007aa3] -m-6 mb-0 p-6 rounded-t-lg">
            <DialogTitle className="text-white">{editing ? "Modifier la formation" : "Nouvelle formation"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-6">
            <div><Label>Titre *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>URL (lien externe) *</Label><Input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://..." /></div>
            <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Catégorie</Label><Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Sécurité, DevOps..." /></div>
              <div><Label>Durée (min)</Label><Input type="number" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: e.target.value })} /></div>
            </div>
            <div>
              <Label>Postes ciblés (séparés par des virgules)</Label>
              <Input value={form.target_job_titles} onChange={e => setForm({ ...form, target_job_titles: e.target.value })} placeholder="Développeur, DevOps, Cloud Engineer..." />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={v => setForm({ ...form, active: v })} />
              <Label>Actif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={save}>{editing ? "Enregistrer" : "Ajouter"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign dialog */}
      <Dialog open={!!assignTarget} onOpenChange={o => !o && setAssignTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="bg-gradient-to-r from-primary to-[#007aa3] -m-6 mb-0 p-6 rounded-t-lg">
            <DialogTitle className="text-white">Assigner des formations</DialogTitle>
            <p className="text-cyan-100 text-sm">{assignTarget?.candidate_name} · {assignTarget?.job_title}</p>
          </DialogHeader>
          <div className="pt-6 space-y-2 max-h-[50vh] overflow-y-auto">
            {trainings.filter(t => t.active).length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune formation active disponible.</p>
            ) : trainings.filter(t => t.active).map(t => {
              const checked = assignSel.has(t.id);
              const isSuggested = assignTarget?.job_title && t.target_job_titles.some(jt =>
                assignTarget.job_title!.toLowerCase().includes(jt.toLowerCase()) || jt.toLowerCase().includes(assignTarget.job_title!.toLowerCase())
              );
              return (
                <label key={t.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/30 cursor-pointer">
                  <Checkbox checked={checked} onCheckedChange={(v) => {
                    const next = new Set(assignSel);
                    if (v) next.add(t.id); else next.delete(t.id);
                    setAssignSel(next);
                  }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{t.title}</span>
                      {isSuggested && <Badge variant="outline" className="text-amber-700 border-amber-400 text-[10px]"><Sparkles className="h-2.5 w-2.5 mr-1" />Suggérée</Badge>}
                      {t.duration_minutes && <Badge variant="outline" className="text-[10px]">{t.duration_minutes} min</Badge>}
                    </div>
                    {t.description && <p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p>}
                  </div>
                </label>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignTarget(null)}>Annuler</Button>
            <Button onClick={saveAssignments}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
