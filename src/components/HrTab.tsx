import { useEffect, useMemo, useState } from"react";
import { useNavigate } from"react-router-dom";
import { supabase } from"@/integrations/supabase/client";
import { useAuthSession } from"@/hooks/use-auth-session";
import { useUserRoles } from"@/hooks/use-admin";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { Textarea } from"@/components/ui/textarea";
import { Card, CardContent } from"@/components/ui/card";
import { Badge } from"@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from"@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from"@/components/ui/dialog";
import { FormSection } from"@/components/ui/form-section";
import { Label } from"@/components/ui/label";
import { useConfirm } from"@/components/ui/confirm-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from"@/components/ui/tabs";
import EmployeeTrainingManager from"@/components/admin/EmployeeTrainingManager";
import { toast as sonnerToast } from"sonner";

// Adapter: keep legacy `toast({ title, description, variant })` calls while using sonner under the hood.
const toast = (opts: { title?: string; description?: string; variant?: string }) => {
 const fn = opts.variant ==="destructive"? sonnerToast.error : sonnerToast.success;
 fn(opts.title ||"", opts.description ? { description: opts.description } : undefined);
};
import { Briefcase, Plus, Pencil, Trash2, FileText, Download, Calendar, MapPin, RefreshCw, Building2, X, Search, FolderOpen, FolderX, Mail, FileSignature, GraduationCap, Users, Sparkles, Loader2, AlertCircle, TrendingUp, ThumbsUp, ThumbsDown, LayoutDashboard, FileDown, LayoutGrid, List, Eye } from"lucide-react";
import { format } from"date-fns";
import EmailLogTab from"./EmailLogTab";
import OnboardingAdminTab from"./OnboardingAdminTab";
import ContractsTab from"./hr/ContractsTab";
import TrainingsTab from"./hr/TrainingsTab";
import HrDashboardTab from"./hr/HrDashboardTab";
import CandidatesKanban from"./hr/CandidatesKanban";
import { exportCsv } from"@/lib/csv-export";
// Réexporté pour le test existant (src/test/candidates-sought.test.ts).
export { parseCandidatesSought } from"@/lib/job-form";

type JobStatus ="brouillon"|"publiee"|"fermee";
type ContractType ="CDI"|"CDD"|"Stage"|"Freelance"|"Alternance";
type AppStatus ="nouvelle"|"en_revue"|"entretien"|"acceptee"|"refusee";

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
 candidates_sought: number;
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
 cv_path: string;
 cover_letter_path: string | null;
 status: AppStatus;
 notes: string | null;
 created_at: string;
 ai_status?: string | null;
 ai_score?: number | null;
 ai_match_percentage?: number | null;
 ai_summary?: string | null;
 ai_skills?: string[] | null;
 ai_strengths?: string[] | null;
 ai_weaknesses?: string[] | null;
 ai_recommendation?: string | null;
 ai_experience_years?: number | null;
 ai_analyzed_at?: string | null;
 ai_error?: string | null;
}

const STATUS_COLORS: Record<JobStatus, string> = {
 brouillon:"bg-muted text-muted-foreground",
 publiee:"bg-green-500/10 text-green-600",
 fermee:"bg-destructive/10 text-destructive",
};

const APP_STATUS_LABELS: Record<AppStatus, string> = {
 nouvelle:"Nouvelle",
 en_revue:"En revue",
 entretien:"Entretien",
 acceptee:"Acceptée",
 refusee:"Refusée",
};

