import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  GraduationCap, Plus, Pencil, Trash2, ExternalLink, Loader2, RefreshCw, Users, Sparkles, CheckCircle2, Clock,
  Brain, FileQuestion, Layers, UserPlus, Wand2, BookOpen,
} from "lucide-react";

interface Training {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  duration_minutes: number | null;
  category: string | null;
  target_job_titles?: string[];
  departments: string[];
  sectors: string[];
  active: boolean;
  content: any | null;
  quiz: any | null;
  passing_score: number;
  ai_generated: boolean;
  topic: string | null;
  level: string | null;
}

interface CandidateRow {
  process_id: string;
  candidate_name: string;
  candidate_email: string;
  job_title: string | null;
  assigned: { id: string; training_id: string; completed_at: string | null; source?: string; quiz_passed?: boolean | null }[];
}

interface Group { id: string; name: string; description: string | null; }

const emptyForm = {
  title: "",
  description: "",
  url: "",
  duration_minutes: "",
  category: "",
  departments: [] as string[],
  sectors: [] as string[],
  active: true,
  content: null as any,
  quiz: null as any,
  passing_score: 70,
  ai_generated: false,
  topic: "",
  level: "",
};

export default function TrainingsTab({ readOnly = false }: { readOnly?: boolean }) {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Training | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiForm, setAiForm] = useState({ topic: "", level: "intermediaire", duration_minutes: 30, num_questions: 5 });
  const [aiBusy, setAiBusy] = useState(false);
  const [assignTarget, setAssignTarget] = useState<CandidateRow | null>(null);
  const [assignSel, setAssignSel] = useState<Set<string>>(new Set());
  const [departmentsList, setDepartmentsList] = useState<string[]>([]);
  const [sectorsList, setSectorsList] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: trs }, { data: procs }, { data: deps }, { data: secs }, { data: grps }] = await Promise.all([
      supabase.from("trainings").select("*").order("created_at", { ascending: false }),
      supabase.from("onboarding_processes").select("id, candidate_name, candidate_email, job_id, created_at").order("created_at", { ascending: false }),
      supabase.from("departments").select("name").order("name"),
      supabase.from("sectors").select("name").order("name"),
      supabase.from("training_groups").select("id, name, description").order("created_at", { ascending: false }),
    ]);
    setTrainings((trs || []) as Training[]);
    setDepartmentsList(((deps || []) as { name: string }[]).map(d => d.name));
    setSectorsList(((secs || []) as { name: string }[]).map(s => s.name));
    setGroups((grps || []) as Group[]);

    const procIds = (procs || []).map(p => p.id);
    const jobIds = Array.from(new Set((procs || []).map(p => p.job_id).filter(Boolean) as string[]));
    const [{ data: assigned }, { data: jobs }] = await Promise.all([
      procIds.length ? supabase.from("onboarding_assigned_trainings").select("id, process_id, training_id, completed_at, source, quiz_passed").in("process_id", procIds) : Promise.resolve({ data: [] as any }),
      jobIds.length ? supabase.from("job_postings").select("id, title").in("id", jobIds) : Promise.resolve({ data: [] as any }),
    ]);
    const jobMap = new Map<string, string>((jobs || []).map((j: any) => [j.id as string, j.title as string]));
    setCandidates((procs || []).map(p => ({
      process_id: p.id,
      candidate_name: p.candidate_name,
      candidate_email: p.candidate_email,
      job_title: p.job_id ? jobMap.get(p.job_id) || null : null,
      assigned: (assigned || []).filter((a: any) => a.process_id === p.id),
    })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (t: Training) => {
    setEditing(t);
    setForm({
      title: t.title,
      description: t.description || "",
      url: t.url || "",
      duration_minutes: t.duration_minutes?.toString() || "",
      category: t.category || "",
      departments: t.departments || [],
      sectors: t.sectors || [],
      active: t.active,
      content: t.content,
      quiz: t.quiz,
      passing_score: t.passing_score || 70,
      ai_generated: t.ai_generated,
      topic: t.topic || "",
      level: t.level || "",
    });
    setDialogOpen(true);
  };

  const generateAI = async () => {
    if (!aiForm.topic.trim()) return toast.error("Sujet requis");
    setAiBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-training", { body: aiForm });
      if (error) throw error;
      const t = (data as any)?.training;
      if (!t) throw new Error("Réponse IA vide");
      setForm({
        ...emptyForm,
        title: t.title,
        description: t.description || "",
        category: t.category || "",
        duration_minutes: String(t.duration_minutes || aiForm.duration_minutes),
        content: t.content,
        quiz: t.quiz,
        passing_score: t.quiz?.passing_score || 70,
        ai_generated: true,
        topic: aiForm.topic,
        level: aiForm.level,
        active: true,
        url: "",
        departments: [],
        sectors: [],
      });
      setEditing(null);
      setAiOpen(false);
      setDialogOpen(true);
      toast.success("Formation générée — vérifiez et enregistrez");
    } catch (e: any) {
      toast.error(e?.message || "Échec de la génération");
    } finally { setAiBusy(false); }
  };

  const save = async () => {
    if (!form.title.trim()) { toast.error("Titre requis"); return; }
    if (!form.url.trim() && !form.content && !form.quiz) { toast.error("Renseignez une URL ou un contenu généré"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const payload: any = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      url: form.url.trim() || null,
      duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
      category: form.category.trim() || null,
      departments: form.departments,
      sectors: form.sectors,
      active: form.active,
      content: form.content,
      quiz: form.quiz,
      passing_score: form.passing_score,
      ai_generated: form.ai_generated,
      topic: form.topic || null,
      level: form.level || null,
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
        toAdd.map(tid => ({ process_id: assignTarget.process_id, training_id: tid, assigned_by: user!.id, source: "manual" }))
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

  return (
    <div className="space-y-4">
      <Tabs defaultValue="library">
        <TabsList>
          <TabsTrigger value="library"><GraduationCap className="h-4 w-4 mr-1" />Bibliothèque</TabsTrigger>
          <TabsTrigger value="assign"><Users className="h-4 w-4 mr-1" />Candidats</TabsTrigger>
          <TabsTrigger value="groups"><Layers className="h-4 w-4 mr-1" />Groupes</TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Bibliothèque de formations ({trainings.length})</h3>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Actualiser</Button>
              {!readOnly && (
                <>
                  <Button size="sm" variant="outline" onClick={() => { setAiForm({ topic: "", level: "intermediaire", duration_minutes: 30, num_questions: 5 }); setAiOpen(true); }} className="border-primary text-primary">
                    <Wand2 className="h-4 w-4 mr-1" />Générer avec IA
                  </Button>
                  <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />Ajouter</Button>
                </>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : trainings.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">Aucune formation. Générez-en une avec l'IA ou ajoutez un lien externe.</Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {trainings.map(t => (
                <Card key={t.id} className={`p-4 ${!t.active ? "opacity-60" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h4 className="font-semibold">{t.title}</h4>
                        {t.ai_generated && <Badge variant="outline" className="text-xs border-primary text-primary"><Brain className="h-2.5 w-2.5 mr-1" />IA</Badge>}
                        {t.quiz?.questions?.length > 0 && <Badge variant="outline" className="text-xs"><FileQuestion className="h-2.5 w-2.5 mr-1" />QCM {t.quiz.questions.length}q</Badge>}
                        {!t.active && <Badge variant="outline">Inactif</Badge>}
                        {t.duration_minutes && <Badge variant="outline" className="text-xs">{t.duration_minutes} min</Badge>}
                      </div>
                      {t.description && <p className="text-sm text-muted-foreground line-clamp-2">{t.description}</p>}
                      {(t.departments?.length > 0 || t.sectors?.length > 0) && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(t.departments || []).map(d => <Badge key={`d-${d}`} variant="secondary" className="text-xs">{d}</Badge>)}
                          {(t.sectors || []).map(s => <Badge key={`s-${s}`} variant="outline" className="text-xs">{s}</Badge>)}
                        </div>
                      )}
                      {t.url && (
                        <a href={t.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-2">
                          <ExternalLink className="h-3 w-3" />Lien externe
                        </a>
                      )}
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
        </TabsContent>

        <TabsContent value="assign" className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Assignation aux candidats ({candidates.length})</h3>
          </div>
          {candidates.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">Aucun candidat en onboarding.</Card>
          ) : (
            <div className="grid gap-3">
              {candidates.map(c => (
                <Card key={c.process_id} className="p-4">
                  <div className="flex items-start gap-3 flex-wrap">
                    <div className="flex-1 min-w-[220px]">
                      <div className="font-semibold">{c.candidate_name}</div>
                      <div className="text-xs text-muted-foreground">{c.candidate_email} · {c.job_title || "Poste inconnu"}</div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {c.assigned.length === 0 && <span className="text-xs text-muted-foreground">Aucune formation assignée</span>}
                        {c.assigned.map(a => {
                          const t = trainings.find(x => x.id === a.training_id);
                          const done = a.completed_at;
                          return (
                            <Badge key={a.id} variant={done ? "default" : "outline"} className={done ? "bg-emerald-500" : ""}>
                              {done ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                              {t?.title || "Formation"}
                              {a.source === "auto_department" && <span className="ml-1 text-[9px] opacity-70">auto</span>}
                              {a.source === "group" && <span className="ml-1 text-[9px] opacity-70">groupe</span>}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                    {!readOnly && (
                      <Button size="sm" variant="outline" onClick={() => openAssign(c)}>
                        <Plus className="h-4 w-4 mr-1" />Assigner
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="groups" className="space-y-3">
          <GroupsManager trainings={trainings} candidates={candidates} groups={groups} reload={load} readOnly={readOnly} />
        </TabsContent>
      </Tabs>

      {/* AI Generation dialog */}
      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="bg-gradient-to-r from-primary to-[#007aa3] -m-6 mb-0 p-6 rounded-t-lg">
            <DialogTitle className="text-white flex items-center gap-2"><Wand2 className="h-4 w-4" />Générer une formation avec IA</DialogTitle>
            <DialogDescription className="text-cyan-100 text-xs">Contenu structuré + QCM générés par Gemini 2.5 Flash</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-6">
            <div>
              <Label>Sujet *</Label>
              <Textarea rows={2} value={aiForm.topic} onChange={e => setAiForm({ ...aiForm, topic: e.target.value })}
                placeholder="Ex: Sécurité des données et RGPD pour développeurs" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Niveau</Label>
                <Select value={aiForm.level} onValueChange={v => setAiForm({ ...aiForm, level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debutant">Débutant</SelectItem>
                    <SelectItem value="intermediaire">Intermédiaire</SelectItem>
                    <SelectItem value="avance">Avancé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Durée (min)</Label>
                <Input type="number" min={10} max={180} value={aiForm.duration_minutes}
                  onChange={e => setAiForm({ ...aiForm, duration_minutes: parseInt(e.target.value) || 30 })} />
              </div>
              <div>
                <Label>Questions</Label>
                <Input type="number" min={3} max={15} value={aiForm.num_questions}
                  onChange={e => setAiForm({ ...aiForm, num_questions: parseInt(e.target.value) || 5 })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiOpen(false)} disabled={aiBusy}>Annuler</Button>
            <Button onClick={generateAI} disabled={aiBusy} className="bg-gradient-to-r from-primary to-[#007aa3]">
              {aiBusy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
              Générer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Form dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="bg-gradient-to-r from-primary to-[#007aa3] -m-6 mb-0 p-6 rounded-t-lg">
            <DialogTitle className="text-white">{editing ? "Modifier la formation" : "Nouvelle formation"}</DialogTitle>
            {form.ai_generated && <DialogDescription className="text-cyan-100 text-xs flex items-center gap-1"><Brain className="h-3 w-3" />Générée par IA — vérifiez avant publication</DialogDescription>}
          </DialogHeader>
          <div className="space-y-3 pt-6">
            <div><Label>Titre *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Catégorie</Label><Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></div>
              <div><Label>Durée (min)</Label><Input type="number" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: e.target.value })} /></div>
            </div>
            <div><Label>URL externe (optionnel si contenu généré)</Label><Input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://..." /></div>

            {form.content && (
              <Card className="p-3 bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-semibold mb-2"><BookOpen className="h-4 w-4 text-primary" />Contenu généré</div>
                {form.content.objectives?.length > 0 && (
                  <div className="text-xs mb-2">
                    <span className="font-medium">Objectifs : </span>
                    <span className="text-muted-foreground">{form.content.objectives.join(" · ")}</span>
                  </div>
                )}
                <div className="space-y-1 text-xs">
                  {(form.content.modules || []).map((m: any, i: number) => (
                    <div key={i}>• <span className="font-medium">{m.title}</span> <span className="text-muted-foreground">— {m.key_points?.length || 0} points</span></div>
                  ))}
                </div>
              </Card>
            )}
            {form.quiz?.questions?.length > 0 && (
              <Card className="p-3 bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-semibold mb-2"><FileQuestion className="h-4 w-4 text-primary" />QCM ({form.quiz.questions.length} questions)</div>
                <div className="space-y-2 text-xs max-h-40 overflow-y-auto">
                  {form.quiz.questions.map((q: any, i: number) => (
                    <div key={i} className="p-2 bg-background rounded">
                      <div className="font-medium">{i + 1}. {q.question}</div>
                      <div className="text-muted-foreground mt-0.5">✓ {q.options?.[q.correct_index]}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Label className="text-xs">Score de réussite (%)</Label>
                  <Input type="number" min={0} max={100} className="h-7 w-20"
                    value={form.passing_score} onChange={e => setForm({ ...form, passing_score: parseInt(e.target.value) || 0 })} />
                </div>
              </Card>
            )}

            <MultiCheckField
              label="Départements (auto-assignation aux candidats de ces départements)"
              options={departmentsList}
              selected={form.departments}
              onChange={(next) => setForm({ ...form, departments: next })}
              emptyHint="Aucun département. Créez-les depuis l'onglet Recrutement."
            />
            <MultiCheckField
              label="Secteurs"
              options={sectorsList}
              selected={form.sectors}
              onChange={(next) => setForm({ ...form, sectors: next })}
              emptyHint="Aucun secteur."
            />
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
            <DialogDescription className="text-cyan-100 text-sm">{assignTarget?.candidate_name} · {assignTarget?.job_title}</DialogDescription>
          </DialogHeader>
          <div className="pt-6 space-y-2 max-h-[50vh] overflow-y-auto">
            {trainings.filter(t => t.active).length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune formation active disponible.</p>
            ) : trainings.filter(t => t.active).map(t => {
              const checked = assignSel.has(t.id);
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
                      {t.ai_generated && <Badge variant="outline" className="text-[10px] border-primary text-primary"><Brain className="h-2.5 w-2.5 mr-1" />IA</Badge>}
                      {t.quiz?.questions?.length > 0 && <Badge variant="outline" className="text-[10px]"><FileQuestion className="h-2.5 w-2.5 mr-1" />QCM</Badge>}
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

function MultiCheckField({ label, options, selected, onChange, emptyHint }: {
  label: string; options: string[]; selected: string[]; onChange: (next: string[]) => void; emptyHint?: string;
}) {
  const toggle = (name: string, checked: boolean) => {
    const set = new Set(selected);
    if (checked) set.add(name); else set.delete(name);
    onChange([...set]);
  };
  return (
    <div>
      <Label>{label}</Label>
      {options.length === 0 ? (
        <p className="text-xs text-muted-foreground mt-1">{emptyHint || "Aucune option."}</p>
      ) : (
        <div className="mt-2 max-h-36 overflow-y-auto border rounded-md p-2 grid grid-cols-2 gap-1">
          {options.map((name) => (
            <label key={name} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/40 rounded px-1 py-0.5">
              <Checkbox checked={selected.includes(name)} onCheckedChange={(v) => toggle(name, !!v)} />
              <span className="truncate">{name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================ GROUPS MANAGER ============================ */
function GroupsManager({
  trainings, candidates, groups, reload, readOnly,
}: {
  trainings: Training[]; candidates: CandidateRow[]; groups: Group[]; reload: () => void; readOnly: boolean;
}) {
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [groupTrainingIds, setGroupTrainingIds] = useState<string[]>([]);
  const [newGroup, setNewGroup] = useState({ name: "", description: "" });
  const [createOpen, setCreateOpen] = useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [trainingDialogOpen, setTrainingDialogOpen] = useState(false);

  const loadGroupDetail = useCallback(async (g: Group) => {
    setSelectedGroup(g);
    const [{ data: m }, { data: a }] = await Promise.all([
      supabase.from("training_group_members").select("process_id").eq("group_id", g.id),
      supabase.from("training_group_assignments").select("training_id").eq("group_id", g.id),
    ]);
    setGroupMembers((m || []).map((x: any) => x.process_id));
    setGroupTrainingIds((a || []).map((x: any) => x.training_id));
  }, []);

  const createGroup = async () => {
    if (!newGroup.name.trim()) return toast.error("Nom requis");
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("training_groups").insert({
      name: newGroup.name.trim(), description: newGroup.description.trim() || null, created_by: user!.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Groupe créé");
    setNewGroup({ name: "", description: "" });
    setCreateOpen(false);
    reload();
  };

  const deleteGroup = async (g: Group) => {
    if (!confirm(`Supprimer le groupe "${g.name}" ?`)) return;
    const { error } = await supabase.from("training_groups").delete().eq("id", g.id);
    if (error) return toast.error(error.message);
    setSelectedGroup(null);
    reload();
  };

  const saveMembers = async (next: Set<string>) => {
    if (!selectedGroup) return;
    const { data: { user } } = await supabase.auth.getUser();
    const current = new Set(groupMembers);
    const toAdd = [...next].filter(id => !current.has(id));
    const toRemove = groupMembers.filter(id => !next.has(id));
    if (toAdd.length) {
      const { error } = await supabase.from("training_group_members").insert(
        toAdd.map(pid => ({ group_id: selectedGroup.id, process_id: pid, added_by: user!.id }))
      );
      if (error) return toast.error(error.message);
    }
    if (toRemove.length) {
      const { error } = await supabase.from("training_group_members").delete().eq("group_id", selectedGroup.id).in("process_id", toRemove);
      if (error) return toast.error(error.message);
    }
    toast.success("Membres mis à jour — formations propagées automatiquement");
    setMemberDialogOpen(false);
    loadGroupDetail(selectedGroup);
    reload();
  };

  const saveGroupTrainings = async (next: Set<string>) => {
    if (!selectedGroup) return;
    const { data: { user } } = await supabase.auth.getUser();
    const current = new Set(groupTrainingIds);
    const toAdd = [...next].filter(id => !current.has(id));
    const toRemove = groupTrainingIds.filter(id => !next.has(id));
    if (toAdd.length) {
      const { error } = await supabase.from("training_group_assignments").insert(
        toAdd.map(tid => ({ group_id: selectedGroup.id, training_id: tid, assigned_by: user!.id }))
      );
      if (error) return toast.error(error.message);
    }
    if (toRemove.length) {
      const { error } = await supabase.from("training_group_assignments").delete().eq("group_id", selectedGroup.id).in("training_id", toRemove);
      if (error) return toast.error(error.message);
    }
    toast.success("Formations du groupe mises à jour — propagées aux membres");
    setTrainingDialogOpen(false);
    loadGroupDetail(selectedGroup);
    reload();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Groupes ({groups.length})</h3>
        </div>
        {!readOnly && <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" />Nouveau groupe</Button>}
      </div>

      {groups.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Aucun groupe. Créez-en un pour assigner des formations en masse.</Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {groups.map(g => (
            <Card key={g.id} className={`p-4 cursor-pointer ${selectedGroup?.id === g.id ? "border-primary" : ""}`} onClick={() => loadGroupDetail(g)}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold">{g.name}</h4>
                  {g.description && <p className="text-xs text-muted-foreground line-clamp-2">{g.description}</p>}
                </div>
                {!readOnly && <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); deleteGroup(g); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {selectedGroup && (
        <Card className="p-4 space-y-3 border-primary">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h4 className="font-semibold">{selectedGroup.name}</h4>
            {!readOnly && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setMemberDialogOpen(true)}><UserPlus className="h-3 w-3 mr-1" />Membres ({groupMembers.length})</Button>
                <Button size="sm" variant="outline" onClick={() => setTrainingDialogOpen(true)}><GraduationCap className="h-3 w-3 mr-1" />Formations ({groupTrainingIds.length})</Button>
              </div>
            )}
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <div className="text-xs font-medium mb-1">Membres</div>
              <div className="flex flex-wrap gap-1">
                {groupMembers.length === 0 ? <span className="text-xs text-muted-foreground">Aucun</span> :
                  groupMembers.map(pid => {
                    const c = candidates.find(x => x.process_id === pid);
                    return <Badge key={pid} variant="secondary" className="text-xs">{c?.candidate_name || pid.slice(0, 8)}</Badge>;
                  })}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium mb-1">Formations</div>
              <div className="flex flex-wrap gap-1">
                {groupTrainingIds.length === 0 ? <span className="text-xs text-muted-foreground">Aucune</span> :
                  groupTrainingIds.map(tid => {
                    const t = trainings.find(x => x.id === tid);
                    return <Badge key={tid} variant="outline" className="text-xs">{t?.title || tid.slice(0, 8)}</Badge>;
                  })}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Create group */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader className="bg-gradient-to-r from-primary to-[#007aa3] -m-6 mb-0 p-6 rounded-t-lg">
            <DialogTitle className="text-white">Nouveau groupe</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-6">
            <div><Label>Nom *</Label><Input value={newGroup.name} onChange={e => setNewGroup({ ...newGroup, name: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea rows={3} value={newGroup.description} onChange={e => setNewGroup({ ...newGroup, description: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button onClick={createGroup}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Members picker */}
      <PickerDialog
        open={memberDialogOpen} onClose={() => setMemberDialogOpen(false)}
        title="Membres du groupe"
        items={candidates.map(c => ({ id: c.process_id, label: c.candidate_name, sub: `${c.candidate_email} · ${c.job_title || "—"}` }))}
        initialSelected={new Set(groupMembers)}
        onSave={saveMembers}
      />

      {/* Trainings picker */}
      <PickerDialog
        open={trainingDialogOpen} onClose={() => setTrainingDialogOpen(false)}
        title="Formations du groupe"
        items={trainings.filter(t => t.active).map(t => ({ id: t.id, label: t.title, sub: t.description || "" }))}
        initialSelected={new Set(groupTrainingIds)}
        onSave={saveGroupTrainings}
      />
    </div>
  );
}

function PickerDialog({ open, onClose, title, items, initialSelected, onSave }: {
  open: boolean; onClose: () => void; title: string;
  items: { id: string; label: string; sub?: string }[];
  initialSelected: Set<string>; onSave: (next: Set<string>) => void;
}) {
  const [sel, setSel] = useState<Set<string>>(initialSelected);
  useEffect(() => { setSel(new Set(initialSelected)); /* eslint-disable-next-line */ }, [open]);
  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="bg-gradient-to-r from-primary to-[#007aa3] -m-6 mb-0 p-6 rounded-t-lg">
          <DialogTitle className="text-white">{title}</DialogTitle>
        </DialogHeader>
        <div className="pt-6 space-y-2 max-h-[50vh] overflow-y-auto">
          {items.length === 0 ? <p className="text-sm text-muted-foreground">Aucun élément.</p> :
            items.map(it => (
              <label key={it.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/30 cursor-pointer">
                <Checkbox checked={sel.has(it.id)} onCheckedChange={v => {
                  const n = new Set(sel); if (v) n.add(it.id); else n.delete(it.id); setSel(n);
                }} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{it.label}</div>
                  {it.sub && <p className="text-xs text-muted-foreground line-clamp-1">{it.sub}</p>}
                </div>
              </label>
            ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => onSave(sel)}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
