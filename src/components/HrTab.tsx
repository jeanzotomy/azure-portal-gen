import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, Plus, Pencil, Trash2, FileText, Download, Calendar, MapPin, RefreshCw, Building2, X, Search } from "lucide-react";
import { format } from "date-fns";

type JobStatus = "brouillon" | "publiee" | "fermee";
type ContractType = "CDI" | "CDD" | "Stage" | "Freelance" | "Alternance";
type AppStatus = "nouvelle" | "en_revue" | "entretien" | "acceptee" | "refusee";

interface JobPosting {
  id: string;
  title: string;
  department: string | null;
  location: string;
  contract_type: ContractType;
  description: string;
  closing_date: string | null;
  status: JobStatus;
  sector: string | null;
  start_date: string | null;
  salary_range: string | null;
  contract_duration: string | null;
  renewable: boolean;
  created_at: string;
}

interface JobApplication {
  id: string;
  job_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  years_experience: number | null;
  salary_expectation: string | null;
  cv_path: string;
  cover_letter_path: string | null;
  status: AppStatus;
  notes: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<JobStatus, string> = {
  brouillon: "bg-muted text-muted-foreground",
  publiee: "bg-green-500/10 text-green-600",
  fermee: "bg-destructive/10 text-destructive",
};

const APP_STATUS_LABELS: Record<AppStatus, string> = {
  nouvelle: "Nouvelle",
  en_revue: "En revue",
  entretien: "Entretien",
  acceptee: "Acceptée",
  refusee: "Refusée",
};

const APP_STATUS_COLORS: Record<AppStatus, string> = {
  nouvelle: "bg-blue-500/10 text-blue-600",
  en_revue: "bg-amber-500/10 text-amber-600",
  entretien: "bg-purple-500/10 text-purple-600",
  acceptee: "bg-green-500/10 text-green-600",
  refusee: "bg-destructive/10 text-destructive",
};

interface Department {
  id: string;
  name: string;
  description: string | null;
}

interface Sector {
  id: string;
  name: string;
  description: string | null;
}

export default function HrTab() {
  const { user } = useAuthSession();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<JobPosting | null>(null);
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptDesc, setNewDeptDesc] = useState("");
  const [sectorDialogOpen, setSectorDialogOpen] = useState(false);
  const [newSectorName, setNewSectorName] = useState("");
  const [newSectorDesc, setNewSectorDesc] = useState("");
  const [editingSectorId, setEditingSectorId] = useState<string | null>(null);
  const [editSectorName, setEditSectorName] = useState("");
  const [editSectorDesc, setEditSectorDesc] = useState("");
  const [form, setForm] = useState({
    title: "",
    department: "",
    location: "",
    contract_type: "CDI" as ContractType,
    description: "",
    closing_date: "",
    status: "brouillon" as JobStatus,
    sector: "",
    start_date: "",
    salary_range: "",
    contract_duration: "",
    renewable: false,
  });