const APP_STATUS_COLORS: Record<AppStatus, string> = {
 nouvelle:"bg-blue-500/10 text-blue-600",
 en_revue:"bg-amber-500/10 text-amber-600",
 entretien:"bg-purple-500/10 text-purple-600",
 acceptee:"bg-green-500/10 text-green-600",
 refusee:"bg-destructive/10 text-destructive",
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

type HrMainTab ="dashboard"|"recruitment"|"contracts"|"trainings"|"onboarding"|"employee-trainings";

// La création/modification d'offre se fait sur une page dédiée
// (/rh/offres/nouvelle, /rh/offres/:id) : voir src/pages/hr/HrJobFormPage.tsx.

export default function HrTab({ onboardingReadOnly = false, defaultTab, activeTab, onTabChange, offerBasePath = "/rh/offres" }: { onboardingReadOnly?: boolean; defaultTab?: HrMainTab; activeTab?: HrMainTab; onTabChange?: (t: HrMainTab) => void; offerBasePath?: string } = {}) {
 const { user } = useAuthSession();
 const { isAdmin } = useUserRoles();
 // toast is provided by the sonner adapter declared at module scope.
 const { confirm, dialog: confirmDialog } = useConfirm();
 const [jobs, setJobs] = useState<JobPosting[]>([]);
 const [applications, setApplications] = useState<JobApplication[]>([]);
 const [departments, setDepartments] = useState<Department[]>([]);
 const [sectors, setSectors] = useState<Sector[]>([]);
 const [loading, setLoading] = useState(true);
 const navigate = useNavigate();
 const [deptDialogOpen, setDeptDialogOpen] = useState(false);
 const [newDeptName, setNewDeptName] = useState("");
 const [newDeptDesc, setNewDeptDesc] = useState("");
 const [sectorDialogOpen, setSectorDialogOpen] = useState(false);
 const [newSectorName, setNewSectorName] = useState("");
 const [newSectorDesc, setNewSectorDesc] = useState("");
 const [editingSectorId, setEditingSectorId] = useState<string | null>(null);
 const [editSectorName, setEditSectorName] = useState("");
 const [editSectorDesc, setEditSectorDesc] = useState("");
 // Filters – Offres
 const [jobSearch, setJobSearch] = useState("");
 const [jobStatusFilter, setJobStatusFilter] = useState<string>("all");
 const [jobContractFilter, setJobContractFilter] = useState<string>("all");
 const [jobDeptFilter, setJobDeptFilter] = useState<string>("all");
 // Filters – Candidatures
 const [appSearch, setAppSearch] = useState("");
 const [appStatusFilter, setAppStatusFilter] = useState<string>("all");
 const [appJobFilter, setAppJobFilter] = useState<string>("all");
 const [appView, setAppView] = useState<"list"|"kanban">("kanban");
 const setDetailId = (appId: string) => navigate(`${offerBasePath.replace(/\/offres$/, "")}/candidatures/${appId}`);
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
 toast({ title:"Erreur", description: error.message, variant:"destructive"});
 return;
 }
 toast({ title:"Département ajouté"});
 setNewDeptName("");
 setNewDeptDesc("");
 load();
 };

 const handleDeleteDepartment = (id: string) => {
 confirm({
 title:"Supprimer ce département ?",
 description:"Cette action est définitive.",
 variant:"destructive",
 confirmLabel:"Supprimer",
 onConfirm: async () => {
 const { error } = await supabase.from("departments").delete().eq("id", id);
 if (error) {
 toast({ title:"Erreur", description: error.message, variant:"destructive"});
 return;
 }
 load();
 },
 });
 };

 const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
 const [editDeptName, setEditDeptName] = useState("");
 const [editDeptDesc, setEditDeptDesc] = useState("");

 const startEditDepartment = (d: Department) => {
 setEditingDeptId(d.id);
 setEditDeptName(d.name);
 setEditDeptDesc(d.description ||"");
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
 toast({ title:"Erreur", description: error.message, variant:"destructive"});
 return;
 }
 toast({ title:"Département modifié"});
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
 toast({ title:"Erreur", description: error.message, variant:"destructive"});
 return;
 }
 toast({ title:"Secteur ajouté"});
 setNewSectorName("");
 setNewSectorDesc("");
 load();
 };

 const handleDeleteSector = (id: string) => {
 confirm({
 title:"Supprimer ce secteur ?",
 description:"Cette action est définitive.",
 variant:"destructive",
 confirmLabel:"Supprimer",
 onConfirm: async () => {
 const { error } = await (supabase as any).from("sectors").delete().eq("id", id);
 if (error) {
 toast({ title:"Erreur", description: error.message, variant:"destructive"});
 return;
 }
 load();
 },
 });
 };

 const startEditSector = (s: Sector) => {
 setEditingSectorId(s.id);
 setEditSectorName(s.name);
 setEditSectorDesc(s.description ||"");
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
 toast({ title:"Erreur", description: error.message, variant:"destructive"});
 return;
 }
 toast({ title:"Secteur modifié"});
 cancelEditSector();
 load();
 };

 const openNew = () => {
 navigate(`${offerBasePath}/nouvelle`);
 };

 const openEdit = (job: JobPosting) => {
 navigate(`${offerBasePath}/${job.id}`);
 };

 const handleDelete = (id: string) => {
 confirm({
 title:"Supprimer cette offre ?",
 description:"Toutes les candidatures liées seront également supprimées.",
 variant:"destructive",
 confirmLabel:"Supprimer",
 onConfirm: async () => {
 const { error } = await supabase.from("job_postings").delete().eq("id", id);
 if (error) {
 toast({ title:"Erreur", description: error.message, variant:"destructive"});
 return;
 }
 toast({ title:"Offre supprimée"});
 load();
 },
 });
 };

 const updateJobStatus = async (id: string, status: JobStatus) => {
 const { error } = await supabase.from("job_postings").update({ status }).eq("id", id);
 if (error) { toast({ title:"Erreur", description: error.message, variant:"destructive"}); return; }
 setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status } : j)));
 toast({ title:"Statut mis à jour"});
 };

 const [interviewDialogOpen, setInterviewDialogOpen] = useState(false);
 const [interviewApp, setInterviewApp] = useState<JobApplication | null>(null);
 const [interviewMessage, setInterviewMessage] = useState("");

 const updateAppStatus = async (id: string, status: AppStatus) => {
 if (status ==="entretien") {
 const app = applications.find((a) => a.id === id);
 if (app) {
 setInterviewApp(app);
 setInterviewMessage("");
 setInterviewDialogOpen(true);
 return;
 }
 }
 const { error } = await supabase.from("job_applications").update({ status }).eq("id", id);
 if (error) {
 toast({ title:"Erreur", description: error.message, variant:"destructive"});
 return;
 }
 if (status !=="nouvelle") {
 toast({ title:"Statut mis à jour", description:"Le candidat sera notifié par email."});
 }
 load();
 };

 const confirmInterview = async () => {
 if (!interviewApp || !interviewMessage.trim()) {
 toast({ title:"Message requis", description:"Précisez la date, l'heure et le mode (visio/présentiel).", variant:"destructive"});
 return;
 }
 const { error } = await supabase
 .from("job_applications")
 .update({ status:"entretien", interview_message: interviewMessage.trim() } as any)
 .eq("id", interviewApp.id);
 if (error) {
 toast({ title:"Erreur", description: error.message, variant:"destructive"});
 return;
 }
 toast({ title:"Invitation envoyée", description:"Le candidat va recevoir l'invitation par email."});
 setInterviewDialogOpen(false);
 setInterviewApp(null);
 setInterviewMessage("");
 load();
 };

 const downloadFile = async (path: string) => {
 const { data, error } = await supabase.storage.from("cv-applications").createSignedUrl(path, 60);
 if (error || !data) {
 toast({ title:"Erreur", description:"Impossible de télécharger le fichier", variant:"destructive"});
 return;
 }
 window.open(data.signedUrl,"_blank");
 };

 const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
 const analyzeCv = async (app: JobApplication) => {
 setAnalyzingIds((prev) => new Set(prev).add(app.id));
 setApplications((prev) => prev.map((a) => a.id === app.id ? { ...a, ai_status:"processing", ai_error: null } : a));
 const { data, error } = await supabase.functions.invoke("analyze-cv", { body: { application_id: app.id } });
 setAnalyzingIds((prev) => { const n = new Set(prev); n.delete(app.id); return n; });
 if (error || (data as any)?.error) {
 toast({ title:"Analyse échouée", description: error?.message || (data as any)?.error ||"Erreur", variant:"destructive"});
 load();
 return;
 }
 toast({ title:"✓ Analyse terminée"});
 load();
 };


 const extractSharePointUrl = (notes: string | null): string | null => {
 if (!notes) return null;
 const match = notes.match(/https?:\/\/[^\s)]+/i);
 return match ? match[0] : null;
 };

 const handleDeleteSharePointFolder = (app: JobApplication) => {
 confirm({
 title:"Supprimer le dossier SharePoint ?",
 description: `Tous les fichiers de ${app.full_name} seront définitivement supprimés.`,
 variant:"destructive",
 confirmLabel:"Supprimer",
 onConfirm: async () => {
 const parts = app.full_name.trim().split(/\s+/);
 const firstName = parts[0] ||"";
 const lastName = parts.slice(1).join("") || parts[0] ||"";
 const { data, error } = await supabase.functions.invoke("upload-application-files", {
 body: { action:"delete", firstName, lastName, jobId: app.job_id },
 });
 if (error || (data as any)?.error) {
 toast({ title:"Erreur", description: error?.message || (data as any)?.error ||"Suppression échouée", variant:"destructive"});
 return;
 }
 const newNotes = (app.notes ||"").replace(/https?:\/\/[^\s)]+/gi,"").trim() || null;
 await supabase.from("job_applications").update({ notes: newNotes }).eq("id", app.id);
 toast({ title:"Dossier SharePoint supprimé"});
 load();
 },
 });
 };

 const handleOpenSharePointFolder = async (app: JobApplication) => {
 const existing = extractSharePointUrl(app.notes);
 if (existing) { window.open(existing,"_blank"); return; }
 const parts = app.full_name.trim().split(/\s+/);
 const firstName = parts[0] ||"";
 const lastName = parts.slice(1).join("") || parts[0] ||"";
 toast({ title:"Ouverture du dossier SharePoint…"});
 const { data, error } = await supabase.functions.invoke("upload-application-files", {
 body: { action:"get_or_create", firstName, lastName, jobId: app.job_id },
 });
 const webUrl = (data as any)?.folder?.webUrl;
 if (error || (data as any)?.error || !webUrl) {
 toast({ title:"Erreur", description: error?.message || (data as any)?.error ||"Dossier introuvable", variant:"destructive"});
 return;
 }
 // Persist the URL in notes for future fast access
 const newNotes = [(app.notes ||"").trim(), `SharePoint: ${webUrl}`].filter(Boolean).join("\n\n");
 await supabase.from("job_applications").update({ notes: newNotes }).eq("id", app.id);
 window.open(webUrl,"_blank");
 load();
 };

 const filteredJobs = useMemo(() => {
 const q = jobSearch.trim().toLowerCase();
 return jobs.filter((j) => {
 if (q) {
 const haystack = [j.title, j.description, j.location, j.department, j.sector].filter(Boolean).join("").toLowerCase();
 if (!haystack.includes(q)) return false;
 }
 if (jobStatusFilter !=="all"&& j.status !== jobStatusFilter) return false;
 if (jobContractFilter !=="all"&& j.contract_type !== jobContractFilter) return false;
 if (jobDeptFilter !=="all"&& j.department !== jobDeptFilter) return false;
 return true;
 });
 }, [jobs, jobSearch, jobStatusFilter, jobContractFilter, jobDeptFilter]);

 const filteredApps = useMemo(() => {
 const q = appSearch.trim().toLowerCase();
 return applications.filter((a) => {
 const job = jobs.find((j) => j.id === a.job_id);
 if (q) {
 const haystack = [a.full_name, a.email, a.phone, job?.title, job?.location].filter(Boolean).join("").toLowerCase();
 if (!haystack.includes(q)) return false;
 }
 if (appStatusFilter !=="all"&& a.status !== appStatusFilter) return false;
 if (appJobFilter !=="all"&& a.job_id !== appJobFilter) return false;
 return true;
 });
 }, [applications, jobs, appSearch, appStatusFilter, appJobFilter]);

 return (
 <div className="space-y-6">
 <div className="flex items-center justify-between flex-wrap gap-3">
 <div>
 <h1 className="text-2xl font-bold flex items-center gap-2"><Briefcase className="text-primary"/> Ressources Humaines</h1>
 <p className="text-sm text-muted-foreground">Recrutement, contrats, formations et onboarding.</p>
 </div>
 <div className="flex gap-2 flex-wrap">
 <Button variant="outline"size="sm"onClick={load}><RefreshCw size={14} /> Actualiser</Button>
 <Button variant="outline"size="sm"onClick={() => setDeptDialogOpen(true)}><Building2 size={14} /> Départements</Button>
 <Button variant="outline"size="sm"onClick={() => setSectorDialogOpen(true)}><Briefcase size={14} /> Secteurs</Button>
 <Button size="sm"onClick={openNew}><Plus size={14} /> Nouvelle offre</Button>
 </div>
 </div>

 <Tabs value={activeTab ?? defaultTab ??"dashboard"} onValueChange={(v) => onTabChange?.(v as HrMainTab)} defaultValue={activeTab ? undefined : (defaultTab ||"dashboard")}>
 <TabsList className="inline-flex flex-wrap h-auto w-fit max-w-full">
 <TabsTrigger value="dashboard"><LayoutDashboard size={14} className="mr-1"/>Vue d'ensemble</TabsTrigger>
 <TabsTrigger value="recruitment"><Briefcase size={14} className="mr-1"/>Recrutement</TabsTrigger>
 <TabsTrigger value="onboarding"><Users size={14} className="mr-1"/>Onboarding</TabsTrigger>
 <TabsTrigger value="contracts"><FileSignature size={14} className="mr-1"/>Contrats</TabsTrigger>
 <TabsTrigger value="trainings"><GraduationCap size={14} className="mr-1"/>Catalogue formations</TabsTrigger>
 <TabsTrigger value="employee-trainings"><GraduationCap size={14} className="mr-1"/>Formations employés</TabsTrigger>
 </TabsList>

 <TabsContent value="dashboard"className="mt-4">
 <HrDashboardTab />
 </TabsContent>


 <TabsContent value="recruitment"className="mt-4">
 <Tabs defaultValue="jobs">
 <TabsList>
 <TabsTrigger value="jobs">Offres ({jobs.length})</TabsTrigger>
 <TabsTrigger value="applications">Candidatures ({applications.length})</TabsTrigger>
 <TabsTrigger value="email-log"><Mail size={14} className="mr-1"/>Historique des envois</TabsTrigger>
 </TabsList>

 <TabsContent value="jobs"className="space-y-3 mt-4">
 {loading && <p className="text-sm text-muted-foreground">Chargement...</p>}
 {!loading && jobs.length === 0 && (
 <Card><CardContent className="p-8 text-center text-muted-foreground">Aucune offre. Créez la première !</CardContent></Card>
 )}
 {!loading && jobs.length > 0 && (() => {
 const jobDepartments = Array.from(new Set(jobs.map((j) => j.department).filter((d): d is string => !!d))).sort();
 const jobContracts = Array.from(new Set(jobs.map((j) => j.contract_type)));
 const hasJobFilters = !!jobSearch || jobStatusFilter !=="all"|| jobContractFilter !=="all"|| jobDeptFilter !=="all";
 const resetJobFilters = () => { setJobSearch(""); setJobStatusFilter("all"); setJobContractFilter("all"); setJobDeptFilter("all"); };
 return (
 <>
 <div className="p-3 rounded-xl border bg-card/50 backdrop-blur-sm space-y-2.5">
 <div className="relative">
 <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
 <Input placeholder="Rechercher une offre..."value={jobSearch} onChange={(e) => setJobSearch(e.target.value)} className="pl-9 pr-9 h-9"/>
 {jobSearch && (
 <button type="button"onClick={() => setJobSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={14} /></button>
 )}
 </div>
 <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
 <Select value={jobStatusFilter} onValueChange={setJobStatusFilter}>
 <SelectTrigger className="h-9"><SelectValue placeholder="Statut"/></SelectTrigger>
 <SelectContent>
 <SelectItem value="all">Tous les statuts</SelectItem>
 <SelectItem value="brouillon">Brouillon</SelectItem>
 <SelectItem value="publiee">Publiée</SelectItem>
 <SelectItem value="fermee">Fermée</SelectItem>
 </SelectContent>
 </Select>
 <Select value={jobContractFilter} onValueChange={setJobContractFilter}>
 <SelectTrigger className="h-9"><SelectValue placeholder="Contrat"/></SelectTrigger>
 <SelectContent>
 <SelectItem value="all">Tous les contrats</SelectItem>
 {jobContracts.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
 </SelectContent>
 </Select>
 <Select value={jobDeptFilter} onValueChange={setJobDeptFilter}>
 <SelectTrigger className="h-9"><SelectValue placeholder="Département"/></SelectTrigger>
 <SelectContent>
 <SelectItem value="all">Tous les départements</SelectItem>
 {jobDepartments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
 </SelectContent>
 </Select>
 </div>
 <div className="flex items-center justify-between text-xs text-muted-foreground">
 <span>{filteredJobs.length} sur {jobs.length}</span>
 {hasJobFilters && (
 <button type="button"onClick={resetJobFilters} className="text-primary hover:underline font-medium">Réinitialiser</button>
 )}
 </div>
 </div>
 {filteredJobs.length === 0 && (
 <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">Aucune offre ne correspond aux filtres.</CardContent></Card>
 )}
 </>
 );
 })()}
 {filteredJobs.map((job) => {
 const appCount = applications.filter((a) => a.job_id === job.id).length;
 return (
 <Card key={job.id}>
 <CardContent className="p-4">
 <div className="flex items-start justify-between gap-3 flex-wrap">
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <h3 className="font-semibold min-w-0 max-w-full">
 <button
 type="button"
 className="block max-w-full truncate text-left text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
 title="Modifier l'offre"
 onClick={() => openEdit(job)}
 >
 {job.title}
 </button>
 </h3>
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
 {appCount > 0 && <Badge variant="secondary">{appCount} candidature{appCount > 1 ?"s":""}</Badge>}
 </div>
 <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
 <span className="flex items-center gap-1"><MapPin size={12} /> {job.location}</span>
  {job.department && <span>{job.department}</span>}
  <span className="flex items-center gap-1"><Users size={12} /> {job.candidates_sought ?? 1} candidat{(job.candidates_sought ?? 1) > 1 ?"s":""} recherché{(job.candidates_sought ?? 1) > 1 ?"s":""}</span>
 {job.closing_date && <span className="flex items-center gap-1"><Calendar size={12} /> Clôture {format(new Date(job.closing_date),"dd/MM/yyyy")}</span>}
 </div>
 <p className="text-sm mt-2 line-clamp-2 text-muted-foreground">{job.description}</p>
 </div>
 <div className="flex gap-1">
 <Button variant="ghost"size="sm"onClick={() => openEdit(job)}><Pencil size={14} /></Button>
 <Button variant="ghost"size="sm"onClick={() => handleDelete(job.id)} className="text-destructive"><Trash2 size={14} /></Button>
 </div>
 </div>
 </CardContent>
 </Card>
 );
 })}
 </TabsContent>

 <TabsContent value="applications"className="space-y-3 mt-4">
 {!loading && applications.length > 0 && (
 <div className="flex items-center justify-between gap-3 flex-wrap">
 <div className="inline-flex rounded-md border p-0.5 bg-card">
 <button
 type="button" onClick={() => setAppView("kanban")}
 className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${appView ==="kanban"?"bg-primary text-primary-foreground":"text-muted-foreground hover:text-foreground"}`}
 >
 <LayoutGrid size={13} /> Kanban
 </button>
 <button
 type="button" onClick={() => setAppView("list")}
 className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${appView ==="list"?"bg-primary text-primary-foreground":"text-muted-foreground hover:text-foreground"}`}
 >
 <List size={13} /> Liste
 </button>
 </div>
 <Button size="sm"variant="outline"onClick={() => {
 const rows = filteredApps.map(a => {
 const job = jobs.find(j => j.id === a.job_id);
 return {
 tracking_id: (a as any).tracking_id ||"",
 nom: a.full_name,
 email: a.email,
 telephone: a.phone ||"",
 offre: job?.title ||"",
 statut: APP_STATUS_LABELS[a.status],
 score_ia: a.ai_score ??"",
 match_ia: a.ai_match_percentage ??"",
 recommandation_ia: a.ai_recommendation ||"",
 cree_le: format(new Date(a.created_at),"yyyy-MM-dd HH:mm"),
 };
 });
 exportCsv(`candidatures-${format(new Date(),"yyyy-MM-dd")}.csv`, rows);
 }}>
 <FileDown size={14} className="mr-1"/> Exporter CSV
 </Button>
 </div>
 )}
 {loading && <p className="text-sm text-muted-foreground">Chargement...</p>}
 {!loading && applications.length === 0 && (
 <Card><CardContent className="p-8 text-center text-muted-foreground">Aucune candidature reçue.</CardContent></Card>
 )}
 {!loading && applications.length > 0 && (() => {
 const hasAppFilters = !!appSearch || appStatusFilter !=="all"|| appJobFilter !=="all";
 const resetAppFilters = () => { setAppSearch(""); setAppStatusFilter("all"); setAppJobFilter("all"); };
 const jobsWithApps = jobs.filter((j) => applications.some((a) => a.job_id === j.id));
 return (
 <div className="p-3 rounded-xl border bg-card/50 backdrop-blur-sm space-y-2.5">
 <div className="relative">
 <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
 <Input placeholder="Rechercher un candidat (nom, email, offre)..."value={appSearch} onChange={(e) => setAppSearch(e.target.value)} className="pl-9 pr-9 h-9"/>
 {appSearch && (
 <button type="button"onClick={() => setAppSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={14} /></button>
 )}
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
 <Select value={appStatusFilter} onValueChange={setAppStatusFilter}>
 <SelectTrigger className="h-9"><SelectValue placeholder="Statut"/></SelectTrigger>
 <SelectContent>
 <SelectItem value="all">Tous les statuts</SelectItem>
 {(Object.keys(APP_STATUS_LABELS) as AppStatus[]).map((s) => (
 <SelectItem key={s} value={s}>{APP_STATUS_LABELS[s]}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 <Select value={appJobFilter} onValueChange={setAppJobFilter}>
 <SelectTrigger className="h-9"><SelectValue placeholder="Offre"/></SelectTrigger>
 <SelectContent>
 <SelectItem value="all">Toutes les offres</SelectItem>
 {jobsWithApps.map((j) => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}
 </SelectContent>
 </Select>
 </div>
 <div className="flex items-center justify-between text-xs text-muted-foreground">
 <span>{filteredApps.length} sur {applications.length}</span>
 {hasAppFilters && (
 <button type="button"onClick={resetAppFilters} className="text-primary hover:underline font-medium">Réinitialiser</button>
 )}
 </div>
 </div>
 );
 })()}
 {!loading && applications.length > 0 && filteredApps.length === 0 && (
 <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">Aucune candidature ne correspond aux filtres.</CardContent></Card>
 )}
 {!loading && appView ==="kanban"&& filteredApps.length > 0 && (
 <CandidatesKanban
 applications={filteredApps as any}
 jobs={jobs}
 onMove={(id, status) => updateAppStatus(id, status as AppStatus)}
 onOpenDetail={(id) => setDetailId(id)}
 />
 )}
 {appView ==="list"&& filteredApps.map((app) => {
 const job = jobs.find((j) => j.id === app.job_id);
 return (
 <Card key={app.id} className="transition-shadow hover:shadow-md">
 <CardContent className="p-4 space-y-3">
 <div className="flex items-start gap-3">
 <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
 {app.full_name.trim().charAt(0).toUpperCase()}
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <button type="button" onClick={() => setDetailId(app.id)} className="font-semibold capitalize text-left hover:underline focus-visible:underline outline-none">
 {app.full_name}
 </button>
 <Badge className={APP_STATUS_COLORS[app.status]}>{APP_STATUS_LABELS[app.status]}</Badge>
 </div>
 <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 flex-wrap">
 <Briefcase size={12} /> <span className="font-medium text-foreground/80">{job?.title || "Offre supprimée"}</span>
 <span aria-hidden>·</span> {format(new Date(app.created_at), "dd/MM/yyyy HH:mm")}
 </p>
 <div className="text-sm mt-2 flex flex-wrap gap-x-5 gap-y-1 text-foreground/85">
 <a href={`mailto:${app.email}`} className="inline-flex items-center gap-1.5 hover:text-primary"><Mail size={13} className="text-muted-foreground" />{app.email}</a>
 {app.phone && <a href={`tel:${app.phone}`} className="inline-flex items-center gap-1.5 hover:text-primary tabular-nums">📞 {app.phone}</a>}
 {app.linkedin_url && <a href={app.linkedin_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">LinkedIn</a>}
 {app.portfolio_url && <a href={app.portfolio_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">Portfolio</a>}
 </div>
 </div>
 <Select value={app.status} onValueChange={(v) => updateAppStatus(app.id, v as AppStatus)}>
 <SelectTrigger className="w-36 shrink-0" aria-label="Changer la réponse"><SelectValue /></SelectTrigger>
 <SelectContent>
 {(Object.keys(APP_STATUS_LABELS) as AppStatus[]).map((s) => (
 <SelectItem key={s} value={s}>{APP_STATUS_LABELS[s]}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 {(app.ai_analyzed_at || app.ai_status === "processing" || app.ai_status === "error") && (
 <AiAnalysisBlock app={app} />
 )}
 <div className="flex gap-2 flex-wrap items-center pt-3 border-t">
 <Button size="sm" onClick={() => setDetailId(app.id)}>
 <Eye size={14} className="mr-1" /> Détails
 </Button>
 <Button variant="outline" size="sm" onClick={() => downloadFile(app.cv_path)}><FileText size={14} /> CV</Button>
 {app.cover_letter_path && (
 <Button variant="outline" size="sm" onClick={() => downloadFile(app.cover_letter_path!)}><Download size={14} /> Lettre</Button>
 )}
 <Button variant="ghost" size="sm" onClick={() => handleOpenSharePointFolder(app)}>
 <FolderOpen size={14} /> SharePoint
 </Button>
 <Button
 variant="ghost" size="sm" onClick={() => analyzeCv(app)}
 disabled={analyzingIds.has(app.id) || app.ai_status === "processing"}
 >
 {analyzingIds.has(app.id) || app.ai_status === "processing" ? <><Loader2 size={14} className="animate-spin" /> Analyse…</>
 : <><Sparkles size={14} /> {app.ai_analyzed_at ? "Réanalyser" : "Analyser le CV"}</>}
 </Button>
 {isAdmin && (
 <Button variant="ghost" size="sm" className="ml-auto text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDeleteSharePointFolder(app)}>
 <FolderX size={14} /> Supprimer le dossier
 </Button>
 )}
 </div>
 </CardContent>
 </Card>
 );
 })}
 </TabsContent>

 <TabsContent value="email-log"className="mt-4">
 <EmailLogTab />
 </TabsContent>
 </Tabs>
 </TabsContent>

 <TabsContent value="contracts"className="mt-4">
 <ContractsTab readOnly={onboardingReadOnly} />
 </TabsContent>

 <TabsContent value="trainings"className="mt-4">
 <TrainingsTab readOnly={onboardingReadOnly} />
 </TabsContent>

 <TabsContent value="employee-trainings"className="mt-4">
 <EmployeeTrainingManager />
 </TabsContent>


 <TabsContent value="onboarding"className="mt-4">
 <OnboardingAdminTab readOnly={onboardingReadOnly} />
 </TabsContent>
 </Tabs>

 <Dialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen}>
 <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto w-[95vw] sm:w-auto">
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2"><Building2 size={18} /> Gérer les départements</DialogTitle>
 <DialogDescription>Créez, renommez ou supprimez les départements proposés dans les offres.</DialogDescription>
 </DialogHeader>
 <div className="space-y-5 pt-1">
 <FormSection
 icon={<Plus size={16} />}
 title="Ajouter un département" description="Créez une nouvelle catégorie pour vos offres." >
 <div className="space-y-3">
 <Input value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)} placeholder="Nom (ex: Ingénierie)"/>
 <Input value={newDeptDesc} onChange={(e) => setNewDeptDesc(e.target.value)} placeholder="Description (optionnel)"/>
 <Button
 size="sm" onClick={handleAddDepartment}
 disabled={!newDeptName.trim()}
 className="bg-gradient-primary-deep text-primary-foreground shadow-sm hover:opacity-95 disabled:opacity-50" >
 <Plus size={14} /> Ajouter
 </Button>
 </div>
 </FormSection>

 <div className="space-y-2">
 <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
 Départements existants ({departments.length})
 </p>
 <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
 {departments.length === 0 ? (
 <p className="text-sm text-muted-foreground text-center py-6">Aucun département.</p>
 ) : departments.map((d) => (
 <div
 key={d.id}
 className="group p-3 rounded-lg border border-border/60 bg-card/40 backdrop-blur-sm hover:border-primary/40 hover:bg-card/70 transition-all" >
 {editingDeptId === d.id ? (
 <div className="space-y-2">
 <Input value={editDeptName} onChange={(e) => setEditDeptName(e.target.value)} placeholder="Nom"/>
 <Input value={editDeptDesc} onChange={(e) => setEditDeptDesc(e.target.value)} placeholder="Description (optionnel)"/>
 <div className="flex gap-2">
 <Button
 size="sm" onClick={handleUpdateDepartment}
 disabled={!editDeptName.trim()}
 className="bg-gradient-primary-deep text-primary-foreground" >
 Enregistrer
 </Button>
 <Button size="sm"variant="outline"onClick={cancelEditDepartment}>Annuler</Button>
 </div>
 </div>
 ) : (
 <div className="flex items-center justify-between gap-2">
 <div className="min-w-0 flex items-center gap-2.5">
 <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
 <Building2 size={14} />
 </span>
 <div className="min-w-0">
 <p className="text-sm font-medium truncate">{d.name}</p>
 {d.description && <p className="text-xs text-muted-foreground truncate">{d.description}</p>}
 </div>
 </div>
 <div className="flex gap-1 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
 <Button variant="ghost"size="sm"onClick={() => startEditDepartment(d)} aria-label={`Modifier ${d.name}`}>
 <Pencil size={14} />
 </Button>
 <Button variant="ghost"size="sm"onClick={() => handleDeleteDepartment(d.id)} className="text-destructive hover:bg-destructive/10"aria-label={`Supprimer ${d.name}`}>
 <X size={14} />
 </Button>
 </div>
 </div>
 )}
 </div>
 ))}
 </div>
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline"onClick={() => setDeptDialogOpen(false)}>Fermer</Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 <Dialog open={sectorDialogOpen} onOpenChange={setSectorDialogOpen}>
 <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto w-[95vw] sm:w-auto">
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2"><Briefcase size={18} /> Gérer les secteurs</DialogTitle>
 <DialogDescription>Définissez les secteurs d'activité utilisés dans la sélection des offres.</DialogDescription>
 </DialogHeader>
 <div className="space-y-5 pt-1">
 <FormSection
 icon={<Plus size={16} />}
 title="Ajouter un secteur" description="Définissez un nouveau secteur d'activité." >
 <div className="space-y-3">
 <Input value={newSectorName} onChange={(e) => setNewSectorName(e.target.value)} placeholder="Nom (ex: Technologies Cloud)"/>
 <Input value={newSectorDesc} onChange={(e) => setNewSectorDesc(e.target.value)} placeholder="Description (optionnel)"/>
 <Button
 size="sm" onClick={handleAddSector}
 disabled={!newSectorName.trim()}
 className="bg-gradient-primary-deep text-primary-foreground shadow-sm hover:opacity-95 disabled:opacity-50" >
 <Plus size={14} /> Ajouter
 </Button>
 </div>
 </FormSection>

 <div className="space-y-2">
 <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
 Secteurs existants ({sectors.length})
 </p>
 <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
 {sectors.length === 0 ? (
 <p className="text-sm text-muted-foreground text-center py-6">Aucun secteur.</p>
 ) : sectors.map((s) => (
 <div
 key={s.id}
 className="group p-3 rounded-lg border border-border/60 bg-card/40 backdrop-blur-sm hover:border-primary/40 hover:bg-card/70 transition-all" >
 {editingSectorId === s.id ? (
 <div className="space-y-2">
 <Input value={editSectorName} onChange={(e) => setEditSectorName(e.target.value)} placeholder="Nom"/>
 <Input value={editSectorDesc} onChange={(e) => setEditSectorDesc(e.target.value)} placeholder="Description (optionnel)"/>
 <div className="flex gap-2">
 <Button
 size="sm" onClick={handleUpdateSector}
 disabled={!editSectorName.trim()}
 className="bg-gradient-primary-deep text-primary-foreground" >
 Enregistrer
 </Button>
 <Button size="sm"variant="outline"onClick={cancelEditSector}>Annuler</Button>
 </div>
 </div>
 ) : (
 <div className="flex items-center justify-between gap-2">
 <div className="min-w-0 flex items-center gap-2.5">
 <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
 <Briefcase size={14} />
 </span>
 <div className="min-w-0">
 <p className="text-sm font-medium truncate">{s.name}</p>
 {s.description && <p className="text-xs text-muted-foreground truncate">{s.description}</p>}
 </div>
 </div>
 <div className="flex gap-1 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
 <Button variant="ghost"size="sm"onClick={() => startEditSector(s)} aria-label={`Modifier ${s.name}`}>
 <Pencil size={14} />
 </Button>
 <Button variant="ghost"size="sm"onClick={() => handleDeleteSector(s.id)} className="text-destructive hover:bg-destructive/10"aria-label={`Supprimer ${s.name}`}>
 <X size={14} />
 </Button>
 </div>
 </div>
 )}
 </div>
 ))}
 </div>
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline"onClick={() => setSectorDialogOpen(false)}>Fermer</Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 <Dialog open={interviewDialogOpen} onOpenChange={setInterviewDialogOpen}>
 <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto w-[95vw] sm:w-auto">
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2"><Calendar size={18} /> Inviter à un entretien</DialogTitle>
 <DialogDescription>Le candidat recevra l'invitation par email avec votre message personnalisé.</DialogDescription>
 </DialogHeader>
 <div className="space-y-4 pt-1">
 {interviewApp && (
 <div className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-card/60 backdrop-blur-sm">
 <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white text-sm font-semibold">
 {interviewApp.full_name.charAt(0).toUpperCase()}
 </div>
 <div className="min-w-0">
 <p className="text-sm font-semibold truncate">{interviewApp.full_name}</p>
 <p className="text-xs text-muted-foreground truncate">{interviewApp.email}</p>
 </div>
 </div>
 )}
 <FormSection
 icon={<Mail size={16} />}
 title="Message d'invitation" description="Précisez la date, l'heure, le lieu ou le lien visio." >
 <div className="space-y-2">
 <Label htmlFor="interview-msg"required>Contenu de l'email</Label>
 <Textarea
 id="interview-msg" rows={5}
 value={interviewMessage}
 onChange={(e) => setInterviewMessage(e.target.value)}
 placeholder="Ex: Entretien prévu le mardi 30 avril 2026 à 10h00 (GMT) en visioconférence Microsoft Teams. Le lien vous sera envoyé 24h avant." />
 </div>
 </FormSection>
 </div>
 <DialogFooter className="gap-2 pt-2">
 <Button variant="outline"onClick={() => setInterviewDialogOpen(false)}>Annuler</Button>
 <Button
 onClick={confirmInterview}
 className="bg-gradient-primary-deep text-primary-foreground shadow-sm hover:opacity-95" >
 <Mail size={14} /> Envoyer l'invitation
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {confirmDialog}

 </div>
 );
}

const RECO_LABELS: Record<string, { label: string; cls: string; icon: any }> = {
 fortement_recommande: { label:"Fortement recommandé", cls:"bg-emerald-500/10 text-emerald-700 border-emerald-500/30", icon: ThumbsUp },
 recommande: { label:"Recommandé", cls:"bg-green-500/10 text-green-700 border-green-500/30", icon: ThumbsUp },
 a_considerer: { label:"À considérer", cls:"bg-amber-500/10 text-amber-700 border-amber-500/30", icon: AlertCircle },
 non_recommande: { label:"Non recommandé", cls:"bg-destructive/10 text-destructive border-destructive/30", icon: ThumbsDown },
};

function AiAnalysisBlock({ app }: { app: JobApplication }) {
 if (app.ai_status ==="processing") {
 return (
 <div className="mt-3 p-3 rounded-lg border bg-muted/40 flex items-center gap-2 text-sm text-muted-foreground">
 <Loader2 size={14} className="animate-spin text-primary"/> Analyse du CV en cours…
 </div>
 );
 }
 if (app.ai_status ==="error") {
 return (
 <div className="mt-3 p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-sm text-destructive flex items-start gap-2">
 <AlertCircle size={14} className="mt-0.5 shrink-0"/>
 <span>Analyse échouée : {app.ai_error ||"erreur inconnue"}</span>
 </div>
 );
 }
 if (!app.ai_analyzed_at) return null;
 const reco = app.ai_recommendation ? RECO_LABELS[app.ai_recommendation] : null;
 const RecoIcon = reco?.icon || Sparkles;
 const strengths = Array.isArray(app.ai_strengths) ? app.ai_strengths : [];
 const weaknesses = Array.isArray(app.ai_weaknesses) ? app.ai_weaknesses : [];
 const skills = Array.isArray(app.ai_skills) ? app.ai_skills : [];
 const gauge = (label: string, value: number | null | undefined) => {
 if (typeof value !== "number") return null;
 const tone = value >= 70 ? "bg-emerald-500" : value >= 40 ? "bg-amber-500" : "bg-destructive";
 return (
 <div className="min-w-[120px] flex-1">
 <div className="flex items-baseline justify-between text-xs">
 <span className="text-muted-foreground">{label}</span>
 <span className="font-semibold tabular-nums text-foreground">{value}%</span>
 </div>
 <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
 <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
 </div>
 </div>
 );
 };
 return (
 <details className="group mt-1 rounded-lg border bg-muted/30 open:bg-card" open={false}>
 <summary className="list-none cursor-pointer select-none p-3 flex items-center gap-3 flex-wrap [&::-webkit-details-marker]:hidden">
 <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
 <Sparkles size={14} className="text-primary" /> Analyse IA
 </span>
 {reco && (
 <Badge variant="outline" className={reco.cls + " border gap-1"}>
 <RecoIcon size={11} /> {reco.label}
 </Badge>
 )}
 <div className="flex flex-1 gap-4 min-w-[240px]">
 {gauge("Adéquation au poste", app.ai_match_percentage)}
 {gauge("Qualité du CV", app.ai_score)}
 </div>
 <span className="text-xs text-primary font-medium group-open:hidden">Voir le détail</span>
 <span className="text-xs text-primary font-medium hidden group-open:inline">Masquer</span>
 </summary>
 <div className="px-3 pb-3 space-y-3 border-t pt-3">
 {app.ai_summary && <p className="text-sm leading-relaxed text-foreground">{app.ai_summary}</p>}
 {skills.length > 0 && (
 <div className="flex flex-wrap gap-1.5">
 {skills.map((s, i) => (
 <Badge key={i} variant="secondary" className="text-[11px] font-normal">{s}</Badge>
 ))}
 </div>
 )}
 {(strengths.length > 0 || weaknesses.length > 0) && (
 <div className="grid sm:grid-cols-2 gap-3">
 {strengths.length > 0 && (
 <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3">
 <div className="text-xs font-semibold text-emerald-700 mb-1.5 flex items-center gap-1"><ThumbsUp size={12} /> Points forts</div>
 <ul className="text-[13px] space-y-1 list-disc pl-4 text-foreground/85">
 {strengths.map((s, i) => <li key={i}>{s}</li>)}
 </ul>
 </div>
 )}
 {weaknesses.length > 0 && (
 <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-3">
 <div className="text-xs font-semibold text-amber-700 mb-1.5 flex items-center gap-1"><AlertCircle size={12} /> Points d'attention</div>
 <ul className="text-[13px] space-y-1 list-disc pl-4 text-foreground/85">
 {weaknesses.map((s, i) => <li key={i}>{s}</li>)}
 </ul>
 </div>
 )}
 </div>
 )}
 <p className="text-[11px] text-muted-foreground">
 Analysé le {format(new Date(app.ai_analyzed_at), "dd/MM/yyyy HH:mm")} · aide à la décision, à valider par un humain
 </p>
 </div>
 </details>
 );
}

