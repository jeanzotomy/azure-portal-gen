import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/use-admin";
import { useMfaCheck } from "@/hooks/use-mfa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarWidget } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, FolderOpen, LifeBuoy, Users, LogOut, Shield, Clock, CheckCircle2,
  AlertCircle, Bell, ChevronDown, ChevronUp, MessageSquare, Search, Send, UserCog,
  Flag, DollarSign, Calendar, Filter,
} from "lucide-react";
import type { User as SupaUser } from "@supabase/supabase-js";

type AdminTab = "dashboard" | "projects" | "tickets" | "users";

function AdminContent() {
  const [user, setUser] = useState<SupaUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const { isAdmin, isAgent, loading: rolesLoading } = useUserRoles();
  const mfaVerified = useMfaCheck();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session?.user) navigate("/auth");
    });
  }, [navigate]);

  useEffect(() => {
    if (mfaVerified === false && !loading) navigate("/mfa");
  }, [mfaVerified, loading, navigate]);

  useEffect(() => {
    if (!rolesLoading && !isAdmin && !isAgent && !loading) navigate("/portal");
  }, [isAdmin, isAgent, rolesLoading, loading, navigate]);

  // Agent can only see tickets
  useEffect(() => {
    if (!rolesLoading && isAgent && !isAdmin) {
      if (tab !== "tickets") setTab("tickets");
    }
  }, [rolesLoading, isAgent, isAdmin, tab]);

  if (loading || rolesLoading || mfaVerified === null) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Chargement...</div>;
  if (!user || (!isAdmin && !isAgent)) return null;

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/"); };

  const allNavItems: { id: AdminTab; icon: typeof LayoutDashboard; label: string; adminOnly: boolean }[] = [
    { id: "dashboard", icon: LayoutDashboard, label: "Vue d'ensemble", adminOnly: true },
    { id: "projects", icon: FolderOpen, label: "Projets", adminOnly: true },
    { id: "tickets", icon: LifeBuoy, label: "Tickets", adminOnly: false },
    { id: "users", icon: Users, label: "Utilisateurs", adminOnly: true },
  ];

  const navItems = isAdmin ? allNavItems : allNavItems.filter(n => !n.adminOnly);
  const roleBadge = isAdmin ? "Admin" : "Agent";

  return (
    <div className="min-h-screen flex w-full bg-background">
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">
        <SidebarContent className="bg-sidebar">
          <div className="px-4 py-5 border-b border-sidebar-border">
            <Link to="/" className="flex items-center gap-2">
              <img src="/favicon.png" alt="CloudMature" className="h-8 w-8" />
              {!collapsed && (
                <div>
                  <span className="font-bold text-sidebar-foreground">CloudMature</span>
                  <span className="block text-xs text-primary font-medium">{roleBadge}</span>
                </div>
              )}
            </Link>
          </div>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton onClick={() => setTab(item.id)} isActive={tab === item.id} tooltip={item.label} className="gap-3">
                      <item.icon size={18} />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <div className="mt-auto p-3 border-t border-sidebar-border space-y-1">
            <SidebarMenuButton onClick={() => navigate("/portal")} tooltip="Portail client" className="gap-3 text-muted-foreground">
              <Shield size={18} />
              <span>Portail client</span>
            </SidebarMenuButton>
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
            <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
              <Shield size={12} /> {roleBadge}
            </span>
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
              {(user.user_metadata?.full_name || user.email || "A").charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          {tab === "dashboard" && isAdmin && <AdminDashboard />}
          {tab === "projects" && isAdmin && <AdminProjects />}
          {tab === "tickets" && <AdminTickets />}
          {tab === "users" && isAdmin && <AdminUsers />}
        </main>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <SidebarProvider>
      <AdminContent />
    </SidebarProvider>
  );
}

