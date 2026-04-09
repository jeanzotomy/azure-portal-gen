import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useUserRoles } from "@/hooks/use-admin";
import { Progress } from "@/components/ui/progress";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
const logo = "/favicon.png";
import {
  LayoutDashboard, FolderOpen, LifeBuoy, User, LogOut, Send, Clock, CheckCircle2, AlertCircle,
  Menu, Bell, Search, Filter, Upload, X, FileText, DollarSign, Calendar, Cpu, Flag, Pencil, Shield,
} from "lucide-react";
import type { User as SupaUser } from "@supabase/supabase-js";

type Tab = "dashboard" | "projects" | "tickets" | "profile";

function PortalContent() {
  const [user, setUser] = useState<SupaUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("dashboard");
  const navigate = useNavigate();
  const { isAdmin, isAgent } = useUserRoles();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session?.user) navigate("/auth");
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session?.user) navigate("/auth");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Chargement...</div>;
  if (!user) return null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const navItems: { id: Tab; icon: typeof LayoutDashboard; label: string }[] = [
    { id: "dashboard", icon: LayoutDashboard, label: "Tableau de bord" },
    { id: "projects", icon: FolderOpen, label: "Projets" },
    { id: "tickets", icon: LifeBuoy, label: "Support" },
    { id: "profile", icon: User, label: "Profil" },
  ];

  return (
    <div className="min-h-screen flex w-full bg-background">
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">
        <SidebarContent className="bg-sidebar">
          <div className="px-4 py-5 border-b border-sidebar-border">
            <Link to="/" className="flex items-center gap-2">
              <img src={logo} alt="CloudMature" className="h-8 w-8" />
              {!collapsed && <span className="font-bold text-sidebar-foreground">CloudMature</span>}
            </Link>
          </div>

          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => setTab(item.id)}
                      isActive={tab === item.id}
                      tooltip={item.label}
                      className="gap-3"
                    >
                      <item.icon size={18} />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <div className="mt-auto p-3 border-t border-sidebar-border space-y-1">
            {(isAdmin || isAgent) && (
              <SidebarMenuButton onClick={() => navigate("/admin")} tooltip={isAdmin ? "Administration" : "Espace Agent"} className="gap-3 text-primary">
                <Shield size={18} />
                <span>{isAdmin ? "Administration" : "Espace Agent"}</span>
              </SidebarMenuButton>
            )}
            <SidebarMenuButton onClick={handleLogout} tooltip="Déconnexion" className="text-destructive hover:text-destructive gap-3">
              <LogOut size={18} />
              <span>Déconnexion</span>
            </SidebarMenuButton>
          </div>
        </SidebarContent>
      </Sidebar>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-14 flex items-center justify-between border-b border-border bg-card px-4">
          <div className="flex items-center gap-3">
            <SidebarTrigger />
            <h2 className="text-sm font-semibold text-card-foreground hidden sm:block">
              {navItems.find(n => n.id === tab)?.label}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {(isAdmin || isAgent) && (
              <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium flex items-center gap-1 cursor-pointer hover:bg-primary/20 transition-colors" onClick={() => navigate("/admin")}>
                <Shield size={12} /> {isAdmin ? "Admin" : "Agent"}
              </span>
            )}
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <Bell size={18} />
            </Button>
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
              {(user.user_metadata?.full_name || user.email || "U").charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          {tab === "dashboard" && <DashboardTab user={user} />}
          {tab === "projects" && <ProjectsTab user={user} />}
          {tab === "tickets" && <TicketsTab user={user} />}
          {tab === "profile" && <ProfileTab user={user} />}
        </main>
      </div>
    </div>
  );
}

export default function PortalPage() {
  return (
    <SidebarProvider>
      <PortalContent />
    </SidebarProvider>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof FolderOpen; label: string; value: number; color: string }) {
  return (
    <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 hover:shadow-card-hover transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-primary-foreground" />
        </div>
      </div>
      <p className="text-3xl font-bold text-card-foreground">{value}</p>
    </div>
  );
}

