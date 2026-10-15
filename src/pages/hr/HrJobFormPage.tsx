import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FormSection } from "@/components/ui/form-section";
import { Label } from "@/components/ui/label";
import { Briefcase, FileText, Calendar, Building2, Sparkles, Loader2, Pencil, Plus, ArrowLeft } from "lucide-react";
import { toast as sonnerToast } from "sonner";

const toast = (opts: { title?: string; description?: string; variant?: string }) => {
  const fn = opts.variant === "destructive" ? sonnerToast.error : sonnerToast.success;
  fn(opts.title || "", opts.description ? { description: opts.description } : undefined);
};

type JobStatus = "brouillon" | "publiee" | "fermee";
type ContractType = "CDI" | "CDD" | "Stage" | "Freelance" | "Alternance";

type JobFormState = {
  title: string; department: string; location: string; contract_type: ContractType;
  description: string; closing_date: string; status: JobStatus; sector: string;
  start_date: string; salary_range: string; contract_duration: string; renewable: boolean;
  candidates_sought: string;
};

const EMPTY_JOB_FORM: JobFormState = {
  title: "", department: "", location: "", contract_type: "CDI", description: "",
  closing_date: "", status: "brouillon", sector: "", start_date: "",
  salary_range: "", contract_duration: "", renewable: false, candidates_sought: "1",
};

import { parseCandidatesSought, sanitizeAiText } from "@/lib/job-form";
import JobApplicationsStats from "@/components/hr/JobApplicationsStats";

