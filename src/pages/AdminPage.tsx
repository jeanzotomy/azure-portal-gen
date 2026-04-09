import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, FolderOpen, LifeBuoy, Users, LogOut, Shield, Clock, CheckCircle2,
  AlertCircle, Bell, ChevronDown, ChevronUp, MessageSquare, Search,
} from "lucide-react";
import type { User as SupaUser } from "@supabase/supabase-js";

type AdminTab = "dashboard" | "projects" | "tickets" | "users";

function AdminContent() {
  const [user, setUser] = useState<SupaUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const { isAdmin, loading: adminLoading } = useIsAdmin();
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
    if (!adminLoading && !isAdmin && !loading) navigate("/portal");
  }, [isAdmin, adminLoading, loading, navigate]);

  if (loading || adminLoading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Chargement...</div>;
  if (!user || !isAdmin) return null;

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/"); };

  const navItems: { id: AdminTab; icon: typeof LayoutDashboard; label: string }[] = [
    { id: "dashboard", icon: LayoutDashboard, label: "Vue d'ensemble" },
    { id: "projects", icon: FolderOpen, label: "Projets" },
    { id: "tickets", icon: LifeBuoy, label: "Tickets" },
    { id: "users", icon: Users, label: "Utilisateurs" },
  ];

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
                  <span className="block text-xs text-primary font-medium">Administration</span>
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
              <Shield size={12} /> Admin
            </span>
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
              {(user.user_metadata?.full_name || user.email || "A").charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          {tab === "dashboard" && <AdminDashboard />}
          {tab === "projects" && <AdminProjects />}
          {tab === "tickets" && <AdminTickets />}
          {tab === "users" && <AdminUsers />}
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editProgress, setEditProgress] = useState(0);
  const { toast } = useToast();

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
    const { error } = await supabase.from("projects").update({ status: editStatus, progress: editProgress }).eq("id", id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "Projet mis à jour!" }); setEditingId(null); load(); }
  };

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (profiles[p.user_id]?.full_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const statusOptions = [
    { value: "en_attente", label: "En attente" },
    { value: "en_cours", label: "En cours" },
    { value: "termine", label: "Terminé" },
  ];

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    en_cours: { label: "En cours", color: "text-primary", bg: "bg-primary/10" },
    termine: { label: "Terminé", color: "text-teal-600", bg: "bg-teal-600/10" },
    en_attente: { label: "En attente", color: "text-muted-foreground", bg: "bg-muted" },
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Gestion des projets</h1>
        <span className="text-sm text-muted-foreground">{projects.length} projet(s)</span>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Rechercher par projet ou client..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="space-y-4">
        {filtered.map((p) => {
          const sc = statusConfig[p.status] || statusConfig.en_cours;
          const profile = profiles[p.user_id];
          const isEditing = editingId === p.id;

          return (
            <div key={p.id} className="bg-card rounded-xl p-6 shadow-card border border-border/50">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-card-foreground">{p.name}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{p.description}</p>
                  <p className="text-xs text-primary mt-1">👤 {profile?.full_name || "Non renseigné"} — {profile?.company || "N/A"}</p>
                  {(p.budget || p.deadline || p.technologies) && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {p.budget && <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">💰 {p.budget}</span>}
                      {p.deadline && <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">📅 {p.deadline}</span>}
                      {p.technologies && <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">⚙️ {p.technologies}</span>}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!isEditing && (
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${sc.color} ${sc.bg}`}>{sc.label}</span>
                  )}
                  <Button variant="outline" size="sm" onClick={() => {
                    if (isEditing) { saveProject(p.id); }
                    else { setEditingId(p.id); setEditStatus(p.status); setEditProgress(p.progress); }
                  }}>
                    {isEditing ? "Sauvegarder" : "Modifier"}
                  </Button>
                  {isEditing && (
                    <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>Annuler</Button>
                  )}
                </div>
              </div>

              {isEditing ? (
                <div className="mt-4 p-4 bg-muted/30 rounded-lg space-y-3">
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
                </div>
              ) : (
                <>
                  <Progress value={p.progress} className="h-2 mt-2" />
                  <p className="text-xs text-muted-foreground text-right mt-1">{p.progress}%</p>
                </>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Aucun projet trouvé.</p>}
      </div>
    </div>
  );
}

/* ─── Tickets Management ─── */
function AdminTickets() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [filter, setFilter] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editPriority, setEditPriority] = useState("");
  const { toast } = useToast();

  const load = async () => {
    const { data: t } = await supabase.from("support_tickets").select("*").order("created_at", { ascending: false });
    setTickets(t || []);
    const { data: prof } = await supabase.from("profiles").select("*");
    const map: Record<string, any> = {};
    (prof || []).forEach((pr: any) => { map[pr.user_id] = pr; });
    setProfiles(map);
  };

  useEffect(() => { load(); }, []);

  const saveTicket = async (id: string) => {
    const { error } = await supabase.from("support_tickets").update({ status: editStatus, priority: editPriority }).eq("id", id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "Ticket mis à jour!" }); setEditingId(null); load(); }
  };

  const filtered = filter === "all" ? tickets : tickets.filter(t => t.status === filter);

  const statusConfig: Record<string, { color: string; bg: string }> = {
    ouvert: { color: "text-primary", bg: "bg-primary/10" },
    en_cours: { color: "text-accent", bg: "bg-accent/10" },
    résolu: { color: "text-muted-foreground", bg: "bg-muted" },
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Gestion des tickets</h1>
        <span className="text-sm text-muted-foreground">{tickets.length} ticket(s)</span>
      </div>

      <div className="flex gap-2">
        {["all", "ouvert", "en_cours", "résolu"].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >{f === "all" ? "Tous" : f}</button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.map((t) => {
          const sc = statusConfig[t.status] || statusConfig.ouvert;
          const profile = profiles[t.user_id];
          const isEditing = editingId === t.id;

          return (
            <div key={t.id} className="bg-card rounded-xl p-5 shadow-card border border-border/50">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-medium text-card-foreground">{t.subject}</h4>
                  <p className="text-xs text-primary mt-0.5">👤 {profile?.full_name || "Non renseigné"}</p>
                </div>
                <div className="flex items-center gap-2">
                  {!isEditing && (
                    <>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        t.priority === "urgent" ? "bg-destructive/10 text-destructive" : t.priority === "haute" ? "bg-orange-100 text-orange-600" : "bg-muted text-muted-foreground"
                      }`}>{t.priority}</span>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${sc.color} ${sc.bg}`}>{t.status}</span>
                    </>
                  )}
                  <Button variant="outline" size="sm" onClick={() => {
                    if (isEditing) saveTicket(t.id);
                    else { setEditingId(t.id); setEditStatus(t.status); setEditPriority(t.priority); }
                  }}>
                    {isEditing ? "Sauvegarder" : "Modifier"}
                  </Button>
                  {isEditing && <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>Annuler</Button>}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{t.message}</p>
              <p className="text-xs text-muted-foreground/60 mt-2">{new Date(t.created_at).toLocaleDateString("fr-CA")}</p>

              {isEditing && (
                <div className="mt-3 p-4 bg-muted/30 rounded-lg space-y-3">
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
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase.from("profiles").select("*").order("created_at", { ascending: false }).then(({ data }) => setProfilesList(data || []));
  }, []);

  const filtered = profilesList.filter(p =>
    (p.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.company || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Utilisateurs</h1>
        <span className="text-sm text-muted-foreground">{profilesList.length} client(s)</span>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Rechercher un client..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="grid gap-4">
        {filtered.map((p) => (
          <div key={p.id} className="bg-card rounded-xl p-5 shadow-card border border-border/50 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-lg font-bold flex-shrink-0">
              {(p.full_name || "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-card-foreground">{p.full_name || "Non renseigné"}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                {p.company && <span className="text-sm text-muted-foreground">🏢 {p.company}</span>}
                {p.phone && <span className="text-sm text-muted-foreground">📱 {p.phone}</span>}
              </div>
            </div>
            <p className="text-xs text-muted-foreground flex-shrink-0">
              Inscrit le {new Date(p.created_at).toLocaleDateString("fr-CA")}
            </p>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Aucun utilisateur trouvé.</p>}
      </div>
    </div>
  );
}