  const load = async () => {
    setLoading(true);
    const [jobsRes, appsRes, deptsRes, sectorsRes] = await Promise.all([
      supabase.from("job_postings").select("*").order("created_at", { ascending: false }),
      supabase.from("job_applications").select("*").order("created_at", { ascending: false }),
      supabase.from("departments").select("*").order("name", { ascending: true }),
      (supabase as any).from("sectors").select("*").order("name", { ascending: true }),
    ]);
    if (jobsRes.data) setJobs(jobsRes.data as JobPosting[]);
    if (appsRes.data) setApplications(appsRes.data as JobApplication[]);
    if (deptsRes.data) setDepartments(deptsRes.data as Department[]);
    if (sectorsRes.data) setSectors(sectorsRes.data as Sector[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAddDepartment = async () => {
    if (!user || !newDeptName.trim()) return;
    const { error } = await supabase.from("departments").insert({
      name: newDeptName.trim(),
      description: newDeptDesc.trim() || null,
      created_by: user.id,
    });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Département ajouté" });
    setNewDeptName("");
    setNewDeptDesc("");
    load();
  };

  const handleDeleteDepartment = async (id: string) => {
    if (!confirm("Supprimer ce département ?")) return;
    const { error } = await supabase.from("departments").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    load();
  };

  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editDeptName, setEditDeptName] = useState("");
  const [editDeptDesc, setEditDeptDesc] = useState("");

  const startEditDepartment = (d: Department) => {
    setEditingDeptId(d.id);
    setEditDeptName(d.name);
    setEditDeptDesc(d.description || "");
  };

  const cancelEditDepartment = () => {
    setEditingDeptId(null);
    setEditDeptName("");
    setEditDeptDesc("");
  };

  const handleUpdateDepartment = async () => {
    if (!editingDeptId || !editDeptName.trim()) return;
    const { error } = await supabase
      .from("departments")
      .update({ name: editDeptName.trim(), description: editDeptDesc.trim() || null })
      .eq("id", editingDeptId);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Département modifié" });
    cancelEditDepartment();
    load();
  };

  const handleAddSector = async () => {
    if (!user || !newSectorName.trim()) return;
    const { error } = await (supabase as any).from("sectors").insert({
      name: newSectorName.trim(),
      description: newSectorDesc.trim() || null,
      created_by: user.id,
    });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Secteur ajouté" });
    setNewSectorName("");
    setNewSectorDesc("");
    load();
  };

  const handleDeleteSector = async (id: string) => {
    if (!confirm("Supprimer ce secteur ?")) return;
    const { error } = await (supabase as any).from("sectors").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    load();
  };

  const startEditSector = (s: Sector) => {
    setEditingSectorId(s.id);
    setEditSectorName(s.name);
    setEditSectorDesc(s.description || "");
  };

  const cancelEditSector = () => {
    setEditingSectorId(null);
    setEditSectorName("");
    setEditSectorDesc("");
  };

  const handleUpdateSector = async () => {
    if (!editingSectorId || !editSectorName.trim()) return;
    const { error } = await (supabase as any)
      .from("sectors")
      .update({ name: editSectorName.trim(), description: editSectorDesc.trim() || null })
      .eq("id", editingSectorId);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Secteur modifié" });
    cancelEditSector();
    load();
  };

  const openNew = () => {
    setEditing(null);
    setForm({ title: "", department: "", location: "", contract_type: "CDI", description: "", closing_date: "", status: "brouillon", sector: "", start_date: "", salary_range: "", contract_duration: "", renewable: false });
    setDialogOpen(true);
  };

  const openEdit = (job: JobPosting) => {
    setEditing(job);
    setForm({
      title: job.title,
      department: job.department || "",
      location: job.location,
      contract_type: job.contract_type,
      description: job.description,
      closing_date: job.closing_date || "",
      status: job.status,
      sector: job.sector || "",
      start_date: job.start_date || "",
      salary_range: job.salary_range || "",
      contract_duration: job.contract_duration || "",
      renewable: job.renewable || false,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!form.title.trim() || !form.location.trim() || !form.description.trim()) {
      toast({ title: "Champs requis", description: "Titre, lieu et description sont obligatoires.", variant: "destructive" });
      return;
    }
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
    };
    const res = editing
      ? await supabase.from("job_postings").update(payload).eq("id", editing.id)
      : await supabase.from("job_postings").insert({ ...payload, created_by: user.id });
    if (res.error) {
      toast({ title: "Erreur", description: res.error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing ? "Offre modifiée" : "Offre créée" });
    setDialogOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette offre et toutes ses candidatures ?")) return;
    const { error } = await supabase.from("job_postings").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Offre supprimée" });
    load();
  };

  const updateJobStatus = async (id: string, status: JobStatus) => {
    const { error } = await supabase.from("job_postings").update({ status }).eq("id", id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status } : j)));
    toast({ title: "Statut mis à jour" });
  };

  const updateAppStatus = async (id: string, status: AppStatus) => {
    const { error } = await supabase.from("job_applications").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    load();
  };

