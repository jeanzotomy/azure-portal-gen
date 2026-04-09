import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
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
  Menu, Bell, Search, Filter,
} from "lucide-react";
import type { User as SupaUser } from "@supabase/supabase-js";

type Tab = "dashboard" | "projects" | "tickets" | "profile";

function PortalContent() {
  const [user, setUser] = useState<SupaUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("dashboard");
  const navigate = useNavigate();
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

          <div className="mt-auto p-3 border-t border-sidebar-border">
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

  useEffect(() => {
    supabase.from("projects").select("*").order("created_at", { ascending: false }).then(({ data }) => setProjects(data || []));
  }, []);

  const statusConfig: Record<string, { label: string; icon: typeof Clock; color: string; bg: string }> = {
    en_cours: { label: "En cours", icon: Clock, color: "text-primary", bg: "bg-primary/10" },
    termine: { label: "Terminé", icon: CheckCircle2, color: "text-teal-600", bg: "bg-teal-600/10" },
    en_attente: { label: "En attente", icon: AlertCircle, color: "text-muted-foreground", bg: "bg-muted" },
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <h1 className="text-2xl font-bold text-foreground">Mes Projets</h1>
      {projects.length === 0 ? (
        <div className="bg-card rounded-xl p-12 shadow-card border border-border/50 text-center">
          <FolderOpen size={48} className="mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Aucun projet pour le moment.</p>
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
                  </div>
                  <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${sc.color} ${sc.bg}`}>
                    <sc.icon size={12} /> {sc.label}
                  </span>
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
  const { toast } = useToast();

  const loadTickets = () => {
    supabase.from("support_tickets").select("*").order("created_at", { ascending: false }).then(({ data }) => setTickets(data || []));
  };

  useEffect(() => { loadTickets(); }, []);

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
        {filtered.map((t) => (
          <div key={t.id} className="bg-card rounded-xl p-5 shadow-card border border-border/50 hover:shadow-card-hover transition-shadow">
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
            <p className="text-xs text-muted-foreground/60 mt-2">{new Date(t.created_at).toLocaleDateString("fr-CA")}</p>
          </div>
        ))}
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