/* ─── Dashboard ─── */
function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, projects: 0, activeProjects: 0, openTickets: 0 });

  useEffect(() => {
    Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("projects").select("id", { count: "exact", head: true }),
      supabase.from("projects").select("id", { count: "exact", head: true }).eq("status", "en_cours"),
      supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "ouvert"),
    ]).then(([u, p, ap, t]) => {
      setStats({
        users: u.count || 0,
        projects: p.count || 0,
        activeProjects: ap.count || 0,
        openTickets: t.count || 0,
      });
    });
  }, []);

  const cards = [
    { label: "Clients inscrits", value: stats.users, icon: Users, color: "gradient-primary" },
    { label: "Projets total", value: stats.projects, icon: FolderOpen, color: "bg-accent" },
    { label: "Projets actifs", value: stats.activeProjects, icon: Clock, color: "bg-primary" },
    { label: "Tickets ouverts", value: stats.openTickets, icon: LifeBuoy, color: "bg-destructive" },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <h1 className="text-2xl font-bold text-foreground">Vue d'ensemble</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-card rounded-xl p-5 shadow-card border border-border/50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{c.label}</span>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${c.color}`}>
                <c.icon size={18} className="text-primary-foreground" />
              </div>
            </div>
            <p className="text-3xl font-bold text-card-foreground">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Projects Management ─── */
function AdminProjects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editProgress, setEditProgress] = useState(0);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editBudget, setEditBudget] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editPriority, setEditPriority] = useState("normal");
  const [editServices, setEditServices] = useState<string[]>([]);
  const { toast } = useToast();

  const serviceOptions = [
    "Stratégie & Adoption Cloud", "Optimisation FinOps", "Gouvernance & Sécurité",
    "Architecture & Ingénierie", "Migration Cloud", "Formation & Coaching",
    "Infogérance & Support", "Adoption & Maturité IA",
  ];

  const load = async () => {
    const { data: p } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
    setProjects(p || []);
    const { data: prof } = await supabase.from("profiles").select("*");
    const map: Record<string, any> = {};
    (prof || []).forEach((pr: any) => { map[pr.user_id] = pr; });
    setProfiles(map);
  };

  useEffect(() => { load(); }, []);

  const saveProject = async (id: string) => {
    const { error } = await supabase.from("projects").update({
      name: editName, description: editDescription || null, budget: editBudget || null,
      deadline: editDeadline || null, priority: editPriority, status: editStatus, progress: editProgress,
      technologies: editServices.length > 0 ? editServices.join(", ") : null,
    }).eq("id", id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "Projet mis à jour!" }); setEditingId(null); load(); }
  };

  const filtered = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (profiles[p.user_id]?.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (profiles[p.user_id]?.company || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || p.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const statusOptions = [
    { value: "en_attente", label: "En attente" },
    { value: "en_cours", label: "En cours" },
    { value: "termine", label: "Terminé" },
  ];

  const statusConfig: Record<string, { label: string; icon: typeof Clock; color: string; bg: string }> = {
    en_cours: { label: "En cours", icon: Clock, color: "text-primary", bg: "bg-primary/10" },
    termine: { label: "Terminé", icon: CheckCircle2, color: "text-teal-600", bg: "bg-teal-600/10" },
    en_attente: { label: "En attente", icon: AlertCircle, color: "text-muted-foreground", bg: "bg-muted" },
  };

  const priorityConfig: Record<string, { label: string; color: string; bg: string }> = {
    urgent: { label: "Urgent", color: "text-destructive", bg: "bg-destructive/10 border-destructive/20" },
    haute: { label: "Haute", color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/20" },
    normal: { label: "Normal", color: "text-muted-foreground", bg: "bg-muted border-border" },
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Gestion des projets</h1>
        <span className="text-sm text-muted-foreground">{filtered.length}/{projects.length} projet(s)</span>
      </div>

      {/* Filter bar */}
      <div className="bg-card rounded-xl p-4 shadow-card border border-border/50 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Rechercher par projet, client ou entreprise..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Filter size={12} /> Statut :</span>
          {[{ value: "all", label: "Tous" }, ...statusOptions].map((opt) => (
            <button key={opt.value} onClick={() => setStatusFilter(opt.value)}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${statusFilter === opt.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >{opt.label}</button>
          ))}
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 ml-2"><Flag size={12} /> Priorité :</span>
          {[{ value: "all", label: "Toutes" }, { value: "normal", label: "Normal" }, { value: "haute", label: "Haute" }, { value: "urgent", label: "Urgent" }].map((opt) => (
            <button key={opt.value} onClick={() => setPriorityFilter(opt.value)}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${priorityFilter === opt.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >{opt.label}</button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {filtered.map((p) => {
          const sc = statusConfig[p.status] || statusConfig.en_cours;
          const pc = priorityConfig[p.priority] || priorityConfig.normal;
          const profile = profiles[p.user_id];
          const isEditing = editingId === p.id;

          return (
            <div key={p.id} className="group relative bg-card rounded-2xl shadow-card border border-border/50 hover:shadow-card-hover hover:border-primary/30 transition-all duration-300 overflow-hidden">
              <div className={`h-1 w-full ${p.status === "termine" ? "bg-teal-500" : p.status === "en_attente" ? "bg-muted-foreground/30" : "bg-gradient-to-r from-primary to-accent"}`} />

              <div className="p-5">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${sc.color} ${sc.bg}`}>
                    <sc.icon size={12} /> {sc.label}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {p.priority && p.priority !== "normal" && (
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${pc.color} ${pc.bg}`}>
                        <Flag size={10} className="inline mr-1" />{pc.label}
                      </span>
                    )}
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {
                      if (isEditing) saveProject(p.id);
                      else {
                        setEditingId(p.id); setEditStatus(p.status); setEditProgress(p.progress);
                        setEditName(p.name); setEditDescription(p.description || "");
                        setEditBudget(p.budget || ""); setEditDeadline(p.deadline || "");
                        setEditPriority(p.priority || "normal");
                        setEditServices(p.technologies ? p.technologies.split(", ") : []);
                      }
                    }}>
                      {isEditing ? "Sauvegarder" : "Modifier"}
                    </Button>
                    {isEditing && <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingId(null)}>Annuler</Button>}
                  </div>
                </div>

                {/* Title & client */}
                <h3 className="font-bold text-card-foreground text-lg leading-tight mb-1">{p.name}</h3>
                {p.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{p.description}</p>}
                
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-[10px] font-bold flex-shrink-0">
                    {(profile?.full_name || "?").charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs text-primary font-medium">{profile?.full_name || "Non renseigné"}</span>
                  {profile?.company && <span className="text-xs text-muted-foreground">· {profile.company}</span>}
                </div>

                {/* Meta */}
                {(p.budget || p.deadline) && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {p.budget && (
                      <span className="inline-flex items-center gap-1 text-xs bg-primary/5 text-primary border border-primary/15 px-2.5 py-1 rounded-lg">
                        <DollarSign size={11} /> {p.budget}
                      </span>
                    )}
                    {p.deadline && (
                      <span className="inline-flex items-center gap-1 text-xs bg-orange-50 text-orange-600 border border-orange-200 px-2.5 py-1 rounded-lg dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20">
                        <Calendar size={11} /> {(() => { try { return format(new Date(p.deadline), "d MMM yyyy", { locale: fr }); } catch { return p.deadline; } })()}
                      </span>
                    )}
                  </div>
                )}
                {p.technologies && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {p.technologies.split(", ").map((tech: string) => (
                      <span key={tech} className="text-[11px] bg-secondary/50 text-secondary-foreground/70 px-2 py-0.5 rounded-md">{tech}</span>
                    ))}
                  </div>
                )}

                {/* Edit panel or progress */}
                {isEditing ? (
                  <div className="mt-2 p-4 bg-muted/30 rounded-xl space-y-3">
                    <div>
                      <label className="text-sm font-medium text-card-foreground">Nom du projet</label>
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-card-foreground">Description</label>
                      <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} className="mt-1" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-card-foreground">Budget</label>
                        <Input value={editBudget} onChange={(e) => setEditBudget(e.target.value)} placeholder="Ex: 5000" className="mt-1" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-card-foreground">Délai</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-1", !editDeadline && "text-muted-foreground")}>
                              <Calendar size={14} className="mr-2" />
                              {editDeadline ? (() => { try { return format(new Date(editDeadline), "PPP", { locale: fr }); } catch { return editDeadline; } })() : "Sélectionner une date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarWidget
                              mode="single"
                              selected={editDeadline ? (() => { try { const d = new Date(editDeadline); return isNaN(d.getTime()) ? undefined : d; } catch { return undefined; } })() : undefined}
                              onSelect={(date) => setEditDeadline(date ? date.toISOString().split("T")[0] : "")}
                              disabled={(date) => date <= new Date()}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-card-foreground">Priorité</label>
                      <div className="flex gap-2 mt-1">
                        {[{ value: "normal", label: "Normal" }, { value: "haute", label: "Haute" }, { value: "urgent", label: "Urgent" }].map((opt) => (
                          <button key={opt.value} onClick={() => setEditPriority(opt.value)}
                            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${editPriority === opt.value ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border"}`}
                          >{opt.label}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-card-foreground">Statut</label>
                      <div className="flex gap-2 mt-1">
                        {statusOptions.map((opt) => (
                          <button key={opt.value} onClick={() => setEditStatus(opt.value)}
                            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${editStatus === opt.value ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border"}`}
                          >{opt.label}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-card-foreground">Progression : {editProgress}%</label>
                      <input type="range" min="0" max="100" value={editProgress} onChange={(e) => setEditProgress(Number(e.target.value))}
                        className="w-full mt-1 accent-[hsl(var(--primary))]" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-card-foreground">Services</label>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {serviceOptions.map((s) => (
                          <button key={s} onClick={() => setEditServices(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                            className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${editServices.includes(s) ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border"}`}
                          >{s}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-auto">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-muted-foreground">Progression</span>
                      <span className="text-xs font-bold text-card-foreground">{p.progress}%</span>
                    </div>
                    <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${p.progress === 100 ? "bg-teal-500" : "bg-gradient-to-r from-primary to-accent"}`}
                        style={{ width: `${p.progress}%` }} />
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-muted-foreground/50 mt-3">
                  Soumis le {new Date(p.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Aucun projet trouvé.</p>}
    </div>
  );
}

/* ─── Tickets Management ─── */
function AdminTickets() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [filter, setFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editPriority, setEditPriority] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, any[]>>({});
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    const { data: t } = await supabase.from("support_tickets").select("*").order("created_at", { ascending: false });
    setTickets(t || []);
    const { data: prof } = await supabase.from("profiles").select("*");
    const map: Record<string, any> = {};
    (prof || []).forEach((pr: any) => { map[pr.user_id] = pr; });
    setProfiles(map);
  };

  const loadReplies = async (ticketId: string) => {
    const { data } = await supabase.from("ticket_replies").select("*").eq("ticket_id", ticketId).order("created_at", { ascending: true });
    setReplies(prev => ({ ...prev, [ticketId]: data || [] }));
  };

  useEffect(() => { load(); }, []);

  const toggleExpand = (ticketId: string) => {
    if (expandedId === ticketId) { setExpandedId(null); }
    else { setExpandedId(ticketId); loadReplies(ticketId); }
    setReplyText("");
  };

  const sendReply = async (ticketId: string) => {
    if (!replyText.trim()) return;
    setSendingReply(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const { error } = await supabase.from("ticket_replies").insert({
      ticket_id: ticketId, user_id: session.user.id, message: replyText.trim(), is_admin: true,
    });
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "Réponse envoyée!" }); setReplyText(""); loadReplies(ticketId); }
    setSendingReply(false);
  };

  const saveTicket = async (id: string) => {
    const { error } = await supabase.from("support_tickets").update({ status: editStatus, priority: editPriority }).eq("id", id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "Ticket mis à jour!" }); setEditingId(null); load(); }
  };

  const filtered = tickets.filter(t => {
    const matchesSearch = t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.message.toLowerCase().includes(search.toLowerCase()) ||
      (profiles[t.user_id]?.full_name || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filter === "all" || t.status === filter;
    const matchesPriority = priorityFilter === "all" || t.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const statusConfig: Record<string, { label: string; icon: typeof Clock; color: string; bg: string }> = {
    ouvert: { label: "Ouvert", icon: AlertCircle, color: "text-primary", bg: "bg-primary/10" },
    en_cours: { label: "En cours", icon: Clock, color: "text-orange-500", bg: "bg-orange-500/10" },
    résolu: { label: "Résolu", icon: CheckCircle2, color: "text-teal-600", bg: "bg-teal-600/10" },
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Gestion des tickets</h1>
        <span className="text-sm text-muted-foreground">{filtered.length}/{tickets.length} ticket(s)</span>
      </div>

      {/* Filter bar */}
      <div className="bg-card rounded-xl p-4 shadow-card border border-border/50 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Rechercher par sujet, message ou client..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Filter size={12} /> Statut :</span>
          {[{ v: "all", l: "Tous" }, { v: "ouvert", l: "Ouvert" }, { v: "en_cours", l: "En cours" }, { v: "résolu", l: "Résolu" }].map((f) => (
            <button key={f.v} onClick={() => setFilter(f.v)}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${filter === f.v ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >{f.l}</button>
          ))}
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 ml-2"><Flag size={12} /> Priorité :</span>
          {[{ v: "all", l: "Toutes" }, { v: "normal", l: "Normal" }, { v: "haute", l: "Haute" }, { v: "urgent", l: "Urgent" }].map((f) => (
            <button key={f.v} onClick={() => setPriorityFilter(f.v)}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${priorityFilter === f.v ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >{f.l}</button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((t) => {
          const sc = statusConfig[t.status] || statusConfig.ouvert;
          const profile = profiles[t.user_id];
          const isEditing = editingId === t.id;
          const isExpanded = expandedId === t.id;
          const ticketReplies = replies[t.id] || [];

          return (
            <div key={t.id} className="group bg-card rounded-2xl shadow-card border border-border/50 hover:shadow-card-hover hover:border-primary/30 transition-all duration-300 overflow-hidden">
              <div className={`h-1 w-full ${t.status === "résolu" ? "bg-teal-500" : t.status === "en_cours" ? "bg-orange-500" : "bg-gradient-to-r from-primary to-accent"}`} />
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${sc.color} ${sc.bg}`}>
                    <sc.icon size={12} /> {sc.label}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {t.priority !== "normal" && (
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                        t.priority === "urgent" ? "text-destructive bg-destructive/10 border-destructive/20" : "text-orange-500 bg-orange-500/10 border-orange-500/20"
                      }`}>
                        <Flag size={10} className="inline mr-1" />{t.priority}
                      </span>
                    )}
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {
                      if (isEditing) saveTicket(t.id);
                      else { setEditingId(t.id); setEditStatus(t.status); setEditPriority(t.priority); }
                    }}>
                      {isEditing ? "Sauvegarder" : "Modifier"}
                    </Button>
                    {isEditing && <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingId(null)}>Annuler</Button>}
                  </div>
                </div>

                <h3 className="font-bold text-card-foreground text-lg leading-tight mb-1">{t.subject}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{t.message}</p>

                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-[10px] font-bold flex-shrink-0">
                    {(profile?.full_name || "?").charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs text-primary font-medium">{profile?.full_name || "Non renseigné"}</span>
                  {profile?.company && <span className="text-xs text-muted-foreground">· {profile.company}</span>}
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-muted-foreground/50">
                    {new Date(t.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                  <button onClick={() => toggleExpand(t.id)} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <MessageSquare size={14} />
                    {isExpanded ? "Masquer" : "Répondre"}
                  </button>
                </div>

                {isEditing && (
                  <div className="mt-3 p-4 bg-muted/30 rounded-xl space-y-3">
                    <div>
                      <label className="text-sm font-medium text-card-foreground">Statut</label>
                      <div className="flex gap-2 mt-1">
                        {["ouvert", "en_cours", "résolu"].map((s) => (
                          <button key={s} onClick={() => setEditStatus(s)}
                            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${editStatus === s ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border"}`}
                          >{s}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-card-foreground">Priorité</label>
                      <div className="flex gap-2 mt-1">
                        {["normal", "haute", "urgent"].map((pr) => (
                          <button key={pr} onClick={() => setEditPriority(pr)}
                            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${editPriority === pr ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border"}`}
                          >{pr}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {isExpanded && (
                <div className="border-t border-border/50 p-5 bg-muted/20 rounded-b-2xl space-y-4">
                  {ticketReplies.length > 0 ? (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {ticketReplies.map((r) => (
                        <div key={r.id} className={`flex ${r.is_admin ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                            r.is_admin ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border border-border text-card-foreground rounded-bl-sm"
                          }`}>
                            <p className="text-sm">{r.message}</p>
                            <p className={`text-[10px] mt-1 ${r.is_admin ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                              {r.is_admin ? "Équipe" : (profiles[r.user_id]?.full_name || "Client")} · {new Date(r.created_at).toLocaleString("fr-CA")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-2">Aucune réponse pour le moment.</p>
                  )}
                  <div className="flex gap-2">
                    <Textarea placeholder="Écrire une réponse..." value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={2} className="flex-1" />
                    <Button onClick={() => sendReply(t.id)} disabled={sendingReply || !replyText.trim()} className="gradient-primary text-primary-foreground border-0 self-end" size="sm">
                      <Send size={14} />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Aucun ticket trouvé.</p>}
      </div>
    </div>
  );
}

/* ─── Users Management ─── */
function AdminUsers() {
  const [profilesList, setProfilesList] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, string[]>>({});
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const { toast } = useToast();

  const load = async () => {
    const { data: profs } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setProfilesList(profs || []);
    const { data: roles } = await supabase.from("user_roles").select("*");
    const map: Record<string, string[]> = {};
    (roles || []).forEach((r: any) => {
      if (!map[r.user_id]) map[r.user_id] = [];
      map[r.user_id].push(r.role);
    });
    setUserRoles(map);
  };

  useEffect(() => { load(); }, []);

  const assignRole = async (userId: string, role: string) => {
    setChangingRole(userId);
    const { error: delError } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (delError) { toast({ title: "Erreur", description: delError.message, variant: "destructive" }); setChangingRole(null); return; }
    const rolesToInsert: { user_id: string; role: "admin" | "agent" | "client" }[] = [{ user_id: userId, role: "client" }];
    if (role === "admin") rolesToInsert.push({ user_id: userId, role: "admin" });
    else if (role === "agent") rolesToInsert.push({ user_id: userId, role: "agent" });
    const { error } = await supabase.from("user_roles").insert(rolesToInsert);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else toast({ title: "Rôle mis à jour!", description: `Rôle changé en ${role}.` });
    setChangingRole(null);
    load();
  };

  const getRoleBadge = (roles: string[]) => {
    if (roles.includes("admin")) return { label: "Admin", color: "bg-primary/10 text-primary border-primary/20" };
    if (roles.includes("agent")) return { label: "Agent", color: "bg-orange-500/10 text-orange-500 border-orange-500/20" };
    return { label: "Client", color: "bg-muted text-muted-foreground border-border" };
  };

  const getCurrentRole = (roles: string[]) => roles.includes("admin") ? "admin" : roles.includes("agent") ? "agent" : "client";

  const filtered = profilesList.filter(p => {
    const matchesSearch = (p.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.company || "").toLowerCase().includes(search.toLowerCase());
    const roles = userRoles[p.user_id] || ["client"];
    const currentRole = getCurrentRole(roles);
    const matchesRole = roleFilter === "all" || currentRole === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roleOptions = [
    { value: "client", label: "Client" },
    { value: "agent", label: "Agent" },
    { value: "admin", label: "Admin" },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Utilisateurs</h1>
        <span className="text-sm text-muted-foreground">{filtered.length}/{profilesList.length} utilisateur(s)</span>
      </div>

      {/* Filter bar */}
      <div className="bg-card rounded-xl p-4 shadow-card border border-border/50 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Rechercher par nom ou entreprise..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Filter size={12} /> Rôle :</span>
          {[{ v: "all", l: "Tous" }, { v: "client", l: "Client" }, { v: "agent", l: "Agent" }, { v: "admin", l: "Admin" }].map((f) => (
            <button key={f.v} onClick={() => setRoleFilter(f.v)}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${roleFilter === f.v ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >{f.l}</button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((p) => {
          const roles = userRoles[p.user_id] || ["client"];
          const badge = getRoleBadge(roles);
          const currentRole = getCurrentRole(roles);

          return (
            <div key={p.id} className="group bg-card rounded-2xl p-5 shadow-card border border-border/50 hover:shadow-card-hover hover:border-primary/30 transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-lg font-bold flex-shrink-0">
                  {(p.full_name || "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-bold text-card-foreground">{p.full_name || "Non renseigné"}</p>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${badge.color}`}>{badge.label}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    {p.company && <span className="text-xs text-muted-foreground">🏢 {p.company}</span>}
                    {p.phone && <span className="text-xs text-muted-foreground">📱 {p.phone}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/30">
                <p className="text-[11px] text-muted-foreground/50">
                  Inscrit le {new Date(p.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                </p>
                <div className="flex items-center gap-1.5">
                  <UserCog size={14} className="text-muted-foreground" />
                  <select value={currentRole} onChange={(e) => assignRole(p.user_id, e.target.value)}
                    disabled={changingRole === p.user_id}
                    className="text-xs border border-border rounded-lg px-2 py-1.5 bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                    {roleOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                  </select>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Aucun utilisateur trouvé.</p>}
    </div>
  );
}
