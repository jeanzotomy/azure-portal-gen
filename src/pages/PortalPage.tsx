import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useUserRoles } from "@/hooks/use-admin";
import { useMfaCheck, clearSmsMfaVerified } from "@/hooks/use-mfa";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useTranslation } from "@/i18n/LanguageContext";
import { Progress } from "@/components/ui/progress";
import { Calendar as CalendarWidget } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, differenceInDays, isPast } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
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
import logo from "@/assets/cloudmature-logo.png";
import {
  LayoutDashboard, FolderOpen, LifeBuoy, User, LogOut, Send, Clock, CheckCircle2, AlertCircle,
  Menu, Bell, Search, Filter, Upload, X, FileText, DollarSign, Calendar, Cpu, Flag, Pencil, Shield,
  Activity, TrendingUp, Plus, Trash2, Info, RefreshCw, UserCheck, Briefcase,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import type { User as SupaUser } from "@supabase/supabase-js";
import { PortalInfoBar } from "@/components/PortalInfoBar";
import { NotificationBell } from "@/components/NotificationBell";
import ApplicationsTab from "@/components/ApplicationsTab";

type Tab = "dashboard" | "projects" | "tickets" | "applications" | "profile";

function PortalContent() {
  const { user, ready } = useAuthSession();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const navigate = useNavigate();
  const { isAdmin, isAgent, isComptable, isGestionnaire } = useUserRoles();
  const { mfaVerified, timedOut: mfaTimedOut } = useMfaCheck();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { t, locale } = useTranslation();

  useEffect(() => {
    if (ready && !user) {
      navigate("/auth");
    }
  }, [ready, user, navigate]);

  useEffect(() => {
    let active = true;

    const checkBlocked = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("blocked, deleted_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!active) return;

      if (data?.blocked || (data as { deleted_at?: string | null } | null)?.deleted_at) {
        await supabase.auth.signOut();
        navigate(data?.blocked ? "/auth?blocked=1" : "/auth?deleted=1");
      }
    };

    void checkBlocked();

    return () => {
      active = false;
    };
  }, [user, navigate]);

  useEffect(() => {
    if (mfaVerified === false && ready && user) navigate("/mfa");
  }, [mfaVerified, ready, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const checkProfile = async () => {
      const { data } = await supabase.from("profiles").select("full_name, company, phone, created_at").eq("user_id", user.id).maybeSingle();
      if (!data) return;
      const createdAt = new Date(data.created_at);
      const deadline = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);
      const now = new Date();
      const remaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const incomplete = !data.full_name || !data.company || !data.phone;
      if (incomplete && remaining > 0) {
        setProfileIncomplete(true);
        setDaysLeft(remaining);
      } else if (incomplete && remaining <= 0) {
        setProfileIncomplete(true);
        setDaysLeft(0);
      } else {
        setProfileIncomplete(false);
      }
    };
    void checkProfile();
  }, [user]);

  if (!ready || mfaVerified === null) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      <p className="text-muted-foreground text-sm">{t("portal.loading")}</p>
      {mfaTimedOut && (
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          {t("portal.retry") || "Réessayer"}
        </Button>
      )}
    </div>
  );
  if (!user) return null;

  const handleLogout = async () => {
    clearSmsMfaVerified();
    await supabase.auth.signOut();
    navigate("/");
  };

  const navItems: { id: Tab; icon: typeof LayoutDashboard; label: string }[] = [
    { id: "dashboard", icon: LayoutDashboard, label: t("portal.dashboard") },
    { id: "projects", icon: FolderOpen, label: t("portal.projects") },
    { id: "tickets", icon: LifeBuoy, label: t("portal.support") },
    { id: "applications", icon: Briefcase, label: "Mes candidatures" },
    { id: "profile", icon: User, label: t("portal.profile") },
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
            {(isAdmin || isAgent || isComptable || isGestionnaire) && (
              <SidebarMenuButton onClick={() => navigate("/admin")} tooltip={isAdmin ? t("portal.admin") : isGestionnaire ? "Espace Gestionnaire" : isComptable ? "Espace Comptable" : t("portal.agentSpace")} className="gap-3 text-primary">
                <Shield size={18} />
                <span>{isAdmin ? t("portal.admin") : isGestionnaire ? "Espace Gestionnaire" : isComptable ? "Espace Comptable" : t("portal.agentSpace")}</span>
              </SidebarMenuButton>
            )}
            <SidebarMenuButton onClick={handleLogout} tooltip={t("portal.logout")} className="text-destructive hover:text-destructive gap-3">
              <LogOut size={18} />
              <span>{t("portal.logout")}</span>
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
            {(isAdmin || isAgent || isComptable || isGestionnaire) && (
              <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium flex items-center gap-1 cursor-pointer hover:bg-primary/20 transition-colors" onClick={() => navigate("/admin")}>
                <Shield size={12} /> {isAdmin ? "Admin" : isGestionnaire ? "Gestionnaire" : isComptable ? "Comptable" : "Agent"}
              </span>
            )}
            <NotificationBell role="client" onNavigate={(target) => setTab(target as Tab)} />
            <button onClick={() => setTab("profile")} className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold cursor-pointer hover:opacity-80 transition-opacity" title={t("portal.profile")}>
              {(user.user_metadata?.full_name || user.email || "U").charAt(0).toUpperCase()}
            </button>
          </div>
        </header>
        <PortalInfoBar />

        <main className="flex-1 p-3 sm:p-6 overflow-auto">
          {profileIncomplete && (
            <Alert className="mb-4 border-warning bg-warning/10">
              <Info className="h-4 w-4 text-warning" />
              <AlertDescription className="text-warning-foreground">
                {daysLeft !== null && daysLeft > 0
                  ? t("portal.profileIncomplete").replace("{days}", String(daysLeft)).replace("{s}", daysLeft > 1 ? "s" : "")
                  : t("portal.profileOverdue")}
                <Button variant="link" className="ml-2 p-0 h-auto text-primary" onClick={() => setTab("profile")}>
                  {t("portal.completeProfile")}
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {tab === "dashboard" && <DashboardTab user={user} />}
          {tab === "projects" && <ProjectsTab user={user} />}
          {tab === "tickets" && <TicketsTab user={user} />}
          {tab === "applications" && <ApplicationsTab user={user} />}
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

function StatCard({ icon: Icon, label, value, color, subtitle }: { icon: typeof FolderOpen; label: string; value: number; color: string; subtitle?: string }) {
  return (
    <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 hover:shadow-card-hover hover:border-primary/20 transition-all duration-300 group">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} group-hover:scale-110 transition-transform duration-300`}>
          <Icon size={18} className="text-primary-foreground" />
        </div>
      </div>
      <p className="text-3xl font-bold text-card-foreground">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}

function DashboardTab({ user }: { user: SupaUser }) {
  const [projects, setProjects] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);

  const loadData = () => {
    supabase.from("projects").select("*").order("created_at", { ascending: false }).then(({ data }) => setProjects(data || []));
    supabase.from("support_tickets").select("*").order("created_at", { ascending: false }).then(({ data }) => setTickets(data || []));
  };

  useEffect(() => { loadData(); }, []);

  const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(199, 89%, 48%)", "hsl(160, 60%, 45%)"];

  const statusConfig: Record<string, { label: string; icon: typeof Clock; color: string; bg: string }> = {
    en_cours: { label: "En cours", icon: Clock, color: "text-primary", bg: "bg-primary/10" },
    termine: { label: "Terminé", icon: CheckCircle2, color: "text-teal-600", bg: "bg-teal-600/10" },
    en_attente: { label: "En attente", icon: AlertCircle, color: "text-muted-foreground", bg: "bg-muted" },
  };

  const ticketStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
    ouvert: { label: "Ouvert", color: "text-primary", bg: "bg-primary/10" },
    en_cours: { label: "En cours", color: "text-accent", bg: "bg-accent/10" },
    resolu: { label: "Résolu", color: "text-teal-600", bg: "bg-teal-600/10" },
    ferme: { label: "Fermé", color: "text-muted-foreground", bg: "bg-muted" },
  };

  const avgProgress = projects.length > 0
    ? Math.round(projects.reduce((sum, p) => sum + (p.progress || 0), 0) / projects.length)
    : 0;

  // Pie chart data
  const projectStatusData = [
    { name: "En cours", value: projects.filter(p => p.status === "en_cours").length },
    { name: "En attente", value: projects.filter(p => p.status === "en_attente").length },
    { name: "Terminé", value: projects.filter(p => p.status === "termine").length },
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
        projets: projects.filter(p => { const cd = new Date(p.created_at); return cd.getFullYear() === year && cd.getMonth() === month; }).length,
        tickets: tickets.filter(t => { const cd = new Date(t.created_at); return cd.getFullYear() === year && cd.getMonth() === month; }).length,
      });
    }
    return months;
  })();

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Welcome banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-accent/5 to-primary/10 rounded-2xl p-6 border border-primary/10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-foreground">Bienvenue, {user.user_metadata?.full_name || user.email?.split("@")[0]}</h1>
            <p className="text-muted-foreground mt-1">Voici un aperçu de votre espace client.</p>
          </div>
           <div className="hidden md:flex items-center gap-3 text-sm text-muted-foreground">
            <Button variant="outline" size="sm" onClick={loadData} className="gap-1.5">
              <RefreshCw size={14} /> Actualiser
            </Button>
            <span className="flex items-center gap-2">
              <Activity size={16} className="text-primary" />
              {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FolderOpen} label="Projets actifs" value={projects.filter(p => p.status === "en_cours").length} color="gradient-primary" subtitle={`${projects.length} total`} />
        <StatCard icon={LifeBuoy} label="Tickets ouverts" value={tickets.filter(t => t.status === "ouvert").length} color="bg-accent" subtitle={`${tickets.length} total`} />
        <StatCard icon={CheckCircle2} label="Complétés" value={projects.filter(p => p.status === "termine").length} color="bg-teal-600" />
        <StatCard icon={TrendingUp} label="Progression moy." value={avgProgress} color="bg-primary" subtitle={`${avgProgress}% en moyenne`} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Activity chart */}
        <div className="lg:col-span-2 bg-card rounded-xl shadow-card border border-border/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-primary" />
            <h3 className="font-semibold text-card-foreground">Mon activité</h3>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="clientGradProjects" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="clientGradTickets" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.75rem", fontSize: 12 }} />
                <Area type="monotone" dataKey="projets" stroke="hsl(var(--primary))" fill="url(#clientGradProjects)" strokeWidth={2} name="Projets" />
                <Area type="monotone" dataKey="tickets" stroke="hsl(var(--accent))" fill="url(#clientGradTickets)" strokeWidth={2} name="Tickets" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie chart */}
        <div className="bg-card rounded-xl shadow-card border border-border/50 p-5">
          <div className="flex items-center gap-2 mb-2">
            <FolderOpen size={14} className="text-primary" />
            <h4 className="text-sm font-semibold text-card-foreground">Projets par statut</h4>
          </div>
          {projectStatusData.length > 0 ? (
            <>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie data={projectStatusData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={4} dataKey="value">
                      {projectStatusData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem", fontSize: 11 }} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {projectStatusData.map((d, i) => (
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

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent projects */}
        <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <div className="p-5 border-b border-border/50 flex items-center justify-between">
            <h3 className="font-semibold text-card-foreground flex items-center gap-2">
              <FolderOpen size={16} className="text-primary" /> Projets récents
            </h3>
            <span className="text-xs text-muted-foreground">{projects.length} projet(s)</span>
          </div>
          {projects.length > 0 ? (
            <div className="divide-y divide-border/50">
              {projects.slice(0, 4).map((p) => {
                const sc = statusConfig[p.status] || statusConfig.en_cours;
                return (
                  <div key={p.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-card-foreground text-sm truncate">{p.project_number && <span className="text-muted-foreground mr-1.5">{p.project_number}</span>}{p.name}</p>
                        {p.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{p.description}</p>}
                      </div>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${sc.color} ${sc.bg}`}>
                        <sc.icon size={10} /> {sc.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 relative h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${p.progress === 100 ? "bg-teal-500" : "bg-gradient-to-r from-primary to-accent"}`}
                          style={{ width: `${p.progress}%` }} />
                      </div>
                      <span className="text-[11px] font-bold text-card-foreground w-8 text-right">{p.progress}%</span>
                    </div>
                    {p.deadline && (
                      <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
                        <Calendar size={10} /> Échéance : {(() => { try { return format(new Date(p.deadline), "d MMM yyyy", { locale: fr }); } catch { return p.deadline; } })()}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center">
              <FolderOpen size={32} className="mx-auto text-muted-foreground/20 mb-2" />
              <p className="text-sm text-muted-foreground">Aucun projet pour le moment</p>
            </div>
          )}
        </div>

        {/* Recent tickets */}
        <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <div className="p-5 border-b border-border/50 flex items-center justify-between">
            <h3 className="font-semibold text-card-foreground flex items-center gap-2">
              <LifeBuoy size={16} className="text-accent" /> Derniers tickets
            </h3>
            <span className="text-xs text-muted-foreground">{tickets.length} ticket(s)</span>
          </div>
          {tickets.length > 0 ? (
            <div className="divide-y divide-border/50">
              {tickets.slice(0, 4).map((t) => {
                const tc = ticketStatusConfig[t.status] || ticketStatusConfig.ouvert;
                return (
                  <div key={t.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-card-foreground text-sm truncate">{t.ticket_number && <span className="text-muted-foreground mr-1.5">{t.ticket_number}</span>}{t.subject}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{t.message}</p>
                      </div>
                      <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${tc.color} ${tc.bg}`}>
                        {tc.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
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
              <LifeBuoy size={32} className="mx-auto text-muted-foreground/20 mb-2" />
              <p className="text-sm text-muted-foreground">Aucun ticket pour le moment</p>
            </div>
          )}
        </div>
      </div>

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
  const [gestionnaireProfiles, setGestionnaireProfiles] = useState<Record<string, string>>({});
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const serviceOptions = [
    "Écosystème Microsoft 365 & Azure",
    "Licences & Souscriptions Cloud",
    "Infrastructures Hybrides & Privées",
    "Architecture & Ingénierie Cloud",
    "Migration & Modernisation",
    "Sécurité & Conformité",
    "Infogérance & Support Managé",
    "IA & Automatisation Intelligente",
    "Autres",
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

  const loadProjects = async () => {
    const { data } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
    setProjects(data || []);
    // Load gestionnaire profiles
    const gIds = [...new Set((data || []).map((p: any) => p.gestionnaire_id).filter(Boolean))];
    if (gIds.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", gIds);
      const map: Record<string, string> = {};
      (profs || []).forEach((pr: any) => { map[pr.user_id] = pr.full_name || "—"; });
      setGestionnaireProfiles(map);
    }
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
    // Get SharePoint config for the current user
    const { data: spConfig } = await supabase.from("sharepoint_config").select("*").limit(1).maybeSingle();
    
    for (const file of files) {
      try {
        if (spConfig?.site_id) {
          // Upload to SharePoint
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error("Not authenticated");
          
          // Get project info for folder name
          const { data: project } = await supabase.from("projects").select("name, project_number").eq("id", projectId).single();
          
          // Ensure project folder exists on SharePoint
          const ensureParams = new URLSearchParams({
            action: "ensure-project-folder",
            siteId: spConfig.site_id,
            ...(spConfig.drive_id ? { driveId: spConfig.drive_id } : {}),
            projectName: project?.name || projectId,
            ...(project?.project_number ? { projectNumber: project.project_number } : {}),
          });
          const ensureRes = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sharepoint-proxy?${ensureParams}`,
            { headers: { Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
          );
          if (!ensureRes.ok) {
            const errData = await ensureRes.json();
            throw new Error(errData.error || "Failed to create project folder");
          }
          const folder = await ensureRes.json();
          
          // Save SharePoint folder URL on the project if not already set
          if (folder.webUrl) {
            await supabase.from("projects").update({ sharepoint_folder_url: folder.webUrl }).eq("id", projectId).is("sharepoint_folder_url", null);
          }
          
          // Upload the file into the project folder
          const safeFolderName = folder.name;
          const uploadParams = new URLSearchParams({
            action: "upload-file",
            siteId: spConfig.site_id,
            ...(spConfig.drive_id ? { driveId: spConfig.drive_id } : {}),
            filePath: `${safeFolderName}/${file.name}`,
          });
          const uploadRes = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sharepoint-proxy?${uploadParams}`,
            {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${session.access_token}`,
                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                "Content-Type": file.type || "application/octet-stream",
              },
              body: file,
            }
          );
          if (!uploadRes.ok) {
            const errData = await uploadRes.json();
            throw new Error(errData.error || "SharePoint upload failed");
          }
          const uploadData = await uploadRes.json();
          
          // Record in project_files with SharePoint path
          await supabase.from("project_files").insert({
            project_id: projectId, user_id: user.id, file_name: file.name,
            file_path: uploadData.webUrl || `sharepoint://${safeFolderName}/${file.name}`,
            file_size: file.size, file_type: file.type,
          });
        } else {
          // Fallback: upload to Supabase Storage
          const filePath = `${user.id}/${projectId}/${Date.now()}_${file.name}`;
          const { error: uploadError } = await supabase.storage.from("project-files").upload(filePath, file);
          if (!uploadError) {
            await supabase.from("project_files").insert({
              project_id: projectId, user_id: user.id, file_name: file.name,
              file_path: filePath, file_size: file.size, file_type: file.type,
            });
          }
        }
      } catch (err) {
        console.error("File upload error:", err);
        toast({ title: "Erreur d'upload", description: err instanceof Error ? err.message : "Erreur inconnue", variant: "destructive" });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Vérifier que le profil est complet avant de soumettre
    if (!editingProject) {
      const { data: prof } = await supabase.from("profiles").select("full_name, company, country").eq("user_id", user.id).maybeSingle();
      if (!prof?.full_name || !prof?.company || !(prof as any).country) {
        toast({
          title: "Profil incomplet",
          description: "Veuillez compléter votre nom complet, entreprise et pays dans votre profil avant de soumettre un projet.",
          variant: "destructive",
        });
        return;
      }
    }
    if (!name.trim()) {
      toast({ title: "Champ requis", description: "Le nom du projet est obligatoire.", variant: "destructive" }); return;
    }
    if (!description.trim()) {
      toast({ title: "Champ requis", description: "La description est obligatoire.", variant: "destructive" }); return;
    }
    if (!budget.trim()) {
      toast({ title: "Champ requis", description: "Le budget estimé est obligatoire.", variant: "destructive" }); return;
    }
    if (!deadline.trim()) {
      toast({ title: "Champ requis", description: "Le délai souhaité est obligatoire.", variant: "destructive" }); return;
    }
    if (selectedServices.length === 0) {
      toast({ title: "Champ requis", description: "Veuillez sélectionner au moins un service.", variant: "destructive" }); return;
    }
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

  const statusFilterOptions = [
    { value: "all", label: "Tous" },
    { value: "en_attente", label: "En attente" },
    { value: "en_cours", label: "En cours" },
    { value: "termine", label: "Terminé" },
  ];

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.project_number || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === "en_cours").length;
  const pendingProjects = projects.filter((p) => p.status === "en_attente").length;
  const completedProjects = projects.filter((p) => p.status === "termine").length;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Mes Projets</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadProjects} className="gap-1.5">
            <RefreshCw size={14} /> <span className="hidden sm:inline">Actualiser</span>
          </Button>
          <Button onClick={openNewForm} size="sm" className="gradient-primary text-primary-foreground border-0">
            <Send size={14} className="mr-1.5" /> Soumettre
          </Button>
        </div>
      </div>

      {projects.length > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { label: "Total projets", value: totalProjects, helper: "Tous vos projets" },
              { label: "En cours", value: activeProjects, helper: "Travail actif" },
              { label: "En attente", value: pendingProjects, helper: "À démarrer" },
              { label: "Terminés", value: completedProjects, helper: "Livrés" },
            ].map((stat) => (
              <Card key={stat.label} className="border-border/50 shadow-card">
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{stat.label}</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{stat.helper}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="bg-card rounded-xl p-4 shadow-card border border-border/50 space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Rechercher un projet..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Filter size={12} /> Statut :</span>
              {statusFilterOptions.map((opt) => (
                <button key={opt.value} onClick={() => setStatusFilter(opt.value)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-colors ${statusFilter === opt.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                >{opt.label}</button>
              ))}
            </div>
          </div>
        </>
      )}

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProject ? "Modifier le projet" : "Nouveau projet"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-card-foreground flex items-center gap-1.5 mb-1.5"><FileText size={14} /> Nom du projet *</label>
              <Input placeholder="Ex: Refonte du site web" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-card-foreground flex items-center gap-1.5 mb-1.5"><FileText size={14} /> Description *</label>
              <Textarea placeholder="Décrivez votre projet, vos besoins et objectifs..." rows={4} required value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-card-foreground flex items-center gap-1.5 mb-1.5"><DollarSign size={14} /> Budget estimé *</label>
                <Input placeholder="Ex: 5000 - 10000 $" required value={budget} onChange={(e) => setBudget(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-card-foreground flex items-center gap-1.5 mb-1.5"><Calendar size={14} /> Délai souhaité *</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !deadline && "text-muted-foreground")}>
                      <Calendar size={14} className="mr-2" />
                      {deadline ? format(new Date(deadline), "PPP", { locale: fr }) : "Sélectionner une date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[60]" align="start">
                    <CalendarWidget
                      mode="single"
                      selected={deadline ? new Date(deadline) : undefined}
                      onSelect={(date) => setDeadline(date ? date.toISOString().split("T")[0] : "")}
                      disabled={(date) => date <= new Date()}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-card-foreground flex items-center gap-1.5 mb-1.5"><Cpu size={14} /> Services souhaités *</label>
              <div className="flex flex-wrap gap-2">
                {serviceOptions.map((service) => (
                  <button type="button" key={service} onClick={() => toggleService(service)}
                    className={`text-sm px-3 py-1.5 rounded-lg transition-colors border ${selectedServices.includes(service) ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border hover:bg-muted/80"}`}
                  >{service}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-card-foreground flex items-center gap-1.5 mb-1.5"><Flag size={14} /> Priorité *</label>
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
            <Button type="submit" className="w-full gradient-primary text-primary-foreground border-0" disabled={submitting}>
              <Send size={16} className="mr-2" /> {submitting ? "Envoi en cours..." : editingProject ? "Enregistrer les modifications" : "Soumettre le projet"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {projects.length === 0 && !showForm ? (
        <div className="bg-card rounded-xl p-12 shadow-card border border-border/50 text-center">
          <FolderOpen size={48} className="mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Aucun projet pour le moment.</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Soumettez votre premier projet ci-dessus.</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {filteredProjects.map((p) => {
            const sc = statusConfig[p.status] || statusConfig.en_cours;
            const priorityConfig: Record<string, { label: string; color: string; bg: string }> = {
              urgent: { label: "Urgent", color: "text-destructive", bg: "bg-destructive/10 border-destructive/20" },
              haute: { label: "Haute", color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/20" },
              normal: { label: "Normal", color: "text-muted-foreground", bg: "bg-muted border-border" },
            };
            const pc = priorityConfig[p.priority] || priorityConfig.normal;
            return (
              <div key={p.id} className="group relative bg-card rounded-2xl shadow-card border border-border/50 hover:shadow-card-hover hover:border-primary/30 transition-all duration-300 overflow-hidden">
                {/* Top accent bar */}
                <div className={`h-1 w-full ${p.status === "termine" ? "bg-teal-500" : p.status === "en_attente" ? "bg-muted-foreground/30" : "bg-gradient-to-r from-primary to-accent"}`} />

                <div className="p-5">
                  {/* Header: status + priority + edit */}
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
                      <button onClick={() => openEditForm(p)} className="sm:opacity-0 sm:group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all" title="Modifier">
                        <Pencil size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Title & description */}
                  {p.project_number && <span className="text-xs font-mono text-muted-foreground">{p.project_number}</span>}
                  <h3 className="font-bold text-card-foreground text-lg leading-tight mb-1">{p.name}</h3>
                  {p.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{p.description}</p>
                  )}
                  {p.gestionnaire_id && gestionnaireProfiles[p.gestionnaire_id] && (
                    <div className="flex items-center gap-2 mb-3">
                      <UserCheck size={14} className="text-accent shrink-0" />
                      <span className="text-xs text-accent font-medium">Gestionnaire : {gestionnaireProfiles[p.gestionnaire_id]}</span>
                    </div>
                  )}

                  {(p.budget || p.deadline || p.technologies || p.total_paid) && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {p.budget && (
                        <span className="inline-flex items-center gap-1 text-xs bg-primary/5 text-primary border border-primary/15 px-2.5 py-1 rounded-lg">
                          <DollarSign size={11} /> Budget: {p.budget}
                        </span>
                      )}
                      {(p.total_paid != null && p.total_paid > 0) && (
                        <span className="inline-flex items-center gap-1 text-xs bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2.5 py-1 rounded-lg dark:text-emerald-400">
                          <DollarSign size={11} /> Payé: {(p.total_paid || 0).toLocaleString("fr-CA", { style: "currency", currency: "CAD" })}
                        </span>
                      )}
                      {p.budget && (() => {
                        const bNum = parseFloat((p.budget || "0").replace(/[^\d.]/g, ""));
                        const solde = bNum - (p.total_paid || 0);
                        return (
                          <span className={`inline-flex items-center gap-1 text-xs border px-2.5 py-1 rounded-lg ${solde < 0 ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-primary/5 text-primary border-primary/15"}`}>
                            <DollarSign size={11} /> Solde: {solde.toLocaleString("fr-CA", { style: "currency", currency: "CAD" })}
                          </span>
                        );
                      })()}
                      {p.deadline && (() => {
                        const deadlineDate = new Date(p.deadline);
                        const days = differenceInDays(deadlineDate, new Date());
                        const overdue = isPast(deadlineDate);
                        const daysLabel = overdue ? `${Math.abs(days)}j en retard` : days === 0 ? "Aujourd'hui" : `${days}j restants`;
                        return (
                          <span className={`inline-flex items-center gap-1 text-xs border px-2.5 py-1 rounded-lg ${overdue ? "bg-destructive/10 text-destructive border-destructive/20" : days <= 7 ? "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20" : "bg-primary/5 text-primary border-primary/15"}`}>
                            <Calendar size={11} /> {(() => { try { return format(deadlineDate, "d MMM yyyy", { locale: fr }); } catch { return p.deadline; } })()}
                            <span className="font-semibold ml-0.5">· {daysLabel}</span>
                          </span>
                        );
                      })()}
                    </div>
                  )}
                  {p.technologies && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {p.technologies.split(", ").map((tech: string) => (
                        <span key={tech} className="text-[11px] bg-secondary/50 text-secondary-foreground/70 px-2 py-0.5 rounded-md">
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Progress */}
                  <div className="mt-auto">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-muted-foreground">Progression</span>
                      <span className="text-xs font-bold text-card-foreground">{p.progress}%</span>
                    </div>
                    <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${p.progress === 100 ? "bg-teal-500" : "bg-gradient-to-r from-primary to-accent"}`}
                        style={{ width: `${p.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Date */}
                  <p className="text-[11px] text-muted-foreground/50 mt-3">
                    Soumis le {new Date(p.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
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
  const [showForm, setShowForm] = useState(false);
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
      setShowForm(false);
      loadTickets();
    }
    setSending(false);
  };

  const filtered = filter === "all" ? tickets : tickets.filter(t => t.status === filter);
  const openCount = tickets.filter(t => t.status === "ouvert").length;
  const inProgressCount = tickets.filter(t => t.status === "en_cours").length;
  const resolvedCount = tickets.filter(t => t.status === "résolu").length;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Support</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Gérez vos demandes d'assistance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadTickets} className="gap-1.5">
            <RefreshCw size={14} /> <span className="hidden sm:inline">Actualiser</span>
          </Button>
          <Button
            onClick={() => setShowForm(!showForm)}
            size="sm"
            className="gradient-primary text-primary-foreground border-0"
          >
            {showForm ? <X size={14} className="mr-1" /> : <Plus size={14} className="mr-1" />}
            {showForm ? "Annuler" : "Nouveau ticket"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Ouverts", value: openCount, color: "text-primary", bg: "bg-primary/10" },
          { label: "En cours", value: inProgressCount, color: "text-accent", bg: "bg-accent/10" },
          { label: "Résolus", value: resolvedCount, color: "text-muted-foreground", bg: "bg-muted" },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl p-4 border border-border/50 shadow-card text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* New ticket form */}
      {showForm && (
        <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 animate-fade-up">
          <h3 className="font-semibold text-card-foreground mb-4 flex items-center gap-2">
            <LifeBuoy size={18} className="text-primary" /> Nouveau ticket
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input placeholder="Sujet" required value={subject} onChange={(e) => setSubject(e.target.value)} />
            <Textarea placeholder="Décrivez votre problème..." required rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
            <div className="flex justify-end">
              <Button type="submit" className="gradient-primary text-primary-foreground border-0" disabled={sending}>
                <Send size={16} className="mr-2" /> {sending ? "Envoi..." : "Envoyer"}
              </Button>
            </div>
          </form>
        </div>
      )}

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
                  {t.ticket_number && <span className="text-xs font-mono text-muted-foreground">{t.ticket_number}</span>}
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
  const [profile, setProfile] = useState({ first_name: "", last_name: "", full_name: "", company: "", phone: "", location: "", timezone: "", country: "", city: "", address_line: "" });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const loadProfile = () => {
    supabase.from("profiles").select("*").eq("user_id", user.id).single().then(({ data }) => {
      if (data) setProfile({
        first_name: (data as any).first_name || "",
        last_name: (data as any).last_name || "",
        full_name: data.full_name || "",
        company: data.company || "",
        phone: data.phone || "",
        location: (data as any).location || "",
        timezone: (data as any).timezone || "",
        country: (data as any).country || "",
        city: (data as any).city || "",
        address_line: (data as any).address_line || "",
      });
    });
  };

  useEffect(() => { loadProfile(); }, [user.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const fullName = `${profile.first_name.trim()} ${profile.last_name.trim()}`.trim();
    const { error } = await supabase.from("profiles").update({ ...profile, full_name: fullName || profile.full_name }).eq("user_id", user.id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else toast({ title: "Profil mis à jour!" });
    setSaving(false);
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Mon Profil</h1>
        <Button variant="outline" size="sm" onClick={loadProfile} className="gap-1.5">
          <RefreshCw size={14} /> Actualiser
        </Button>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 bg-card rounded-xl p-4 sm:p-6 shadow-card border border-border/50">
        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xl sm:text-2xl font-bold shrink-0">
          {(profile.full_name || user.email || "U").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-card-foreground text-base sm:text-lg truncate">{profile.full_name || "Non renseigné"}</p>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">{user.email}</p>
          {profile.company && <p className="text-xs sm:text-sm text-muted-foreground truncate">{profile.company}</p>}
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-card rounded-xl p-6 shadow-card border border-border/50 space-y-6">
        <h3 className="font-semibold text-card-foreground mb-2">Modifier mes informations</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Colonne 1 : Informations personnelles */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-primary flex items-center gap-1.5"><User size={14} /> Informations personnelles</h4>
            <div>
              <label className="text-sm font-medium text-card-foreground">Email</label>
              <Input value={user.email || ""} disabled className="mt-1 bg-muted" />
            </div>
            <div>
              <label className="text-sm font-medium text-card-foreground">Prénom</label>
              <Input value={profile.first_name} onChange={(e) => setProfile({ ...profile, first_name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-card-foreground">Nom</label>
              <Input value={profile.last_name} onChange={(e) => setProfile({ ...profile, last_name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-card-foreground">Téléphone</label>
              <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="mt-1" />
            </div>
          </div>

          {/* Colonne 2 : Adresse */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-primary flex items-center gap-1.5"><Flag size={14} /> Adresse</h4>
            <div>
              <label className="text-sm font-medium text-card-foreground">Entreprise</label>
              <Input value={profile.company} onChange={(e) => setProfile({ ...profile, company: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-card-foreground">Pays</label>
              <select
                value={profile.country}
                onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Sélectionner un pays</option>
                <option value="GN">🇬🇳 Guinée</option>
                <optgroup label="Afrique">
                  <option value="DZ">Algérie</option>
                  <option value="AO">Angola</option>
                  <option value="BJ">Bénin</option>
                  <option value="BW">Botswana</option>
                  <option value="BF">Burkina Faso</option>
                  <option value="BI">Burundi</option>
                  <option value="CM">Cameroun</option>
                  <option value="CV">Cap-Vert</option>
                  <option value="CF">Centrafrique</option>
                  <option value="TD">Tchad</option>
                  <option value="KM">Comores</option>
                  <option value="CG">Congo</option>
                  <option value="CD">RD Congo</option>
                  <option value="CI">Côte d'Ivoire</option>
                  <option value="DJ">Djibouti</option>
                  <option value="EG">Égypte</option>
                  <option value="GQ">Guinée équatoriale</option>
                  <option value="ER">Érythrée</option>
                  <option value="SZ">Eswatini</option>
                  <option value="ET">Éthiopie</option>
                  <option value="GA">Gabon</option>
                  <option value="GM">Gambie</option>
                  <option value="GH">Ghana</option>
                  <option value="GW">Guinée-Bissau</option>
                  <option value="KE">Kenya</option>
                  <option value="LS">Lesotho</option>
                  <option value="LR">Liberia</option>
                  <option value="LY">Libye</option>
                  <option value="MG">Madagascar</option>
                  <option value="MW">Malawi</option>
                  <option value="ML">Mali</option>
                  <option value="MR">Mauritanie</option>
                  <option value="MU">Maurice</option>
                  <option value="MA">Maroc</option>
                  <option value="MZ">Mozambique</option>
                  <option value="NA">Namibie</option>
                  <option value="NE">Niger</option>
                  <option value="NG">Nigeria</option>
                  <option value="RW">Rwanda</option>
                  <option value="ST">São Tomé-et-Príncipe</option>
                  <option value="SN">Sénégal</option>
                  <option value="SC">Seychelles</option>
                  <option value="SL">Sierra Leone</option>
                  <option value="SO">Somalie</option>
                  <option value="ZA">Afrique du Sud</option>
                  <option value="SS">Soudan du Sud</option>
                  <option value="SD">Soudan</option>
                  <option value="TZ">Tanzanie</option>
                  <option value="TG">Togo</option>
                  <option value="TN">Tunisie</option>
                  <option value="UG">Ouganda</option>
                  <option value="ZM">Zambie</option>
                  <option value="ZW">Zimbabwe</option>
                </optgroup>
                <optgroup label="Europe">
                  <option value="AL">Albanie</option>
                  <option value="DE">Allemagne</option>
                  <option value="AT">Autriche</option>
                  <option value="BE">Belgique</option>
                  <option value="BA">Bosnie-Herzégovine</option>
                  <option value="BG">Bulgarie</option>
                  <option value="HR">Croatie</option>
                  <option value="DK">Danemark</option>
                  <option value="ES">Espagne</option>
                  <option value="EE">Estonie</option>
                  <option value="FI">Finlande</option>
                  <option value="FR">France</option>
                  <option value="GR">Grèce</option>
                  <option value="HU">Hongrie</option>
                  <option value="IE">Irlande</option>
                  <option value="IS">Islande</option>
                  <option value="IT">Italie</option>
                  <option value="LV">Lettonie</option>
                  <option value="LT">Lituanie</option>
                  <option value="LU">Luxembourg</option>
                  <option value="MK">Macédoine du Nord</option>
                  <option value="MT">Malte</option>
                  <option value="MD">Moldavie</option>
                  <option value="ME">Monténégro</option>
                  <option value="NO">Norvège</option>
                  <option value="NL">Pays-Bas</option>
                  <option value="PL">Pologne</option>
                  <option value="PT">Portugal</option>
                  <option value="CZ">République tchèque</option>
                  <option value="RO">Roumanie</option>
                  <option value="GB">Royaume-Uni</option>
                  <option value="RS">Serbie</option>
                  <option value="SK">Slovaquie</option>
                  <option value="SI">Slovénie</option>
                  <option value="SE">Suède</option>
                  <option value="CH">Suisse</option>
                  <option value="UA">Ukraine</option>
                </optgroup>
                <optgroup label="Amérique">
                  <option value="AR">Argentine</option>
                  <option value="BR">Brésil</option>
                  <option value="CA">Canada</option>
                  <option value="CL">Chili</option>
                  <option value="CO">Colombie</option>
                  <option value="CR">Costa Rica</option>
                  <option value="CU">Cuba</option>
                  <option value="DO">République dominicaine</option>
                  <option value="EC">Équateur</option>
                  <option value="US">États-Unis</option>
                  <option value="GT">Guatemala</option>
                  <option value="HT">Haïti</option>
                  <option value="HN">Honduras</option>
                  <option value="JM">Jamaïque</option>
                  <option value="MX">Mexique</option>
                  <option value="PA">Panama</option>
                  <option value="PY">Paraguay</option>
                  <option value="PE">Pérou</option>
                  <option value="TT">Trinité-et-Tobago</option>
                  <option value="UY">Uruguay</option>
                  <option value="VE">Venezuela</option>
                </optgroup>
                <optgroup label="Asie">
                  <option value="SA">Arabie saoudite</option>
                  <option value="CN">Chine</option>
                  <option value="KR">Corée du Sud</option>
                  <option value="AE">Émirats arabes unis</option>
                  <option value="IN">Inde</option>
                  <option value="ID">Indonésie</option>
                  <option value="IQ">Irak</option>
                  <option value="IL">Israël</option>
                  <option value="JP">Japon</option>
                  <option value="JO">Jordanie</option>
                  <option value="KW">Koweït</option>
                  <option value="LB">Liban</option>
                  <option value="MY">Malaisie</option>
                  <option value="PK">Pakistan</option>
                  <option value="PH">Philippines</option>
                  <option value="QA">Qatar</option>
                  <option value="SG">Singapour</option>
                  <option value="TH">Thaïlande</option>
                  <option value="TR">Turquie</option>
                  <option value="VN">Vietnam</option>
                </optgroup>
                <optgroup label="Océanie">
                  <option value="AU">Australie</option>
                  <option value="NZ">Nouvelle-Zélande</option>
                </optgroup>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-card-foreground">Ville</label>
              <Input value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} placeholder="Ex: Conakry" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-card-foreground">Adresse postale</label>
              <Input value={profile.address_line} onChange={(e) => setProfile({ ...profile, address_line: e.target.value })} placeholder="Ex: Quartier Almamya, Commune de Kaloum" className="mt-1" />
            </div>
          </div>

          {/* Colonne 3 : Localisation */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-primary flex items-center gap-1.5"><Clock size={14} /> Localisation</h4>
            <div>
              <label className="text-sm font-medium text-card-foreground">Fuseau horaire</label>
              <select
                value={profile.timezone}
                onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Sélectionner un fuseau horaire</option>
                <option value="America/Toronto">Eastern (Toronto)</option>
                <option value="America/Montreal">Eastern (Montréal)</option>
                <option value="America/Winnipeg">Central (Winnipeg)</option>
                <option value="America/Edmonton">Mountain (Edmonton)</option>
                <option value="America/Vancouver">Pacific (Vancouver)</option>
                <option value="Europe/Paris">Europe (Paris)</option>
                <option value="Europe/London">Europe (Londres)</option>
                <option value="Africa/Casablanca">Afrique (Casablanca)</option>
                <option value="Africa/Conakry">Afrique (Conakry)</option>
                <option value="Asia/Dubai">Asie (Dubaï)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </div>
        </div>

        <Button type="submit" className="gradient-primary text-primary-foreground border-0" disabled={saving}>
          {saving ? "Sauvegarde..." : "Sauvegarder"}
        </Button>
      </form>

      {/* Delete account section */}
      <div className="bg-card rounded-xl p-6 shadow-card border border-destructive/20 max-w-lg space-y-4">
        <h3 className="font-semibold text-destructive flex items-center gap-2">
          <Trash2 size={18} /> Supprimer mon compte
        </h3>
        <p className="text-sm text-muted-foreground">
          Cette action désactivera votre compte. Seul un administrateur pourra le restaurer. Vos données seront conservées mais votre accès sera révoqué.
        </p>
        <Button
          variant="destructive"
          onClick={async () => {
            if (!window.confirm("Êtes-vous sûr de vouloir supprimer votre compte ? Cette action désactivera votre accès.")) return;
            const { error } = await supabase.from("profiles").update({ deleted_at: new Date().toISOString() } as any).eq("user_id", user.id);
            if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
            toast({ title: "Compte supprimé", description: "Votre compte a été désactivé." });
            await supabase.auth.signOut();
            window.location.href = "/";
          }}
        >
          <Trash2 size={14} className="mr-2" /> Supprimer mon compte
        </Button>
      </div>
    </div>
  );
}