// Brouillon sauvegardé en continu : survit à un rechargement ou une mise en
// veille de l'onglet. Clé distincte par offre pour ne pas mélanger les brouillons.
const draftKey = (id: string | undefined) => `hr_job_page_draft_${id ?? "new"}`;
type JobDraft = { form: JobFormState; aiPrompt: string };
const readDraft = (id: string | undefined): JobDraft | null => {
  try {
    const raw = sessionStorage.getItem(draftKey(id));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

interface Department { id: string; name: string }
interface Sector { id: string; name: string }

export default function HrJobFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthSession();
  // Retour vers l'espace d'origine : console admin ou portail RH.
  // Admin : onglet "tab", Gestionnaire : onglet "gtab" — les deux sont posés, chaque vue lit le sien.
  const backTo = location.pathname.startsWith("/admin") ? "/admin?tab=hr-recruitment&gtab=hr-recruitment" : "/rh?tab=recruitment";

  const [departments, setDepartments] = useState<Department[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [form, setForm] = useState<JobFormState>(() => {
    const d = readDraft(id);
    return d ? { ...EMPTY_JOB_FORM, ...d.form } : EMPTY_JOB_FORM;
  });
  const [aiPrompt, setAiPrompt] = useState(() => readDraft(id)?.aiPrompt ?? "");
  const [aiAction, setAiAction] = useState<null | "generate" | "improve" | "shorten" | "translate_en">(null);

  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [sectorDialogOpen, setSectorDialogOpen] = useState(false);
  const [newSectorName, setNewSectorName] = useState("");

  // Sauvegarde continue du brouillon.
  useEffect(() => {
    try {
      sessionStorage.setItem(draftKey(id), JSON.stringify({ form, aiPrompt } satisfies JobDraft));
    } catch { /* stockage indisponible : ignorer */ }
  }, [id, form, aiPrompt]);

  useEffect(() => {
    (async () => {
      const [deptsRes, sectorsRes] = await Promise.all([
        supabase.from("departments").select("id, name").order("name", { ascending: true }),
        (supabase as any).from("sectors").select("id, name").order("name", { ascending: true }),
      ]);
      if (deptsRes.data) setDepartments(deptsRes.data as Department[]);
      if (sectorsRes.data) setSectors(sectorsRes.data as Sector[]);

      if (isEdit) {
        // Un brouillon en cours prime sur les données en base (travail non enregistré).
        if (readDraft(id)) { setLoading(false); return; }
        const { data, error } = await supabase.from("job_postings").select("*").eq("id", id).maybeSingle();
        if (error || !data) {
          setNotFound(true);
        } else {
          const j = data as any;
          setForm({
            title: j.title, department: j.department || "", location: j.location,
            contract_type: j.contract_type, description: j.description,
            closing_date: j.closing_date || "", status: j.status, sector: j.sector || "",
            start_date: j.start_date || "", salary_range: j.salary_range || "",
            contract_duration: j.contract_duration || "", renewable: j.renewable || false,
            candidates_sought: String(j.candidates_sought ?? 1),
          });
        }
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const runJobAssistant = async (action: "generate" | "improve" | "shorten" | "translate_en") => {
    if (action !== "generate" && !form.description.trim()) {
      toast({ title: "Description vide", description: "Rédigez ou générez d'abord une description.", variant: "destructive" });
      return;
    }
    setAiAction(action);
    try {
      const { data, error } = await supabase.functions.invoke("hr-job-assistant", {
        body: {
          action,
          instructions: aiPrompt.trim() || undefined,
          context: {
            title: form.title,
            department: form.department,
            sector: form.sector,
            location: form.location,
            contract_type: form.contract_type,
            contract_duration: form.contract_duration,
            start_date: form.start_date,
            salary_range: form.salary_range,
            candidates_sought: parseCandidatesSought(form.candidates_sought),
            description: form.description,
          },
        },
      });
      if (error) throw new Error(error.message);
      const res = (data as any)?.result;
      if (!res?.description) throw new Error("Réponse IA vide");
      const cleaned = sanitizeAiText(res.description);
      const cleanedTitle = res.title_suggestion ? sanitizeAiText(res.title_suggestion).replace(/\n+/g, "").trim() : "";
      setForm((f) => ({
        ...f,
        description: cleaned,
        title: !f.title.trim() && cleanedTitle ? cleanedTitle : f.title,
      }));
      toast({ title: "✓ Description mise à jour par l'IA" });
    } catch (e) {
      toast({ title: "IA indisponible", description: (e as Error).message, variant: "destructive" });
    } finally {
      setAiAction(null);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!form.title.trim() || !form.location.trim() || !form.description.trim()) {
      toast({ title: "Champs requis", description: "Titre, lieu et description sont obligatoires.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      department: form.department.trim() || null,
      location: form.location.trim(),
      contract_type: form.contract_type,
      description: form.description.trim(),
      closing_date: form.closing_date || null,
      status: form.status,
      sector: form.sector.trim() || null,
      start_date: form.start_date.trim() || null,
      salary_range: form.salary_range.trim() || null,
      contract_duration: form.contract_type === "CDD" ? (form.contract_duration.trim() || null) : null,
      renewable: form.contract_type === "CDD" ? form.renewable : false,
      candidates_sought: parseCandidatesSought(form.candidates_sought),
    };
    const res = isEdit
      ? await supabase.from("job_postings").update(payload).eq("id", id)
      : await supabase.from("job_postings").insert({ ...payload, created_by: user.id });
    setSaving(false);
    if (res.error) {
      toast({ title: "Erreur", description: res.error.message, variant: "destructive" });
      return;
    }
    try { sessionStorage.removeItem(draftKey(id)); } catch { /* ignorer */ }
    toast({ title: isEdit ? "Offre modifiée" : "Offre créée" });
    navigate(backTo);
  };

  const handleCancel = () => {
    try { sessionStorage.removeItem(draftKey(id)); } catch { /* ignorer */ }
    navigate(backTo);
  };

  const handleAddDepartment = async () => {
    if (!user || !newDeptName.trim()) return;
    const { error } = await supabase.from("departments").insert({ name: newDeptName.trim(), created_by: user.id });
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    const name = newDeptName.trim();
    setDepartments((p) => [...p, { id: crypto.randomUUID(), name }].sort((a, b) => a.name.localeCompare(b.name)));
    setForm((f) => ({ ...f, department: name }));
    setNewDeptName("");
    setDeptDialogOpen(false);
    toast({ title: "Département ajouté" });
  };

  const handleAddSector = async () => {
    if (!user || !newSectorName.trim()) return;
    const { error } = await (supabase as any).from("sectors").insert({ name: newSectorName.trim(), created_by: user.id });
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    const name = newSectorName.trim();
    setSectors((p) => [...p, { id: crypto.randomUUID(), name }].sort((a, b) => a.name.localeCompare(b.name)));
    setForm((f) => ({ ...f, sector: name }));
    setNewSectorName("");
    setSectorDialogOpen(false);
    toast({ title: "Secteur ajouté" });
  };

  if (loading) {
    return <div className="max-w-3xl mx-auto py-16 text-center text-muted-foreground">Chargement de l'offre…</div>;
  }
  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center space-y-4">
        <p className="text-muted-foreground">Cette offre est introuvable.</p>
        <Button variant="outline" onClick={() => navigate(backTo)}><ArrowLeft size={14} /> Retour aux offres</Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={handleCancel} className="shrink-0"><ArrowLeft size={16} /></Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Briefcase className="text-primary shrink-0" size={20} />
              {isEdit ? "Modifier l'offre" : "Nouvelle offre d'emploi"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isEdit ? "Mettez à jour les informations de l'offre." : "Renseignez le poste, le contrat et la description publique."}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCancel}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-gradient-primary-deep text-primary-foreground shadow-sm hover:opacity-95">
            {saving && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? "Enregistrer" : "Créer l'offre"}
          </Button>
        </div>
      </div>

      {isEdit && id && <JobApplicationsStats jobId={id} sought={parseCandidatesSought(form.candidates_sought) ?? 1} />}

      <FormSection icon={<FileText size={16} />} title="Informations générales" description="Titre, localisation et type de contrat.">
        <div className="space-y-2">
          <Label htmlFor="job-title" required>Titre du poste</Label>
          <Input id="job-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Ingénieur Cloud DevOps" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Département</Label>
            <Select
              value={form.department || "__none__"}
              onValueChange={(v) => {
                if (v === "__add__") { setDeptDialogOpen(true); return; }
                setForm({ ...form, department: v === "__none__" ? "" : v });
              }}
            >
              <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">- Aucun -</SelectItem>
                {departments.map((d) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                <SelectItem value="__add__" className="text-primary font-medium">+ Ajouter un département…</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="job-location" required>Lieu</Label>
            <Input id="job-location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Ex: Conakry / Remote" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="job-candidates">Nombre de candidats recherchés</Label>
          <Input
            id="job-candidates" type="number" min={1} max={999} step={1} inputMode="numeric"
            value={form.candidates_sought}
            onChange={(e) => setForm({ ...form, candidates_sought: e.target.value })}
            onBlur={(e) => setForm({ ...form, candidates_sought: String(parseCandidatesSought(e.target.value)) })}
            placeholder="Ex: 2"
          />
          <p className="text-xs text-muted-foreground">Combien de personnes ce poste doit-il pourvoir ?</p>
        </div>
      </FormSection>

      <FormSection icon={<Calendar size={16} />} title="Contrat & calendrier" description="Type, durée et dates clés.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label required>Type de contrat</Label>
            <Select value={form.contract_type} onValueChange={(v) => setForm({ ...form, contract_type: v as ContractType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["CDI", "CDD", "Stage", "Freelance", "Alternance"] as ContractType[]).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="job-closing">Date de clôture</Label>
            <Input id="job-closing" type="date" value={form.closing_date} onChange={(e) => setForm({ ...form, closing_date: e.target.value })} />
          </div>
        </div>
        {form.contract_type === "CDD" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg border border-primary/20 bg-primary/5 backdrop-blur-sm">
            <div className="space-y-2">
              <Label htmlFor="job-duration" required>Durée du CDD</Label>
              <Input id="job-duration" value={form.contract_duration} onChange={(e) => setForm({ ...form, contract_duration: e.target.value })} placeholder="Ex: 6 mois, 1 an, 24 mois" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none">
                <input type="checkbox" checked={form.renewable} onChange={(e) => setForm({ ...form, renewable: e.target.checked })} className="h-4 w-4 rounded border-input accent-primary" />
                Contrat renouvelable
              </label>
            </div>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="job-start">Date de prise de poste</Label>
          <Input id="job-start" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
        </div>
      </FormSection>

      <FormSection icon={<Building2 size={16} />} title="Secteur & rémunération">
        <div className="space-y-2">
          <Label>Secteur</Label>
          <Select
            value={form.sector || "__none__"}
            onValueChange={(v) => {
              if (v === "__add__") { setSectorDialogOpen(true); return; }
              setForm({ ...form, sector: v === "__none__" ? "" : v });
            }}
          >
            <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">- Aucun -</SelectItem>
              {sectors.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
              <SelectItem value="__add__" className="text-primary font-medium">+ Ajouter un secteur…</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="job-salary">Rémunération</Label>
          <Input id="job-salary" value={form.salary_range} onChange={(e) => setForm({ ...form, salary_range: e.target.value })} placeholder="Ex: Selon profil et expérience - package attractif" />
        </div>
      </FormSection>

      <FormSection icon={<FileText size={16} />} title="Description & publication" description="Détails du poste et visibilité.">
        <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/[0.03] p-4">
          <div className="flex items-start gap-2">
            <div className="h-8 w-8 shrink-0 rounded-md bg-primary/15 text-primary flex items-center justify-center">
              <Sparkles size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Assistant IA RH</p>
              <p className="text-xs text-muted-foreground">Spécialisé en rédaction d'offres IT / Cloud / DevOps. Génère ou améliore la description à partir du contexte saisi.</p>
            </div>
          </div>
          <Textarea
            rows={2} value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Instructions optionnelles : ton, public cible, compétences à mettre en avant…"
            className="text-sm bg-background/60"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => runJobAssistant("generate")} disabled={!!aiAction} className="bg-gradient-primary-deep text-primary-foreground hover:opacity-95">
              {aiAction === "generate" ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              Générer la description
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => runJobAssistant("improve")} disabled={!!aiAction || !form.description.trim()}>
              {aiAction === "improve" ? <Loader2 size={13} className="animate-spin" /> : <Pencil size={13} />}
              Améliorer
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => runJobAssistant("shorten")} disabled={!!aiAction || !form.description.trim()}>
              {aiAction === "shorten" ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
              Raccourcir
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => runJobAssistant("translate_en")} disabled={!!aiAction || !form.description.trim()}>
              {aiAction === "translate_en" ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
              Traduire EN
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="job-desc" required>Description</Label>
          <Textarea
            id="job-desc" rows={10} value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Missions, profil recherché, compétences requises… ou utilisez l'assistant IA ci-dessus."
          />
        </div>
        <div className="space-y-2">
          <Label required>Statut</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as JobStatus })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="brouillon">Brouillon (non visible)</SelectItem>
              <SelectItem value="publiee">Publiée (visible sur Carrières)</SelectItem>
              <SelectItem value="fermee">Fermée</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </FormSection>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={handleCancel}>Annuler</Button>
        <Button onClick={handleSave} disabled={saving} className="bg-gradient-primary-deep text-primary-foreground shadow-sm hover:opacity-95">
          {saving && <Loader2 size={14} className="animate-spin" />}
          {isEdit ? "Enregistrer" : "Créer l'offre"}
        </Button>
      </div>

      <Dialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Building2 size={18} /> Ajouter un département</DialogTitle>
            <DialogDescription>Il sera proposé dans les offres.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <Input value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)} placeholder="Nom (ex: Ingénierie)" />
            <Button size="sm" onClick={handleAddDepartment} disabled={!newDeptName.trim()} className="bg-gradient-primary-deep text-primary-foreground shadow-sm hover:opacity-95 disabled:opacity-50">
              <Plus size={14} /> Ajouter
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={sectorDialogOpen} onOpenChange={setSectorDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Briefcase size={18} /> Ajouter un secteur</DialogTitle>
            <DialogDescription>Il sera proposé dans les offres.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <Input value={newSectorName} onChange={(e) => setNewSectorName(e.target.value)} placeholder="Nom (ex: Banque & Finance)" />
            <Button size="sm" onClick={handleAddSector} disabled={!newSectorName.trim()} className="bg-gradient-primary-deep text-primary-foreground shadow-sm hover:opacity-95 disabled:opacity-50">
              <Plus size={14} /> Ajouter
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