  const downloadFile = async (path: string) => {
    const { data, error } = await supabase.storage.from("cv-applications").createSignedUrl(path, 60);
    if (error || !data) {
      toast({ title: "Erreur", description: "Impossible de télécharger le fichier", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Briefcase className="text-primary" /> Recrutement RH</h1>
          <p className="text-sm text-muted-foreground">Gérez les offres d'emploi et les candidatures.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw size={14} /> Actualiser</Button>
          <Button variant="outline" size="sm" onClick={() => setDeptDialogOpen(true)}><Building2 size={14} /> Départements</Button>
          <Button variant="outline" size="sm" onClick={() => setSectorDialogOpen(true)}><Briefcase size={14} /> Secteurs</Button>
          <Button size="sm" onClick={openNew}><Plus size={14} /> Nouvelle offre</Button>
        </div>
      </div>

      <Tabs defaultValue="jobs">
        <TabsList>
          <TabsTrigger value="jobs">Offres ({jobs.length})</TabsTrigger>
          <TabsTrigger value="applications">Candidatures ({applications.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="space-y-3 mt-4">
          {loading && <p className="text-sm text-muted-foreground">Chargement...</p>}
          {!loading && jobs.length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Aucune offre. Créez la première !</CardContent></Card>
          )}
          {jobs.map((job) => {
            const appCount = applications.filter((a) => a.job_id === job.id).length;
            return (
              <Card key={job.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{job.title}</h3>
                        <Select value={job.status} onValueChange={(v) => updateJobStatus(job.id, v as JobStatus)}>
                          <SelectTrigger className={`h-7 w-auto gap-1 px-2 text-xs border-0 ${STATUS_COLORS[job.status]}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="brouillon">Brouillon</SelectItem>
                            <SelectItem value="publiee">Publiée</SelectItem>
                            <SelectItem value="fermee">Fermée</SelectItem>
                          </SelectContent>
                        </Select>
                        <Badge variant="outline">{job.contract_type}</Badge>
                        {appCount > 0 && <Badge variant="secondary">{appCount} candidature{appCount > 1 ? "s" : ""}</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                        <span className="flex items-center gap-1"><MapPin size={12} /> {job.location}</span>
                        {job.department && <span>{job.department}</span>}
                        {job.closing_date && <span className="flex items-center gap-1"><Calendar size={12} /> Clôture {format(new Date(job.closing_date), "dd/MM/yyyy")}</span>}
                      </div>
                      <p className="text-sm mt-2 line-clamp-2 text-muted-foreground">{job.description}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(job)}><Pencil size={14} /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(job.id)} className="text-destructive"><Trash2 size={14} /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="applications" className="space-y-3 mt-4">
          {loading && <p className="text-sm text-muted-foreground">Chargement...</p>}
          {!loading && applications.length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Aucune candidature reçue.</CardContent></Card>
          )}
          {applications.map((app) => {
            const job = jobs.find((j) => j.id === app.job_id);
            return (
              <Card key={app.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{app.full_name}</h3>
                        <Badge className={APP_STATUS_COLORS[app.status]}>{APP_STATUS_LABELS[app.status]}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Pour : <span className="font-medium">{job?.title || "Offre supprimée"}</span> · {format(new Date(app.created_at), "dd/MM/yyyy HH:mm")}
                      </p>
                      <div className="text-sm mt-2 grid sm:grid-cols-2 gap-x-4 gap-y-1">
                        <span>📧 {app.email}</span>
                        {app.phone && <span>📞 {app.phone}</span>}
                        {app.years_experience !== null && <span>💼 {app.years_experience} ans d'expérience</span>}
                        {app.salary_expectation && <span>💰 {app.salary_expectation}</span>}
                        {app.linkedin_url && <a href={app.linkedin_url} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate">🔗 LinkedIn</a>}
                        {app.portfolio_url && <a href={app.portfolio_url} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate">🌐 Portfolio</a>}
                      </div>
                    </div>
                    <Select value={app.status} onValueChange={(v) => updateAppStatus(app.id, v as AppStatus)}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(APP_STATUS_LABELS) as AppStatus[]).map((s) => (
                          <SelectItem key={s} value={s}>{APP_STATUS_LABELS[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 flex-wrap pt-2 border-t">
                    <Button variant="outline" size="sm" onClick={() => downloadFile(app.cv_path)}><FileText size={14} /> CV</Button>
                    {app.cover_letter_path && (
                      <Button variant="outline" size="sm" onClick={() => downloadFile(app.cover_letter_path!)}><Download size={14} /> Lettre de motivation</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="bg-gradient-to-r from-primary to-[#007aa3] text-primary-foreground -m-6 mb-2 p-6 rounded-t-lg">
            <DialogTitle className="text-primary-foreground">{editing ? "Modifier l'offre" : "Nouvelle offre d'emploi"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <label className="text-sm font-medium">Titre du poste *</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Ingénieur Cloud DevOps" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Département</label>
                <Select value={form.department || "__none__"} onValueChange={(v) => setForm({ ...form, department: v === "__none__" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Aucun —</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {departments.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">Aucun département. <button type="button" className="text-primary hover:underline" onClick={() => setDeptDialogOpen(true)}>Créer</button></p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Lieu *</label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Ex: Conakry / Remote" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Type de contrat *</label>
                <Select value={form.contract_type} onValueChange={(v) => setForm({ ...form, contract_type: v as ContractType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["CDI", "CDD", "Stage", "Freelance", "Alternance"] as ContractType[]).map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Date de clôture</label>
                <Input type="date" value={form.closing_date} onChange={(e) => setForm({ ...form, closing_date: e.target.value })} />
              </div>
            </div>
            {form.contract_type === "CDD" && (
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border bg-muted/30">
                <div>
                  <label className="text-sm font-medium">Durée du CDD *</label>
                  <Input
                    value={form.contract_duration}
                    onChange={(e) => setForm({ ...form, contract_duration: e.target.value })}
                    placeholder="Ex: 6 mois, 1 an, 24 mois"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.renewable}
                      onChange={(e) => setForm({ ...form, renewable: e.target.checked })}
                      className="h-4 w-4 rounded border-input accent-primary"
                    />
                    Contrat renouvelable
                  </label>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Secteur</label>
                <Select value={form.sector || "__none__"} onValueChange={(v) => setForm({ ...form, sector: v === "__none__" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Aucun —</SelectItem>
                    {sectors.map((s) => (
                      <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {sectors.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">Aucun secteur. <button type="button" className="text-primary hover:underline" onClick={() => setSectorDialogOpen(true)}>Créer</button></p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Date de prise de poste</label>
                <Input value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} placeholder="Ex: Dès que possible" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Rémunération</label>
              <Input value={form.salary_range} onChange={(e) => setForm({ ...form, salary_range: e.target.value })} placeholder="Ex: Selon profil et expérience — package attractif" />
            </div>
            <div>
              <label className="text-sm font-medium">Description *</label>
              <Textarea rows={6} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Missions, profil recherché, compétences requises..." />
            </div>
            <div>
              <label className="text-sm font-medium">Statut *</label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as JobStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="brouillon">Brouillon (non visible)</SelectItem>
                  <SelectItem value="publiee">Publiée (visible sur Carrières)</SelectItem>
                  <SelectItem value="fermee">Fermée</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave}>{editing ? "Enregistrer" : "Créer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="bg-gradient-to-r from-primary to-[#007aa3] text-primary-foreground -m-6 mb-2 p-6 rounded-t-lg">
            <DialogTitle className="text-primary-foreground flex items-center gap-2"><Building2 size={18} /> Gérer les départements</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
              <p className="text-sm font-medium">Ajouter un département</p>
              <Input value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)} placeholder="Nom (ex: Ingénierie)" />
              <Input value={newDeptDesc} onChange={(e) => setNewDeptDesc(e.target.value)} placeholder="Description (optionnel)" />
              <Button size="sm" onClick={handleAddDepartment} disabled={!newDeptName.trim()}>
                <Plus size={14} /> Ajouter
              </Button>
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {departments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Aucun département.</p>
              ) : departments.map((d) => (
                <div key={d.id} className="p-2 rounded border hover:bg-muted/50">
                  {editingDeptId === d.id ? (
                    <div className="space-y-2">
                      <Input value={editDeptName} onChange={(e) => setEditDeptName(e.target.value)} placeholder="Nom" />
                      <Input value={editDeptDesc} onChange={(e) => setEditDeptDesc(e.target.value)} placeholder="Description (optionnel)" />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleUpdateDepartment} disabled={!editDeptName.trim()}>Enregistrer</Button>
                        <Button size="sm" variant="outline" onClick={cancelEditDepartment}>Annuler</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{d.name}</p>
                        {d.description && <p className="text-xs text-muted-foreground truncate">{d.description}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => startEditDepartment(d)}>
                          <Pencil size={14} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteDepartment(d.id)} className="text-destructive">
                          <X size={14} />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeptDialogOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sectorDialogOpen} onOpenChange={setSectorDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="bg-gradient-to-r from-primary to-[#007aa3] text-primary-foreground -m-6 mb-2 p-6 rounded-t-lg">
            <DialogTitle className="text-primary-foreground flex items-center gap-2"><Briefcase size={18} /> Gérer les secteurs</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
              <p className="text-sm font-medium">Ajouter un secteur</p>
              <Input value={newSectorName} onChange={(e) => setNewSectorName(e.target.value)} placeholder="Nom (ex: Technologies Cloud)" />
              <Input value={newSectorDesc} onChange={(e) => setNewSectorDesc(e.target.value)} placeholder="Description (optionnel)" />
              <Button size="sm" onClick={handleAddSector} disabled={!newSectorName.trim()}>
                <Plus size={14} /> Ajouter
              </Button>
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {sectors.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Aucun secteur.</p>
              ) : sectors.map((s) => (
                <div key={s.id} className="p-2 rounded border hover:bg-muted/50">
                  {editingSectorId === s.id ? (
                    <div className="space-y-2">
                      <Input value={editSectorName} onChange={(e) => setEditSectorName(e.target.value)} placeholder="Nom" />
                      <Input value={editSectorDesc} onChange={(e) => setEditSectorDesc(e.target.value)} placeholder="Description (optionnel)" />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleUpdateSector} disabled={!editSectorName.trim()}>Enregistrer</Button>
                        <Button size="sm" variant="outline" onClick={cancelEditSector}>Annuler</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{s.name}</p>
                        {s.description && <p className="text-xs text-muted-foreground truncate">{s.description}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => startEditSector(s)}>
                          <Pencil size={14} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteSector(s.id)} className="text-destructive">
                          <X size={14} />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSectorDialogOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