function DashboardTab({ user }: { user: SupaUser }) {
  const [projects, setProjects] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("projects").select("*").then(({ data }) => setProjects(data || []));
    supabase.from("support_tickets").select("*").order("created_at", { ascending: false }).limit(5).then(({ data }) => setTickets(data || []));
  }, []);

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Bienvenue, {user.user_metadata?.full_name || user.email?.split("@")[0]} 👋</h1>
        <p className="text-muted-foreground mt-1">Voici un aperçu de votre espace client.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={FolderOpen} label="Projets actifs" value={projects.filter(p => p.status === "en_cours").length} color="gradient-primary" />
        <StatCard icon={LifeBuoy} label="Tickets ouverts" value={tickets.filter(t => t.status === "ouvert").length} color="bg-accent" />
        <StatCard icon={CheckCircle2} label="Projets complétés" value={projects.filter(p => p.status === "termine").length} color="bg-teal-600" />
      </div>

      {projects.length > 0 && (
        <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
          <h3 className="font-semibold text-card-foreground mb-4">Projets récents</h3>
          <div className="space-y-4">
            {projects.slice(0, 3).map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-card-foreground truncate">{p.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{p.description}</p>
                </div>
                <div className="w-32 flex-shrink-0">
                  <Progress value={p.progress} className="h-2" />
                  <p className="text-xs text-muted-foreground text-right mt-1">{p.progress}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tickets.length > 0 && (
        <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
          <h3 className="font-semibold text-card-foreground mb-4">Derniers tickets</h3>
          <div className="space-y-3">
            {tickets.slice(0, 3).map((t) => (
              <div key={t.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-card-foreground text-sm">{t.subject}</p>
                  <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString("fr-CA")}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  t.status === "ouvert" ? "bg-primary/10 text-primary" : t.status === "en_cours" ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"
                }`}>{t.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {projects.length === 0 && tickets.length === 0 && (
        <div className="bg-card rounded-xl p-12 shadow-card border border-border/50 text-center">
          <LayoutDashboard size={48} className="mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Aucun projet ou ticket pour le moment.</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Votre équipe CloudMature ajoutera vos projets ici.</p>
        </div>
      )}
    </div>
  );
}

function ProjectsTab({ user }: { user: SupaUser }) {
  const [projects, setProjects] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const serviceOptions = [
    "Stratégie & Adoption Cloud",
    "Optimisation FinOps",
    "Gouvernance & Sécurité",
    "Architecture & Ingénierie",
    "Migration Cloud",
    "Formation & Coaching",
    "Infogérance & Support",
    "Adoption & Maturité IA",
  ];

  const toggleService = (service: string) => {
    setSelectedServices(prev =>
      prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]
    );
  };
  const [priority, setPriority] = useState("normal");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const loadProjects = () => {
    supabase.from("projects").select("*").order("created_at", { ascending: false }).then(({ data }) => setProjects(data || []));
  };

  useEffect(() => { loadProjects(); }, []);

  const resetForm = () => {
    setName(""); setDescription(""); setBudget(""); setDeadline(""); setSelectedServices([]); setPriority("normal"); setFiles([]);
    setEditingProject(null);
  };

  const openNewForm = () => { resetForm(); setShowForm(true); };

  const openEditForm = (p: any) => {
    setEditingProject(p);
    setName(p.name || "");
    setDescription(p.description || "");
    setBudget(p.budget || "");
    setDeadline(p.deadline || "");
    setSelectedServices(p.technologies ? p.technologies.split(", ") : []);
    setPriority(p.priority || "normal");
    setFiles([]);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeForm = () => { setShowForm(false); resetForm(); };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => setFiles(prev => prev.filter((_, i) => i !== index));

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const uploadFiles = async (projectId: string) => {
    for (const file of files) {
      const filePath = `${user.id}/${projectId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("project-files").upload(filePath, file);
      if (!uploadError) {
        await supabase.from("project_files").insert({
          project_id: projectId, user_id: user.id, file_name: file.name,
          file_path: filePath, file_size: file.size, file_type: file.type,
        });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      budget: budget.trim() || null,
      deadline: deadline.trim() || null,
      technologies: selectedServices.length > 0 ? selectedServices.join(", ") : null,
      priority,
    };

    if (editingProject) {
      const { error } = await supabase.from("projects").update(payload).eq("id", editingProject.id);
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); setSubmitting(false); return; }
      if (files.length > 0) await uploadFiles(editingProject.id);
      toast({ title: "Projet modifié!", description: "Les modifications ont été enregistrées." });
    } else {
      const { data: project, error } = await supabase.from("projects").insert({ user_id: user.id, ...payload }).select().single();
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); setSubmitting(false); return; }
      if (files.length > 0 && project) await uploadFiles(project.id);
      toast({ title: "Projet soumis!", description: "Votre projet a été envoyé avec succès." });
    }

    closeForm();
    loadProjects();
    setSubmitting(false);
  };

  const statusConfig: Record<string, { label: string; icon: typeof Clock; color: string; bg: string }> = {
    en_cours: { label: "En cours", icon: Clock, color: "text-primary", bg: "bg-primary/10" },
    termine: { label: "Terminé", icon: CheckCircle2, color: "text-teal-600", bg: "bg-teal-600/10" },
    en_attente: { label: "En attente", icon: AlertCircle, color: "text-muted-foreground", bg: "bg-muted" },
  };

  const priorityOptions = [
    { value: "normal", label: "Normal" },
    { value: "haute", label: "Haute" },
    { value: "urgent", label: "Urgent" },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Mes Projets</h1>
        <Button onClick={() => showForm ? closeForm() : openNewForm()} className="gradient-primary text-primary-foreground border-0">
          {showForm ? "Annuler" : <><Send size={16} className="mr-2" /> Soumettre un projet</>}
        </Button>
      </div>

      {showForm && (
        <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
          <h3 className="font-semibold text-card-foreground mb-4">{editingProject ? "Modifier le projet" : "Nouveau projet"}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-card-foreground flex items-center gap-1.5 mb-1.5"><FileText size={14} /> Nom du projet *</label>
              <Input placeholder="Ex: Refonte du site web" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-card-foreground flex items-center gap-1.5 mb-1.5"><FileText size={14} /> Description</label>
              <Textarea placeholder="Décrivez votre projet, vos besoins et objectifs..." rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-card-foreground flex items-center gap-1.5 mb-1.5"><DollarSign size={14} /> Budget estimé</label>
                <Input placeholder="Ex: 5000 - 10000 $" value={budget} onChange={(e) => setBudget(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-card-foreground flex items-center gap-1.5 mb-1.5"><Calendar size={14} /> Délai souhaité</label>
                <Input placeholder="Ex: 3 mois, Janvier 2025" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-card-foreground flex items-center gap-1.5 mb-1.5"><Cpu size={14} /> Services souhaités</label>
              <div className="flex flex-wrap gap-2">
                {serviceOptions.map((service) => (
                  <button type="button" key={service} onClick={() => toggleService(service)}
                    className={`text-sm px-3 py-1.5 rounded-lg transition-colors border ${selectedServices.includes(service) ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border hover:bg-muted/80"}`}
                  >{service}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-card-foreground flex items-center gap-1.5 mb-1.5"><Flag size={14} /> Priorité</label>
              <div className="flex gap-2">
                {priorityOptions.map((opt) => (
                  <button type="button" key={opt.value} onClick={() => setPriority(opt.value)}
                    className={`text-sm px-4 py-2 rounded-lg transition-colors border ${priority === opt.value ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border hover:bg-muted/80"}`}
                  >{opt.label}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-card-foreground flex items-center gap-1.5 mb-1.5"><Upload size={14} /> Fichiers joints</label>
              <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors">
                <Upload size={24} className="mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Cliquez pour ajouter des fichiers</p>
                <p className="text-xs text-muted-foreground/60 mt-1">PDF, images, documents — max 20 Mo par fichier</p>
              </div>
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
              {files.length > 0 && (
                <div className="mt-3 space-y-2">
                  {files.map((file, i) => (
                    <div key={i} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText size={16} className="text-muted-foreground flex-shrink-0" />
                        <span className="text-sm text-card-foreground truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">{formatFileSize(file.size)}</span>
                      </div>
                      <button type="button" onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive ml-2"><X size={16} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button type="submit" className="gradient-primary text-primary-foreground border-0" disabled={submitting}>
              <Send size={16} className="mr-2" /> {submitting ? "Envoi en cours..." : editingProject ? "Enregistrer les modifications" : "Soumettre le projet"}
            </Button>
          </form>
        </div>
      )}

      {projects.length === 0 && !showForm ? (
        <div className="bg-card rounded-xl p-12 shadow-card border border-border/50 text-center">
          <FolderOpen size={48} className="mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Aucun projet pour le moment.</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Soumettez votre premier projet ci-dessus.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((p) => {
            const sc = statusConfig[p.status] || statusConfig.en_cours;
            return (
              <div key={p.id} className="bg-card rounded-xl p-6 shadow-card border border-border/50 hover:shadow-card-hover transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-card-foreground">{p.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{p.description}</p>
                    {(p.budget || p.deadline || p.technologies) && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {p.budget && <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">💰 {p.budget}</span>}
                        {p.deadline && <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">📅 {p.deadline}</span>}
                        {p.technologies && <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">⚙️ {p.technologies}</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex items-start gap-2">
                    <button onClick={() => openEditForm(p)} className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Modifier">
                      <Pencil size={16} />
                    </button>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${sc.color} ${sc.bg}`}>
                        <sc.icon size={12} /> {sc.label}
                      </span>
                      {p.priority && p.priority !== "normal" && (
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${p.priority === "urgent" ? "bg-destructive/10 text-destructive" : "bg-orange-100 text-orange-600"}`}>{p.priority}</span>
                      )}
                    </div>
                  </div>
                </div>
                <Progress value={p.progress} className="h-2" />
                <p className="text-xs text-muted-foreground text-right mt-1.5">{p.progress}% complété</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TicketsTab({ user }: { user: SupaUser }) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, any[]>>({});
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const { toast } = useToast();

  const loadTickets = () => {
    supabase.from("support_tickets").select("*").order("created_at", { ascending: false }).then(({ data }) => setTickets(data || []));
  };

  const loadReplies = async (ticketId: string) => {
    const { data } = await supabase.from("ticket_replies").select("*").eq("ticket_id", ticketId).order("created_at", { ascending: true });
    setReplies(prev => ({ ...prev, [ticketId]: data || [] }));
  };

  useEffect(() => { loadTickets(); }, []);

  const toggleExpand = (ticketId: string) => {
    if (expandedId === ticketId) {
      setExpandedId(null);
    } else {
      setExpandedId(ticketId);
      loadReplies(ticketId);
    }
    setReplyText("");
  };

  const sendReply = async (ticketId: string) => {
    if (!replyText.trim()) return;
    setSendingReply(true);
    const { error } = await supabase.from("ticket_replies").insert({
      ticket_id: ticketId,
      user_id: user.id,
      message: replyText.trim(),
      is_admin: false,
    });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Réponse envoyée!" });
      setReplyText("");
      loadReplies(ticketId);
    }
    setSendingReply(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    const { error } = await supabase.from("support_tickets").insert({ user_id: user.id, subject, message });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Ticket créé!", description: "Notre équipe vous répondra rapidement." });
      setSubject(""); setMessage("");
      loadTickets();
    }
    setSending(false);
  };

  const filtered = filter === "all" ? tickets : tickets.filter(t => t.status === filter);

  return (
    <div className="space-y-6 animate-fade-up">
      <h1 className="text-2xl font-bold text-foreground">Support</h1>

      <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
        <h3 className="font-semibold text-card-foreground mb-4">Nouveau ticket</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input placeholder="Sujet" required value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Textarea placeholder="Décrivez votre problème..." required rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
          <Button type="submit" className="gradient-primary text-primary-foreground border-0" disabled={sending}>
            <Send size={16} className="mr-2" /> {sending ? "Envoi..." : "Envoyer"}
          </Button>
        </form>
      </div>

      <div className="flex items-center gap-2">
        <Filter size={16} className="text-muted-foreground" />
        {["all", "ouvert", "en_cours", "résolu"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f === "all" ? "Tous" : f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((t) => {
          const isExpanded = expandedId === t.id;
          const ticketReplies = replies[t.id] || [];

          return (
            <div key={t.id} className="bg-card rounded-xl shadow-card border border-border/50 hover:shadow-card-hover transition-shadow">
              <div className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-card-foreground">{t.subject}</h4>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      t.priority === "urgent" ? "bg-destructive/10 text-destructive" : t.priority === "haute" ? "bg-orange-100 text-orange-600" : "bg-muted text-muted-foreground"
                    }`}>{t.priority}</span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      t.status === "ouvert" ? "bg-primary/10 text-primary" : t.status === "en_cours" ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"
                    }`}>{t.status}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{t.message}</p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground/60">{new Date(t.created_at).toLocaleDateString("fr-CA")}</p>
                  <button onClick={() => toggleExpand(t.id)} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <LifeBuoy size={14} />
                    {isExpanded ? "Masquer" : "Voir la conversation"}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-border/50 p-5 bg-muted/20 rounded-b-xl space-y-4">
                  {ticketReplies.length > 0 ? (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {ticketReplies.map((r) => (
                        <div key={r.id} className={`flex ${r.is_admin ? "justify-start" : "justify-end"}`}>
                          <div className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                            r.is_admin
                              ? "bg-primary/10 border border-primary/20 text-card-foreground rounded-bl-sm"
                              : "bg-primary text-primary-foreground rounded-br-sm"
                          }`}>
                            <p className="text-sm">{r.message}</p>
                            <p className={`text-[10px] mt-1 ${r.is_admin ? "text-primary" : "text-primary-foreground/60"}`}>
                              {r.is_admin ? "CloudMature" : "Vous"} · {new Date(r.created_at).toLocaleString("fr-CA")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-2">Aucune réponse pour le moment.</p>
                  )}

                  {t.status !== "résolu" && (
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Écrire une réponse..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={2}
                        className="flex-1"
                      />
                      <Button
                        onClick={() => sendReply(t.id)}
                        disabled={sendingReply || !replyText.trim()}
                        className="gradient-primary text-primary-foreground border-0 self-end"
                        size="sm"
                      >
                        <Send size={14} />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">Aucun ticket trouvé.</div>
        )}
      </div>
    </div>
  );
}

function ProfileTab({ user }: { user: SupaUser }) {
  const [profile, setProfile] = useState({ full_name: "", company: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase.from("profiles").select("*").eq("user_id", user.id).single().then(({ data }) => {
      if (data) setProfile({ full_name: data.full_name || "", company: data.company || "", phone: data.phone || "" });
    });
  }, [user.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("profiles").update(profile).eq("user_id", user.id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else toast({ title: "Profil mis à jour!" });
    setSaving(false);
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <h1 className="text-2xl font-bold text-foreground">Mon Profil</h1>

      <div className="flex items-center gap-4 bg-card rounded-xl p-6 shadow-card border border-border/50">
        <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-2xl font-bold">
          {(profile.full_name || user.email || "U").charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-card-foreground text-lg">{profile.full_name || "Non renseigné"}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          {profile.company && <p className="text-sm text-muted-foreground">{profile.company}</p>}
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-card rounded-xl p-6 shadow-card border border-border/50 max-w-lg space-y-4">
        <h3 className="font-semibold text-card-foreground mb-2">Modifier mes informations</h3>
        <div>
          <label className="text-sm font-medium text-card-foreground">Email</label>
          <Input value={user.email || ""} disabled className="mt-1 bg-muted" />
        </div>
        <div>
          <label className="text-sm font-medium text-card-foreground">Nom complet</label>
          <Input value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} className="mt-1" />
        </div>
        <div>
          <label className="text-sm font-medium text-card-foreground">Entreprise</label>
          <Input value={profile.company} onChange={(e) => setProfile({ ...profile, company: e.target.value })} className="mt-1" />
        </div>
        <div>
          <label className="text-sm font-medium text-card-foreground">Téléphone</label>
          <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="mt-1" />
        </div>
        <Button type="submit" className="gradient-primary text-primary-foreground border-0" disabled={saving}>
          {saving ? "Sauvegarde..." : "Sauvegarder"}
        </Button>
      </form>
    </div>
  );
}
