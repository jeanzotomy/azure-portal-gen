import { useEffect, useState } from "react";
import adminLogo from "@/assets/cloudmature-logo.png";
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
  Flag, DollarSign, Calendar, Filter, TrendingUp, Activity, BarChart3, PieChart, ShieldBan, ShieldCheck, Trash2,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, AreaChart, Area } from "recharts";
import type { User as SupaUser } from "@supabase/supabase-js";

type AdminTab = "dashboard" | "projects" | "tickets" | "users" | "contacts";
type AgentTab = "dashboard" | "tickets";

function AdminContent() {
  const [user, setUser] = useState<SupaUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [agentTab, setAgentTab] = useState<AgentTab>("dashboard");
  const { isAdmin, isAgent, loading: rolesLoading } = useUserRoles();
  const mfaVerified = useMfaCheck();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [unrepliedCount, setUnrepliedCount] = useState(0);

  useEffect(() => {
    const fetchUnreplied = async () => {
      const { data: tickets } = await supabase.from("support_tickets").select("id, status");
      if (!tickets) return;
      const openTickets = tickets.filter(t => t.status !== "résolu");
      let count = 0;
      for (const t of openTickets) {
        const { data: replies } = await supabase.from("ticket_replies").select("id").eq("ticket_id", t.id).eq("is_admin", true).limit(1);
        if (!replies || replies.length === 0) count++;
      }
      setUnrepliedCount(count);
    };
    fetchUnreplied();
    const interval = setInterval(fetchUnreplied, 30000);
    return () => clearInterval(interval);
  }, []);

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

  if (loading || rolesLoading || mfaVerified === null) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Chargement...</div>;
  if (!user || (!isAdmin && !isAgent)) return null;

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/"); };

  // Agent-only view
  if (isAgent && !isAdmin) {
    const agentNavItems: { id: AgentTab; icon: typeof LayoutDashboard; label: string }[] = [
      { id: "dashboard", icon: LayoutDashboard, label: "Tableau de bord" },
      { id: "tickets", icon: LifeBuoy, label: "Tickets" },
    ];

    return (
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar collapsible="icon" className="border-r border-sidebar-border">
          <SidebarContent className="bg-sidebar">
            <div className="px-4 py-5 border-b border-sidebar-border">
              <Link to="/" className="flex items-center gap-2">
                <img src={adminLogo} alt="CloudMature" className="h-8 w-8" />
                {!collapsed && (
                  <div>
                    <span className="font-bold text-sidebar-foreground">CloudMature</span>
                    <span className="block text-xs text-accent font-medium">Agent</span>
                  </div>
                )}
              </Link>
            </div>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {agentNavItems.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton onClick={() => setAgentTab(item.id)} isActive={agentTab === item.id} tooltip={item.label} className="gap-3">
                        <div className="relative">
                          <item.icon size={18} />
                          {item.id === "tickets" && unrepliedCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                              {unrepliedCount}
                            </span>
                          )}
                        </div>
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
                {agentNavItems.find(n => n.id === agentTab)?.label}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-accent/10 text-accent px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                <Shield size={12} /> Agent
              </span>
              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                {(user.user_metadata?.full_name || user.email || "A").charAt(0).toUpperCase()}
              </div>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            {agentTab === "dashboard" && <AgentDashboard user={user} />}
            {agentTab === "tickets" && <AdminTickets />}
          </main>
        </div>
      </div>
    );
  }

  // Admin view
  const allNavItems: { id: AdminTab; icon: typeof LayoutDashboard; label: string }[] = [
    { id: "dashboard", icon: LayoutDashboard, label: "Vue d'ensemble" },
    { id: "projects", icon: FolderOpen, label: "Projets" },
    { id: "tickets", icon: LifeBuoy, label: "Tickets" },
    { id: "contacts", icon: MessageSquare, label: "Contacts" },
    { id: "users", icon: Users, label: "Utilisateurs" },
  ];

  return (
    <div className="min-h-screen flex w-full bg-background">
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">
        <SidebarContent className="bg-sidebar">
          <div className="px-4 py-5 border-b border-sidebar-border">
            <Link to="/" className="flex items-center gap-2">
              <img src={adminLogo} alt="CloudMature" className="h-8 w-8" />
              {!collapsed && (
                <div>
                  <span className="font-bold text-sidebar-foreground">CloudMature</span>
                  <span className="block text-xs text-primary font-medium">Admin</span>
                </div>
              )}
            </Link>
          </div>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {allNavItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton onClick={() => setTab(item.id)} isActive={tab === item.id} tooltip={item.label} className="gap-3">
                      <div className="relative">
                        <item.icon size={18} />
                        {item.id === "tickets" && unrepliedCount > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                            {unrepliedCount}
                          </span>
                        )}
                      </div>
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
              {allNavItems.find(n => n.id === tab)?.label}
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
          {tab === "contacts" && <AdminContacts />}
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

/* ─── Agent Dashboard ─── */
function AgentDashboard({ user }: { user: SupaUser }) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [replies, setReplies] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});

  useEffect(() => {
    supabase.from("support_tickets").select("*").order("created_at", { ascending: false }).then(({ data }) => setTickets(data || []));
    supabase.from("ticket_replies").select("*").order("created_at", { ascending: false }).then(({ data }) => setReplies(data || []));
    supabase.from("profiles").select("*").then(({ data }) => {
      const map: Record<string, any> = {};
      (data || []).forEach((p: any) => { map[p.user_id] = p; });
      setProfiles(map);
    });
  }, []);

  const openTickets = tickets.filter(t => t.status === "ouvert").length;
  const inProgressTickets = tickets.filter(t => t.status === "en_cours").length;
  const resolvedTickets = tickets.filter(t => t.status === "résolu").length;
  const myReplies = replies.filter(r => r.user_id === user.id).length;

  const recentTickets = tickets.slice(0, 5);

  const ticketStatusData = [
    { name: "Ouvert", value: openTickets },
    { name: "En cours", value: inProgressTickets },
    { name: "Résolu", value: resolvedTickets },
  ].filter(d => d.value > 0);

  // Monthly tickets (last 6 months)
  const monthlyData = (() => {
    const months: { name: string; tickets: number; réponses: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthName = d.toLocaleDateString("fr-FR", { month: "short" });
      const year = d.getFullYear();
      const month = d.getMonth();
      months.push({
        name: monthName,
        tickets: tickets.filter(t => { const cd = new Date(t.created_at); return cd.getFullYear() === year && cd.getMonth() === month; }).length,
        réponses: replies.filter(r => r.user_id === user.id).filter(r => { const cd = new Date(r.created_at); return cd.getFullYear() === year && cd.getMonth() === month; }).length,
      });
    }
    return months;
  })();

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    ouvert: { label: "Ouvert", color: "text-primary", bg: "bg-primary/10" },
    en_cours: { label: "En cours", color: "text-accent", bg: "bg-accent/10" },
    résolu: { label: "Résolu", color: "text-teal-600", bg: "bg-teal-600/10" },
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="relative overflow-hidden bg-gradient-to-br from-accent/5 via-primary/5 to-accent/10 rounded-2xl p-6 border border-accent/10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Bonjour, {user.user_metadata?.full_name || user.email?.split("@")[0]} 👋</h1>
            <p className="text-muted-foreground mt-1">Voici votre espace agent — gérez les tickets clients.</p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
            <Activity size={16} className="text-accent" />
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Tickets ouverts", value: openTickets, icon: AlertCircle, color: "bg-primary" },
          { label: "En cours", value: inProgressTickets, icon: Clock, color: "bg-accent" },
          { label: "Résolus", value: resolvedTickets, icon: CheckCircle2, color: "bg-teal-600" },
          { label: "Mes réponses", value: myReplies, icon: MessageSquare, color: "gradient-primary" },
        ].map((c) => (
          <div key={c.label} className="bg-card rounded-xl p-5 shadow-card border border-border/50 hover:shadow-card-hover hover:border-accent/20 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground font-medium">{c.label}</span>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.color} group-hover:scale-110 transition-transform duration-300`}>
                <c.icon size={18} className="text-primary-foreground" />
              </div>
            </div>
            <p className="text-3xl font-bold text-card-foreground">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-card rounded-xl shadow-card border border-border/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-accent" />
            <h3 className="font-semibold text-card-foreground">Mon activité mensuelle</h3>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="agentGradTickets" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="agentGradReplies" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.75rem", fontSize: 12 }} />
                <Area type="monotone" dataKey="tickets" stroke="hsl(var(--primary))" fill="url(#agentGradTickets)" strokeWidth={2} name="Tickets" />
                <Area type="monotone" dataKey="réponses" stroke="hsl(var(--accent))" fill="url(#agentGradReplies)" strokeWidth={2} name="Mes réponses" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-card border border-border/50 p-5">
          <div className="flex items-center gap-2 mb-2">
            <PieChart size={14} className="text-accent" />
            <h4 className="text-sm font-semibold text-card-foreground">Tickets par statut</h4>
          </div>
          {ticketStatusData.length > 0 ? (
            <>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie data={ticketStatusData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={4} dataKey="value">
                      {ticketStatusData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem", fontSize: 11 }} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {ticketStatusData.map((d, i) => (
                  <span key={d.name} className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    {d.name} ({d.value})
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="h-40 flex items-center justify-center">
              <p className="text-xs text-muted-foreground">Aucune donnée</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent tickets */}
      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        <div className="p-5 border-b border-border/50 flex items-center justify-between">
          <h3 className="font-semibold text-card-foreground flex items-center gap-2">
            <LifeBuoy size={16} className="text-accent" /> Tickets récents à traiter
          </h3>
          <span className="text-xs text-muted-foreground">{openTickets + inProgressTickets} en attente</span>
        </div>
        {recentTickets.length > 0 ? (
          <div className="divide-y divide-border/50">
            {recentTickets.map((t) => {
              const sc = statusConfig[t.status] || statusConfig.ouvert;
              const profile = profiles[t.user_id];
              return (
                <div key={t.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0">
                        {(profile?.full_name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-card-foreground text-sm truncate">{t.subject}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {profile?.full_name || "Client"} {profile?.company ? `· ${profile.company}` : ""}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${sc.color} ${sc.bg}`}>
                      {sc.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 ml-11">
                    <span className="text-[11px] text-muted-foreground/60">{new Date(t.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</span>
                    {t.priority === "urgent" && <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded font-medium">Urgent</span>}
                    {t.priority === "haute" && <span className="text-[10px] bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded font-medium">Haute</span>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center">
            <CheckCircle2 size={32} className="mx-auto text-teal-500/30 mb-2" />
            <p className="text-sm text-muted-foreground">Aucun ticket à traiter 🎉</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Admin Dashboard ─── */
const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(199, 89%, 48%)", "hsl(160, 60%, 45%)"];

function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, projects: 0, activeProjects: 0, openTickets: 0 });
  const [projects, setProjects] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [recentProfiles, setRecentProfiles] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("projects").select("*").order("created_at", { ascending: false }),
      supabase.from("support_tickets").select("*").order("created_at", { ascending: false }),
    ]).then(([profRes, projRes, tickRes]) => {
      const profs = profRes.data || [];
      const projs = projRes.data || [];
      const ticks = tickRes.data || [];
      setRecentProfiles(profs.slice(0, 5));
      setProjects(projs);
      setTickets(ticks);
      setStats({
        users: profs.length,
        projects: projs.length,
        activeProjects: projs.filter(p => p.status === "en_cours").length,
        openTickets: ticks.filter(t => t.status === "ouvert").length,
      });
    });
  }, []);

  // Project status pie data
  const projectStatusData = [
    { name: "En cours", value: projects.filter(p => p.status === "en_cours").length },
    { name: "En attente", value: projects.filter(p => p.status === "en_attente").length },
    { name: "Terminé", value: projects.filter(p => p.status === "termine").length },
  ].filter(d => d.value > 0);

  // Ticket status pie data
  const ticketStatusData = [
    { name: "Ouvert", value: tickets.filter(t => t.status === "ouvert").length },
    { name: "En cours", value: tickets.filter(t => t.status === "en_cours").length },
    { name: "Résolu", value: tickets.filter(t => t.status === "résolu").length },
  ].filter(d => d.value > 0);

  // Monthly activity (last 6 months)
  const monthlyData = (() => {
    const months: { name: string; projets: number; tickets: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthName = d.toLocaleDateString("fr-FR", { month: "short" });
      const year = d.getFullYear();
      const month = d.getMonth();
      months.push({
        name: monthName,
        projets: projects.filter(p => {
          const cd = new Date(p.created_at);
          return cd.getFullYear() === year && cd.getMonth() === month;
        }).length,
        tickets: tickets.filter(t => {
          const cd = new Date(t.created_at);
          return cd.getFullYear() === year && cd.getMonth() === month;
        }).length,
      });
    }
    return months;
  })();

  // Total budget
  const totalBudget = projects.reduce((sum, p) => {
    const num = parseFloat((p.budget || "0").replace(/[^\d.]/g, ""));
    return sum + (isNaN(num) ? 0 : num);
  }, 0);

  // Avg progress
  const avgProgress = projects.length > 0
    ? Math.round(projects.reduce((sum, p) => sum + (p.progress || 0), 0) / projects.length)
    : 0;

  const cards = [
    { label: "Clients inscrits", value: stats.users, icon: Users, color: "gradient-primary", subtitle: "Total" },
    { label: "Projets total", value: stats.projects, icon: FolderOpen, color: "bg-accent", subtitle: `${stats.activeProjects} actifs` },
    { label: "Tickets ouverts", value: stats.openTickets, icon: LifeBuoy, color: "bg-destructive", subtitle: `${tickets.length} total` },
    { label: "Budget total", value: totalBudget, icon: DollarSign, color: "bg-primary", subtitle: `Moy. ${avgProgress}% progression`, isCurrency: true },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Welcome banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-accent/5 to-primary/10 rounded-2xl p-6 border border-primary/10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Vue d'ensemble</h1>
            <p className="text-muted-foreground mt-1">Suivez l'activité de votre plateforme en temps réel.</p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
            <Activity size={16} className="text-primary" />
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-card rounded-xl p-5 shadow-card border border-border/50 hover:shadow-card-hover hover:border-primary/20 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground font-medium">{c.label}</span>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.color} group-hover:scale-110 transition-transform duration-300`}>
                <c.icon size={18} className="text-primary-foreground" />
              </div>
            </div>
            <p className="text-3xl font-bold text-card-foreground">
              {(c as any).isCurrency ? `$${c.value.toLocaleString()}` : c.value}
            </p>
            {(c as any).subtitle && <p className="text-xs text-muted-foreground mt-1">{(c as any).subtitle}</p>}
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Activity chart */}
        <div className="lg:col-span-2 bg-card rounded-xl shadow-card border border-border/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-primary" />
            <h3 className="font-semibold text-card-foreground">Activité mensuelle</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="gradProjects" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradTickets" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.75rem", fontSize: 12 }}
                  labelStyle={{ color: "hsl(var(--card-foreground))" }}
                />
                <Area type="monotone" dataKey="projets" stroke="hsl(var(--primary))" fill="url(#gradProjects)" strokeWidth={2} name="Projets" />
                <Area type="monotone" dataKey="tickets" stroke="hsl(var(--accent))" fill="url(#gradTickets)" strokeWidth={2} name="Tickets" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie charts */}
        <div className="bg-card rounded-xl shadow-card border border-border/50 p-5 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <PieChart size={14} className="text-primary" />
              <h4 className="text-sm font-semibold text-card-foreground">Projets par statut</h4>
            </div>
            {projectStatusData.length > 0 ? (
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie data={projectStatusData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={4} dataKey="value">
                      {projectStatusData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem", fontSize: 11 }} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">Aucune donnée</p>
            )}
            <div className="flex flex-wrap gap-2 justify-center">
              {projectStatusData.map((d, i) => (
                <span key={d.name} className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  {d.name} ({d.value})
                </span>
              ))}
            </div>
          </div>

          <div className="border-t border-border/50 pt-4">
            <div className="flex items-center gap-2 mb-2">
              <PieChart size={14} className="text-accent" />
              <h4 className="text-sm font-semibold text-card-foreground">Tickets par statut</h4>
            </div>
            {ticketStatusData.length > 0 ? (
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie data={ticketStatusData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={4} dataKey="value">
                      {ticketStatusData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem", fontSize: 11 }} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">Aucune donnée</p>
            )}
            <div className="flex flex-wrap gap-2 justify-center">
              {ticketStatusData.map((d, i) => (
                <span key={d.name} className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  {d.name} ({d.value})
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row: recent users + recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <div className="p-5 border-b border-border/50 flex items-center justify-between">
            <h3 className="font-semibold text-card-foreground flex items-center gap-2">
              <Users size={16} className="text-primary" /> Derniers inscrits
            </h3>
          </div>
          <div className="divide-y divide-border/50">
            {recentProfiles.map((p) => (
              <div key={p.id} className="p-4 hover:bg-muted/30 transition-colors flex items-center gap-3">
                <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-sm font-bold flex-shrink-0">
                  {(p.full_name || "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-card-foreground truncate">{p.full_name || "Non renseigné"}</p>
                  {p.company && <p className="text-xs text-muted-foreground truncate">{p.company}</p>}
                </div>
                <span className="text-[11px] text-muted-foreground/60 flex-shrink-0">
                  {new Date(p.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                </span>
              </div>
            ))}
            {recentProfiles.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground">Aucun utilisateur</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <div className="p-5 border-b border-border/50 flex items-center justify-between">
            <h3 className="font-semibold text-card-foreground flex items-center gap-2">
              <TrendingUp size={16} className="text-accent" /> Projets récents
            </h3>
          </div>
          <div className="divide-y divide-border/50">
            {projects.slice(0, 5).map((p) => (
              <div key={p.id} className="p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-medium text-card-foreground truncate flex-1">{p.name}</p>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    p.status === "en_cours" ? "text-primary bg-primary/10" :
                    p.status === "termine" ? "text-teal-600 bg-teal-600/10" : "text-muted-foreground bg-muted"
                  }`}>
                    {p.status === "en_cours" ? "En cours" : p.status === "termine" ? "Terminé" : "En attente"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${p.progress === 100 ? "bg-teal-500" : "bg-gradient-to-r from-primary to-accent"}`}
                      style={{ width: `${p.progress}%` }} />
                  </div>
                  <span className="text-[11px] font-bold text-card-foreground w-8 text-right">{p.progress}%</span>
                </div>
              </div>
            ))}
            {projects.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground">Aucun projet</p>
              </div>
            )}
          </div>
        </div>
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

                <h3 className="font-bold text-card-foreground text-lg leading-tight mb-1">{p.name}</h3>
                {p.description && <ExpandableText text={p.description} className="text-sm text-muted-foreground mb-2" maxLines="line-clamp-1" />}
                
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-[10px] font-bold flex-shrink-0">
                    {(profile?.full_name || "?").charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs text-primary font-medium">{profile?.full_name || "Non renseigné"}</span>
                  {profile?.company && <span className="text-xs text-muted-foreground">· {profile.company}</span>}
                </div>

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

  const [unrepliedIds, setUnrepliedIds] = useState<Set<string>>(new Set());

  const load = async () => {
    const { data: t } = await supabase.from("support_tickets").select("*").order("created_at", { ascending: false });
    setTickets(t || []);
    const { data: prof } = await supabase.from("profiles").select("*");
    const map: Record<string, any> = {};
    (prof || []).forEach((pr: any) => { map[pr.user_id] = pr; });
    setProfiles(map);

    // Check unreplied tickets
    if (t) {
      const unreplied = new Set<string>();
      for (const ticket of t.filter(tk => tk.status !== "résolu")) {
        const { data: adminReplies } = await supabase.from("ticket_replies").select("id").eq("ticket_id", ticket.id).eq("is_admin", true).limit(1);
        if (!adminReplies || adminReplies.length === 0) unreplied.add(ticket.id);
      }
      setUnrepliedIds(unreplied);
    }
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
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${sc.color} ${sc.bg}`}>
                      <sc.icon size={12} /> {sc.label}
                    </span>
                    {unrepliedIds.has(t.id) && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground animate-pulse">
                        <Bell size={10} /> Non répondu
                      </span>
                    )}
                  </div>
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
                <ExpandableText text={t.message} />

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

/* ─── Expandable Text Component ─── */
function ExpandableText({ text, className }: { text: string; className?: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text && text.length > 120;
  return (
    <div className={className || "text-sm text-muted-foreground mb-2"}>
      <p className={!expanded && isLong ? "line-clamp-2" : ""}>{text}</p>
      {isLong && (
        <button onClick={() => setExpanded(!expanded)} className="text-primary text-xs font-medium mt-1 hover:underline">
          {expanded ? "Réduire" : "Lire tout"}
        </button>
      )}
    </div>
  );
}

/* ─── Contact Card Component ─── */
function ContactCard({ contact: c, statusConfig: st, updateStatus, deleteContact }: { contact: any; statusConfig: { label: string; color: string }; updateStatus: (id: string, status: string) => void; deleteContact: (id: string) => void }) {
  return (
    <div className="bg-card rounded-xl p-5 border border-border/50 shadow-card hover:shadow-card-hover transition-all duration-300">
      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-semibold text-card-foreground">{c.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${st.color}`}>{st.label}</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{c.email}</span>
            {c.company && <span>• {c.company}</span>}
            <span>• {new Date(c.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <ExpandableText text={c.message} className="text-sm text-foreground/80 bg-muted/50 rounded-lg p-3 mt-2" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {c.status === "new" && (
            <Button size="sm" variant="outline" onClick={() => updateStatus(c.id, "read")}>Marquer lu</Button>
          )}
          {(c.status === "new" || c.status === "read") && (
            <Button size="sm" variant="outline" onClick={() => updateStatus(c.id, "replied")}>
              <Send size={14} className="mr-1" /> Répondu
            </Button>
          )}
          {c.status !== "archived" && (
            <Button size="sm" variant="ghost" onClick={() => updateStatus(c.id, "archived")}>Archiver</Button>
          )}
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteContact(c.id)}>Supprimer</Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Contact Requests Management ─── */
function AdminContacts() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("contact_requests").select("*").order("created_at", { ascending: false });
    setContacts(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("contact_requests").update({ status }).eq("id", id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "Statut mis à jour" }); load(); }
  };

  const deleteContact = async (id: string) => {
    const { error } = await supabase.from("contact_requests").delete().eq("id", id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "Demande supprimée" }); load(); }
  };

  const statusConfig: Record<string, { label: string; color: string }> = {
    new: { label: "Nouveau", color: "bg-primary/10 text-primary border-primary/20" },
    read: { label: "Lu", color: "bg-accent/10 text-accent border-accent/20" },
    replied: { label: "Répondu", color: "bg-teal-600/10 text-teal-600 border-teal-600/20" },
    archived: { label: "Archivé", color: "bg-muted text-muted-foreground border-border" },
  };

  const filtered = contacts.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()) || (c.company || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = { total: contacts.length, new: contacts.filter(c => c.status === "new").length, read: contacts.filter(c => c.status === "read").length, replied: contacts.filter(c => c.status === "replied").length };

  if (loading) return <div className="text-center text-muted-foreground py-12">Chargement...</div>;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total", value: counts.total, icon: MessageSquare, color: "bg-primary" },
          { label: "Nouveaux", value: counts.new, icon: Bell, color: "bg-destructive" },
          { label: "Lus", value: counts.read, icon: CheckCircle2, color: "bg-accent" },
          { label: "Répondus", value: counts.replied, icon: Send, color: "bg-teal-600" },
        ].map((c) => (
          <div key={c.label} className="bg-card rounded-xl p-5 shadow-card border border-border/50 hover:shadow-card-hover transition-all duration-300 group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground font-medium">{c.label}</span>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.color} group-hover:scale-110 transition-transform`}>
                <c.icon size={18} className="text-primary-foreground" />
              </div>
            </div>
            <p className="text-3xl font-bold text-card-foreground">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Rechercher par nom, email ou entreprise..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[{ val: "all", label: "Tous" }, { val: "new", label: "Nouveaux" }, { val: "read", label: "Lus" }, { val: "replied", label: "Répondus" }, { val: "archived", label: "Archivés" }].map(f => (
            <Button key={f.val} size="sm" variant={statusFilter === f.val ? "default" : "outline"} onClick={() => setStatusFilter(f.val)}>
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
      {filtered.map((c) => {
          const st = statusConfig[c.status] || statusConfig.new;
          return <ContactCard key={c.id} contact={c} statusConfig={st} updateStatus={updateStatus} deleteContact={deleteContact} />;
        })}
      </div>
      {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Aucune demande de contact trouvée.</p>}
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

  const toggleBlock = async (userId: string, currentlyBlocked: boolean) => {
    const { error } = await supabase.from("profiles").update({ blocked: !currentlyBlocked }).eq("user_id", userId);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else toast({ title: currentlyBlocked ? "Utilisateur débloqué" : "Utilisateur bloqué", description: currentlyBlocked ? "L'utilisateur peut maintenant se connecter." : "L'utilisateur ne pourra plus accéder à son espace." });
    load();
  };

  const restoreProfile = async (userId: string) => {
    const { error } = await supabase.from("profiles").update({ deleted_at: null } as any).eq("user_id", userId);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else toast({ title: "Profil restauré", description: "Le compte a été réactivé avec succès." });
    load();
  };

  const deleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement le compte de "${userName}" ? Cette action est irréversible.`)) return;
    const { data, error } = await supabase.functions.invoke("delete-user", { body: { user_id: userId } });
    if (error || data?.error) {
      toast({ title: "Erreur", description: data?.error || error?.message || "Impossible de supprimer l'utilisateur.", variant: "destructive" });
    } else {
      toast({ title: "Compte supprimé", description: `Le compte de "${userName}" a été supprimé définitivement.` });
      load();
    }
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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleBlock(p.user_id, !!p.blocked)}
                      title={p.blocked ? "Débloquer" : "Bloquer"}
                      className={`p-1.5 rounded-lg transition-colors ${p.blocked ? "bg-destructive/10 text-destructive hover:bg-destructive/20" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                    >
                      {p.blocked ? <ShieldBan size={16} /> : <ShieldCheck size={16} />}
                    </button>
                    <button
                      onClick={() => deleteUser(p.user_id, p.full_name || "cet utilisateur")}
                      title="Supprimer le compte"
                      className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
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
              {p.blocked && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-destructive font-medium">
                  <ShieldBan size={12} /> Compte bloqué
                </div>
              )}
              {(p as any).deleted_at && (
                <div className="mt-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs text-destructive font-medium">
                    <Trash2 size={12} /> Compte supprimé le {new Date((p as any).deleted_at).toLocaleDateString("fr-FR")}
                  </span>
                  <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => restoreProfile(p.user_id)}>
                    Restaurer
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Aucun utilisateur trouvé.</p>}
    </div>
  );
}
