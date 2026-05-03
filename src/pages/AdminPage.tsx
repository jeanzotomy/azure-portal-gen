import { useEffect, useRef, useState } from "react";
import adminLogo from "@/assets/cloudmature-logo.png";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/use-admin";
import { useMfaCheck, clearSmsMfaVerified } from "@/hooks/use-mfa";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useTranslation } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarWidget } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, differenceInDays, isPast } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, FolderOpen, LifeBuoy, Users, LogOut, Shield, Clock, CheckCircle2,
  AlertCircle, Bell, ChevronDown, ChevronUp, MessageSquare, Search, Send, UserCog,
  Flag, DollarSign, Calendar, Filter, TrendingUp, Activity, BarChart3, PieChart, ShieldBan, ShieldCheck, Trash2, RefreshCw,
  Smartphone, Phone, X, UserCheck, UserPlus, Upload, FileSpreadsheet, Pencil,
  LayoutGrid, List as ListIcon, Table as TableIcon, MapPin, Mail, Download,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HardDrive } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import SharePointTab from "@/components/SharePointTab";
import ServiceClientsTab from "@/components/ServiceClientsTab";
import ServiceCatalogTab from "@/components/ServiceCatalogTab";
import ServiceInvoicesTab from "@/components/ServiceInvoicesTab";
import { Briefcase, BookOpen, Receipt, CreditCard, PenLine } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, AreaChart, Area } from "recharts";
import type { User as SupaUser } from "@supabase/supabase-js";
import { PortalInfoBar } from "@/components/PortalInfoBar";
import { NotificationBell } from "@/components/NotificationBell";
import PaymentMethodsTab from "@/components/PaymentMethodsTab";
import HrTab from "@/components/HrTab";
import { ProfileSignatureDialog } from "@/components/ProfileSignatureDialog";
import { getDialCode, applyDialCode } from "@/lib/country-dial-codes";

type AdminTab = "dashboard" | "projects" | "tickets" | "users" | "contacts" | "sharepoint" | "service-clients" | "service-catalog" | "service-invoices" | "payment-methods" | "hr";
type AgentTab = "dashboard" | "tickets" | "contacts";
type GestionnaireTab = "dashboard" | "projects" | "sharepoint" | "tickets" | "contacts" | "hr" | "service-clients" | "service-catalog" | "service-invoices" | "payment-methods";

function ComptableViewInline({ user, collapsed, handleLogout }: { user: SupaUser; collapsed: boolean; handleLogout: () => void }) {
  const [tab, setTab] = useState<"projects" | "sharepoint" | "service-clients" | "service-catalog" | "service-invoices" | "payment-methods">("projects");
  const [signatureOpen, setSignatureOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const servicesGroup = [
    { id: "service-clients" as const, icon: Briefcase, label: "Clients facturables" },
    { id: "service-catalog" as const, icon: BookOpen, label: "Catalogue services" },
    { id: "service-invoices" as const, icon: Receipt, label: "Facturation services" },
    { id: "payment-methods" as const, icon: CreditCard, label: "Modes de paiement" },
  ];

  const navItems = [
    { id: "projects" as const, icon: FolderOpen, label: t("admin.projects") },
    { id: "sharepoint" as const, icon: HardDrive, label: "SharePoint" },
    ...servicesGroup,
  ];

  const isServicesTab = servicesGroup.some((s) => s.id === tab);
  const [servicesOpen, setServicesOpen] = useState(true);
  useEffect(() => { if (isServicesTab) setServicesOpen(true); }, [isServicesTab]);

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
                  <span className="block text-xs text-teal-500 font-medium">Comptable</span>
                </div>
              )}
            </Link>
          </div>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => setTab("projects")} isActive={tab === "projects"} tooltip={t("admin.projects")} className="gap-3">
                    <FolderOpen size={18} />
                    <span>{t("admin.projects")}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => setTab("sharepoint")} isActive={tab === "sharepoint"} tooltip="SharePoint" className="gap-3">
                    <HardDrive size={18} />
                    <span>SharePoint</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => {
                      setServicesOpen((v) => !v);
                      if (!isServicesTab) setTab("service-clients");
                    }}
                    isActive={isServicesTab}
                    tooltip="Services aux clients" data-keep-mobile-open="true"
                    className="gap-3"
                  >
                    <Briefcase size={18} />
                    <span className="flex-1 text-left">Services aux clients</span>
                    {servicesOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </SidebarMenuButton>
                  {servicesOpen && (
                    <SidebarMenuSub>
                      {servicesGroup.map((s) => (
                        <SidebarMenuSubItem key={s.id}>
                          <SidebarMenuSubButton onClick={() => setTab(s.id)} isActive={tab === s.id} className="gap-2 cursor-pointer">
                            <s.icon size={14} />
                            <span>{s.label}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <div className="mt-auto p-3 border-t border-sidebar-border space-y-1">
            <SidebarMenuButton onClick={() => navigate("/portal")} tooltip={t("admin.portalClient")} className="gap-3 text-muted-foreground">
              <Shield size={18} />
              <span>{t("admin.portalClient")}</span>
            </SidebarMenuButton>
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
              {navItems.find((n) => n.id === tab)?.label}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-teal-500/10 text-teal-500 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
              <Shield size={12} /> Comptable
            </span>
            <NotificationBell role="comptable" onNavigate={(target) => setTab(target as typeof tab)} />
            <button
              onClick={() => setSignatureOpen(true)}
              title="Ma signature"
              className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold cursor-pointer hover:opacity-80 transition-opacity"
            >
              {(user.user_metadata?.full_name || user.email || "C").charAt(0).toUpperCase()}
            </button>
          </div>
        </header>
        <PortalInfoBar />
        <main className="flex-1 p-3 sm:p-6 pb-[calc(80px+env(safe-area-inset-bottom))] md:pb-6 overflow-auto">
          {tab === "projects" && <AdminProjectsInner readOnly />}
          {tab === "sharepoint" && <SharePointTab readOnly={false} />}
          {tab === "service-clients" && <ServiceClientsTab />}
          {tab === "service-catalog" && <ServiceCatalogTab />}
          {tab === "service-invoices" && <ServiceInvoicesTab />}
          {tab === "payment-methods" && <PaymentMethodsTab />}
        </main>
      </div>
      <ProfileSignatureDialog open={signatureOpen} onOpenChange={setSignatureOpen} />
    </div>
  );
}

function AdminContent() {
  const { user, ready } = useAuthSession();
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [agentTab, setAgentTab] = useState<AgentTab>("dashboard");
  const [gestionnaireTab, setGestionnaireTab] = useState<GestionnaireTab>("dashboard");
  const { isAdmin, isAgent, isComptable, isGestionnaire, loading: rolesLoading } = useUserRoles();
  const { mfaVerified, timedOut: mfaTimedOut } = useMfaCheck();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [unrepliedCount, setUnrepliedCount] = useState(0);
  const [assignedProjectsCount, setAssignedProjectsCount] = useState(0);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [adminServicesOpen, setAdminServicesOpen] = useState(true);
  const [gestionnaireServicesOpen, setGestionnaireServicesOpen] = useState(true);
  const { t } = useTranslation();

  // Auto-open services submenu when a services tab is active. Must run before any early return to keep hook order stable.
  const ADMIN_SERVICES_TABS: AdminTab[] = ["service-clients", "service-catalog", "service-invoices", "payment-methods"];
  const GESTIONNAIRE_SERVICES_TABS: GestionnaireTab[] = ["service-clients", "service-catalog", "service-invoices", "payment-methods"];
  const isAdminServicesTab = ADMIN_SERVICES_TABS.includes(tab);
  const isGestionnaireServicesTab = GESTIONNAIRE_SERVICES_TABS.includes(gestionnaireTab);
  useEffect(() => { if (isAdminServicesTab) setAdminServicesOpen(true); }, [isAdminServicesTab]);
  useEffect(() => { if (isGestionnaireServicesTab) setGestionnaireServicesOpen(true); }, [isGestionnaireServicesTab]);

  useEffect(() => {
    const fetchUnreplied = async () => {
      const { data: tickets } = await supabase.from("support_tickets").select("id, status");
      if (!tickets) return;
      const openTickets = tickets.filter((t) => t.status !== "résolu");
      let count = 0;
      for (const t of openTickets) {
        const { data: replies } = await supabase.from("ticket_replies").select("id").eq("ticket_id", t.id).eq("is_admin", true).limit(1);
        if (!replies || replies.length === 0) count++;
      }
      setUnrepliedCount(count);
    };
    void fetchUnreplied();
    const interval = setInterval(fetchUnreplied, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isGestionnaire || !user) return;
    const fetchAssigned = async () => {
      const { count } = await supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("gestionnaire_id", user.id);
      setAssignedProjectsCount(count ?? 0);
    };
    void fetchAssigned();
    const interval = setInterval(fetchAssigned, 30000);
    return () => clearInterval(interval);
  }, [isGestionnaire, user]);

  // Auth/MFA/role/blocked gating is handled upstream by <AuthGuard>; we only verify presence here.
  if (!user || (!isAdmin && !isAgent && !isComptable && !isGestionnaire)) return null;

  const handleLogout = async () => {
    clearSmsMfaVerified();
    await supabase.auth.signOut();
    navigate("/");
  };

  if (isComptable && !isAdmin && !isAgent && !isGestionnaire) {
    return <ComptableViewInline user={user} collapsed={collapsed} handleLogout={handleLogout} />;
  }

  if (isGestionnaire && !isAdmin) {
    const gestionnaireNavItems: { id: GestionnaireTab; icon: typeof LayoutDashboard; label: string }[] = [
      { id: "dashboard", icon: LayoutDashboard, label: t("admin.overview") },
      { id: "projects", icon: FolderOpen, label: t("admin.projects") },
      { id: "sharepoint", icon: HardDrive, label: "SharePoint" },
      { id: "tickets", icon: LifeBuoy, label: t("admin.tickets") },
      { id: "contacts", icon: MessageSquare, label: t("admin.contacts") },
      { id: "hr", icon: Briefcase, label: "Recrutement" },
    ];

    const gestionnaireServicesGroup: { id: GestionnaireTab; icon: typeof LayoutDashboard; label: string }[] = [
      { id: "service-clients", icon: Briefcase, label: "Clients facturables" },
      { id: "service-catalog", icon: BookOpen, label: "Catalogue services" },
      { id: "service-invoices", icon: Receipt, label: "Facturation services" },
      { id: "payment-methods", icon: CreditCard, label: "Méthodes de paiement" },
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
                    <span className="block text-xs text-blue-500 font-medium">Gestionnaire</span>
                  </div>
                )}
              </Link>
            </div>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {gestionnaireNavItems.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton onClick={() => setGestionnaireTab(item.id)} isActive={gestionnaireTab === item.id} tooltip={item.label} className="gap-3">
                        <div className="relative">
                          <item.icon size={18} />
                          {item.id === "tickets" && unrepliedCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                              {unrepliedCount}
                            </span>
                          )}
                          {item.id === "projects" && assignedProjectsCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                              {assignedProjectsCount}
                            </span>
                          )}
                        </div>
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => {
                        setGestionnaireServicesOpen((v) => !v);
                        if (!isGestionnaireServicesTab) setGestionnaireTab("service-clients");
                      }}
                      isActive={isGestionnaireServicesTab}
                      tooltip="Services aux clients" data-keep-mobile-open="true"
                      className="gap-3"
                    >
                      <Briefcase size={18} />
                      <span className="flex-1 text-left">Services aux clients</span>
                      {gestionnaireServicesOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </SidebarMenuButton>
                    {gestionnaireServicesOpen && (
                      <SidebarMenuSub>
                        {gestionnaireServicesGroup.map((s) => (
                          <SidebarMenuSubItem key={s.id}>
                            <SidebarMenuSubButton onClick={() => setGestionnaireTab(s.id)} isActive={gestionnaireTab === s.id} className="gap-2 cursor-pointer">
                              <s.icon size={14} />
                              <span>{s.label}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    )}
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <div className="mt-auto p-3 border-t border-sidebar-border space-y-1">
              <SidebarMenuButton onClick={() => navigate("/portal")} tooltip={t("admin.portalClient")} className="gap-3 text-muted-foreground">
                <Shield size={18} />
                <span>{t("admin.portalClient")}</span>
              </SidebarMenuButton>
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
                {[...gestionnaireNavItems, ...gestionnaireServicesGroup].find((n) => n.id === gestionnaireTab)?.label}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-blue-500/10 text-blue-500 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                <Shield size={12} /> Gestionnaire
              </span>
              <NotificationBell role="gestionnaire" onNavigate={(target) => setGestionnaireTab(target as GestionnaireTab)} />
              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                {(user.user_metadata?.full_name || user.email || "G").charAt(0).toUpperCase()}
              </div>
            </div>
          </header>
          <PortalInfoBar />
          <main className="flex-1 p-3 sm:p-6 pb-[calc(80px+env(safe-area-inset-bottom))] md:pb-6 overflow-auto">
            {gestionnaireTab === "dashboard" && <AdminDashboard />}
            {gestionnaireTab === "projects" && <AdminProjects assignedCount={assignedProjectsCount} />}
            {gestionnaireTab === "tickets" && <AdminTickets />}
            {gestionnaireTab === "contacts" && <AdminContacts />}
            {gestionnaireTab === "sharepoint" && <SharePointTab readOnly />}
            {gestionnaireTab === "hr" && <HrTab />}
            {gestionnaireTab === "service-clients" && <ServiceClientsTab />}
            {gestionnaireTab === "service-catalog" && <ServiceCatalogTab />}
            {gestionnaireTab === "service-invoices" && <ServiceInvoicesTab />}
            {gestionnaireTab === "payment-methods" && <PaymentMethodsTab />}
          </main>
        </div>
      </div>
    );
  }

  if (isAgent && !isAdmin) {
    const agentNavItems: { id: AgentTab; icon: typeof LayoutDashboard; label: string }[] = [
      { id: "dashboard", icon: LayoutDashboard, label: t("portal.dashboard") },
      { id: "tickets", icon: LifeBuoy, label: t("admin.tickets") },
      { id: "contacts", icon: MessageSquare, label: t("admin.contacts") },
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
              <SidebarMenuButton onClick={() => navigate("/portal")} tooltip={t("admin.portalClient")} className="gap-3 text-muted-foreground">
                <Shield size={18} />
                <span>{t("admin.portalClient")}</span>
              </SidebarMenuButton>
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
                {agentNavItems.find((n) => n.id === agentTab)?.label}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-accent/10 text-accent px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                <Shield size={12} /> Agent
              </span>
              <NotificationBell role="agent" onNavigate={(target) => setAgentTab(target as AgentTab)} />
              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                {(user.user_metadata?.full_name || user.email || "A").charAt(0).toUpperCase()}
              </div>
            </div>
          </header>
          <PortalInfoBar />
          <main className="flex-1 p-3 sm:p-6 pb-[calc(80px+env(safe-area-inset-bottom))] md:pb-6 overflow-auto">
            {agentTab === "dashboard" && <AgentDashboard user={user} />}
            {agentTab === "tickets" && <AdminTickets />}
            {agentTab === "contacts" && <AdminContacts />}
          </main>
        </div>
      </div>
    );
  }

  const adminServicesGroup: { id: AdminTab; icon: typeof LayoutDashboard; label: string }[] = [
    { id: "service-clients", icon: Briefcase, label: "Clients facturables" },
    { id: "service-catalog", icon: BookOpen, label: "Catalogue services" },
    { id: "service-invoices", icon: Receipt, label: "Facturation services" },
    { id: "payment-methods", icon: CreditCard, label: "Modes de paiement" },
  ];

  const allNavItems: { id: AdminTab; icon: typeof LayoutDashboard; label: string }[] = [
    { id: "dashboard", icon: LayoutDashboard, label: t("admin.overview") },
    { id: "projects", icon: FolderOpen, label: t("admin.projects") },
    { id: "sharepoint", icon: HardDrive, label: "SharePoint" },
    { id: "tickets", icon: LifeBuoy, label: t("admin.tickets") },
    { id: "contacts", icon: MessageSquare, label: t("admin.contacts") },
    { id: "users", icon: Users, label: t("admin.users") },
    { id: "hr", icon: Briefcase, label: "Recrutement" },
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
                {allNavItems.slice(0, 3).map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton onClick={() => setTab(item.id)} isActive={tab === item.id} tooltip={item.label} className="gap-3">
                      <item.icon size={18} />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => {
                      setAdminServicesOpen((v) => !v);
                      if (!isAdminServicesTab) setTab("service-clients");
                    }}
                    isActive={isAdminServicesTab}
                    tooltip="Services aux clients" data-keep-mobile-open="true"
                    className="gap-3"
                  >
                    <Briefcase size={18} />
                    <span className="flex-1 text-left">Services aux clients</span>
                    {adminServicesOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </SidebarMenuButton>
                  {adminServicesOpen && (
                    <SidebarMenuSub>
                      {adminServicesGroup.map((s) => (
                        <SidebarMenuSubItem key={s.id}>
                          <SidebarMenuSubButton onClick={() => setTab(s.id)} isActive={tab === s.id} className="gap-2 cursor-pointer">
                            <s.icon size={14} />
                            <span>{s.label}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
                {allNavItems.slice(3).map((item) => (
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
            <SidebarMenuButton onClick={() => navigate("/portal")} tooltip={t("admin.portalClient")} className="gap-3 text-muted-foreground">
              <Shield size={18} />
              <span>{t("admin.portalClient")}</span>
            </SidebarMenuButton>
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
              {[...allNavItems, ...adminServicesGroup].find((n) => n.id === tab)?.label}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
              <Shield size={12} /> Admin
            </span>
            <NotificationBell role="admin" onNavigate={(target) => setTab(target as AdminTab)} />
            <button
              onClick={() => setSignatureOpen(true)}
              title="Ma signature"
              className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold cursor-pointer hover:opacity-80 transition-opacity"
            >
              {(user.user_metadata?.full_name || user.email || "A").charAt(0).toUpperCase()}
            </button>
          </div>
        </header>
        <PortalInfoBar />

        <main className="flex-1 p-3 sm:p-6 pb-[calc(80px+env(safe-area-inset-bottom))] md:pb-6 overflow-auto">
          {tab === "dashboard" && <AdminDashboard />}
          {tab === "projects" && <AdminProjects />}
          {tab === "tickets" && <AdminTickets />}
          {tab === "contacts" && <AdminContacts />}
          {tab === "users" && <AdminUsers />}
          {tab === "sharepoint" && <SharePointTab />}
          {tab === "service-clients" && <ServiceClientsTab />}
          {tab === "service-catalog" && <ServiceCatalogTab />}
          {tab === "service-invoices" && <ServiceInvoicesTab />}
          {tab === "payment-methods" && <PaymentMethodsTab />}
          {tab === "hr" && <HrTab />}
        </main>
      </div>
      <ProfileSignatureDialog open={signatureOpen} onOpenChange={setSignatureOpen} />
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

  const loadData = () => {
    supabase.from("support_tickets").select("*").order("created_at", { ascending: false }).then(({ data }) => setTickets(data || []));
    supabase.from("ticket_replies").select("*").order("created_at", { ascending: false }).then(({ data }) => setReplies(data || []));
    supabase.from("profiles").select("*").then(({ data }) => {
      const map: Record<string, any> = {};
      (data || []).forEach((p: any) => { map[p.user_id] = p; });
      setProfiles(map);
    });
  };

  useEffect(() => { loadData(); }, []);

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
            <h1 className="text-2xl font-bold text-foreground">Bonjour, {user.user_metadata?.full_name || user.email?.split("@")[0]}</h1>
            <p className="text-muted-foreground mt-1">Voici votre espace agent — gérez les tickets clients.</p>
          </div>
           <div className="hidden md:flex items-center gap-3 text-sm text-muted-foreground">
            <Button variant="outline" size="sm" onClick={loadData} className="gap-1.5">
              <RefreshCw size={14} /> Actualiser
            </Button>
            <span className="flex items-center gap-2">
              <Activity size={16} className="text-accent" />
              {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </span>
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
                        <p className="font-medium text-card-foreground text-sm truncate">{t.ticket_number && <span className="text-muted-foreground mr-1.5 font-mono text-xs">{t.ticket_number}</span>}{t.subject}</p>
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

  const loadData = () => {
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
  };

  useEffect(() => { loadData(); }, []);

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
                  <p className="text-sm font-medium text-card-foreground truncate flex-1">{p.project_number && <span className="text-muted-foreground mr-1.5 font-mono text-xs">{p.project_number}</span>}{p.name}</p>
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
                  <span className="text-[11px] font-bold text-card-foreground text-right whitespace-nowrap">
                    {p.progress === 0 ? "Soumis" : p.progress === 33 ? "En analyse" : p.progress === 66 ? "En cours" : p.progress === 100 ? "Terminé" : `${p.progress}%`}
                  </span>
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
function AdminProjects({ assignedCount }: { assignedCount?: number }) {
  return <AdminProjectsInner readOnly={false} assignedCount={assignedCount} />;
}

function AdminProjectsInner({ readOnly = false, assignedCount }: { readOnly?: boolean; assignedCount?: number }) {
  const [projects, setProjects] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [gestionnaires, setGestionnaires] = useState<{ user_id: string; full_name: string }[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [assignedFilter, setAssignedFilter] = useState<"all" | "mine">("all");
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
  const [editGestionnaire, setEditGestionnaire] = useState<string | null>(null);
  const [isCurrentUserGestionnaire, setIsCurrentUserGestionnaire] = useState(false);
  const { toast } = useToast();

  const serviceOptions = [
    "Écosystème Microsoft 365 & Azure", "Licences & Souscriptions Cloud",
    "Infrastructures Hybrides & Privées", "Architecture & Ingénierie Cloud",
    "Migration & Modernisation", "Sécurité & Conformité",
    "Infogérance & Support Managé", "IA & Automatisation Intelligente", "Autres",
  ];

  const load = async () => {
    const { data: p } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
    setProjects(p || []);
    const { data: prof } = await supabase.from("profiles").select("*");
    const map: Record<string, any> = {};
    (prof || []).forEach((pr: any) => { map[pr.user_id] = pr; });
    setProfiles(map);
    // Load gestionnaires
    const { data: gRoles } = await supabase.from("user_roles").select("user_id").eq("role", "gestionnaire");
    const gIds = (gRoles || []).map((r: any) => r.user_id);
    setGestionnaires((prof || []).filter((pr: any) => gIds.includes(pr.user_id)).map((pr: any) => ({ user_id: pr.user_id, full_name: pr.full_name || "Sans nom" })));
    // Check if current user is a gestionnaire
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setCurrentUserId(session.user.id);
      setIsCurrentUserGestionnaire(gIds.includes(session.user.id));
    }
  };

  useEffect(() => { load(); }, []);

  const saveProject = async (id: string) => {
    const { error } = await supabase.from("projects").update({
      name: editName, description: editDescription || null, budget: editBudget || null,
      deadline: editDeadline || null, priority: editPriority, status: editStatus, progress: editProgress,
      technologies: editServices.length > 0 ? editServices.join(", ") : null,
      gestionnaire_id: editGestionnaire || null,
    }).eq("id", id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "Projet mis à jour!" }); setEditingId(null); load(); }
  };

  const filtered = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.project_number || "").toLowerCase().includes(search.toLowerCase()) ||
      (profiles[p.user_id]?.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (profiles[p.user_id]?.company || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || p.priority === priorityFilter;
    const matchesAssigned = assignedFilter === "all" || p.gestionnaire_id === currentUserId;
    return matchesSearch && matchesStatus && matchesPriority && matchesAssigned;
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

  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === "en_cours").length;
  const completedProjects = projects.filter((p) => p.status === "termine").length;
  const totalBudget = projects.reduce((sum, p) => {
    const num = parseFloat(((p as any).budget || "0").replace(/[^\d.]/g, ""));
    return sum + (isNaN(num) ? 0 : num);
  }, 0);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Gestion des projets</h1>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
            <RefreshCw size={14} /> Actualiser
          </Button>
          <span className="text-sm text-muted-foreground">{filtered.length}/{projects.length} projet(s)</span>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {[
          { label: "Total projets", value: totalProjects, helper: "Vue globale" },
          { label: "En cours", value: activeProjects, helper: "Suivi actif" },
          { label: "Terminés", value: completedProjects, helper: "Livrés" },
          { label: "Budget cumulé", value: totalBudget.toLocaleString("fr-CA", { style: "currency", currency: "CAD" }), helper: "Tous projets" },
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
          {isCurrentUserGestionnaire && (
            <div className="flex items-center gap-2 ml-3 pl-3 border-l-2 border-primary/30">
              <span className="text-sm font-semibold text-primary flex items-center gap-1.5">
                <UserCheck size={14} /> Assignation :
              </span>
              {[{ value: "all", label: "Tous" }, { value: "mine", label: "Mes assignations" }].map((opt) => (
                <button key={opt.value} onClick={() => setAssignedFilter(opt.value as "all" | "mine")}
                  className={`relative text-sm px-4 py-1.5 rounded-full font-medium transition-colors ${assignedFilter === opt.value ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                >
                  {opt.label}
                  {opt.value === "mine" && (assignedCount ?? 0) > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                      {assignedCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:gap-5 grid-cols-1 md:grid-cols-2">
        {filtered.map((p) => {
          const sc = statusConfig[p.status] || statusConfig.en_cours;
          const pc = priorityConfig[p.priority] || priorityConfig.normal;
          const profile = profiles[p.user_id];
          

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
                    {!readOnly && <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {
                        setEditingId(p.id); setEditStatus(p.status); setEditProgress(p.progress <= 16 ? 0 : p.progress <= 49 ? 33 : p.progress <= 82 ? 66 : 100);
                        setEditName(p.name); setEditDescription(p.description || "");
                        setEditBudget(p.budget || ""); setEditDeadline(p.deadline || "");
                        setEditPriority(p.priority || "normal");
                        setEditServices(p.technologies ? p.technologies.split(", ") : []);
                        setEditGestionnaire(p.gestionnaire_id || null);
                    }}>
                      Modifier
                    </Button>}
                  </div>
                </div>

                {p.project_number && <span className="text-xs font-mono text-muted-foreground">{p.project_number}</span>}
                <h3 className="font-bold text-card-foreground text-lg leading-tight mb-1">{p.name}</h3>
                {p.description && <ExpandableText text={p.description} className="text-sm text-muted-foreground mb-2" maxLines="line-clamp-1" />}
                
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-[10px] font-bold flex-shrink-0">
                    {(profile?.full_name || "?").charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs text-primary font-medium">{profile?.full_name || "Non renseigné"}</span>
                  {profile?.company && <span className="text-xs text-muted-foreground">· {profile.company}</span>}
                </div>
                {p.gestionnaire_id && profiles[p.gestionnaire_id] && (
                  <div className="flex items-center gap-2 mb-3">
                    <UserCheck size={14} className="text-accent shrink-0" />
                    <span className="text-xs text-accent font-medium">Gestionnaire : {profiles[p.gestionnaire_id]?.full_name || "—"}</span>
                  </div>
                )}

                {(p.budget || p.deadline || p.total_paid) && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
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
                  <div className="flex flex-wrap gap-1 mb-3">
                    {p.technologies.split(", ").map((tech: string) => (
                      <span key={tech} className="text-[11px] bg-secondary/50 text-secondary-foreground/70 px-2 py-0.5 rounded-md">{tech}</span>
                    ))}
                  </div>
                )}

                <div className="mt-auto">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Progression</span>
                    <span className="text-xs font-bold text-card-foreground">
                      {p.progress === 0 ? "📋 Soumis" : p.progress === 33 ? "🔍 En analyse" : p.progress === 66 ? "⚙️ En cours" : p.progress === 100 ? "✅ Terminé" : `${p.progress}%`}
                    </span>
                  </div>
                  <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${p.progress === 100 ? "bg-teal-500" : "bg-gradient-to-r from-primary to-accent"}`}
                      style={{ width: `${p.progress}%` }} />
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground/50 mt-3">
                  Soumis le {new Date(p.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Aucun projet trouvé.</p>}

      {/* Edit Project Dialog */}
      <Dialog open={!!editingId} onOpenChange={(open) => { if (!open) setEditingId(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le projet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-card-foreground">Nom du projet</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-card-foreground">Description</label>
              <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} className="mt-1" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <PopoverContent className="w-auto p-0 z-[60]" align="start">
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
              <label className="text-sm font-medium text-card-foreground">Progression</label>
              <div className="flex gap-2 mt-2">
                {[
                  { value: 0, label: "Soumis", icon: "📋" },
                  { value: 33, label: "En analyse", icon: "🔍" },
                  { value: 66, label: "En cours", icon: "⚙️" },
                  { value: 100, label: "Terminé", icon: "✅" },
                ].map((step) => (
                  <button key={step.value} onClick={() => setEditProgress(step.value)}
                    className={`flex-1 flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border-2 transition-all text-center ${
                      editProgress === step.value
                        ? "bg-primary/10 border-primary text-primary font-semibold"
                        : "bg-card border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    <span className="text-lg">{step.icon}</span>
                    <span className="text-[11px] leading-tight">{step.label}</span>
                  </button>
                ))}
              </div>
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
            <div>
              <label className="text-sm font-medium text-card-foreground">Gestionnaire assigné</label>
              <Select value={editGestionnaire || "none"} onValueChange={(v) => setEditGestionnaire(v === "none" ? null : v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Aucun gestionnaire" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun gestionnaire</SelectItem>
                  {gestionnaires.map((g) => (
                    <SelectItem key={g.user_id} value={g.user_id}>{g.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingId(null)}>Annuler</Button>
            <Button onClick={() => { if (editingId) saveProject(editingId); }} className="gradient-primary text-primary-foreground border-0">Sauvegarder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
      (t.ticket_number || "").toLowerCase().includes(search.toLowerCase()) ||
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
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
            <RefreshCw size={14} /> Actualiser
          </Button>
          <span className="text-sm text-muted-foreground">{filtered.length}/{tickets.length} ticket(s)</span>
        </div>
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

                {t.ticket_number && <span className="text-xs font-mono text-muted-foreground">{t.ticket_number}</span>}
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
function ExpandableText({ text, className, maxLines = "line-clamp-2" }: { text: string; className?: string; maxLines?: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text && text.length > 120;
  return (
    <div className={className || "text-sm text-muted-foreground mb-2"}>
      <p className={!expanded && isLong ? maxLines : ""}>{text}</p>
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Demandes de contact</h1>
        <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
          <RefreshCw size={14} /> Actualiser
        </Button>
      </div>
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
  const { isAdmin, isGestionnaire } = useUserRoles();
  const canPromoteBillable = isAdmin || isGestionnaire;
  const [profilesList, setProfilesList] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, string[]>>({});
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("q") || "");
  const [roleFilter, setRoleFilter] = useState(() => searchParams.get("role") || "all");
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [mfaStatus, setMfaStatus] = useState<Record<string, { enrolled: boolean; factors: any[]; has_phone: boolean; phone: string | null; email?: string | null }>>({});
  const [mfaLoading, setMfaLoading] = useState<string | null>(null);
  const [mfaDialogUser, setMfaDialogUser] = useState<any | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteMode, setInviteMode] = useState<"single" | "csv">("single");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("client");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [csvUsers, setCsvUsers] = useState<{ email: string; full_name: string; role: string }[]>([]);
  const [importResults, setImportResults] = useState<{ email: string; success: boolean; error?: string }[] | null>(null);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", company: "", phone: "", country: "", city: "", address_line: "", timezone: "" });
  const [viewMode, setViewMode] = useState<"cards" | "table" | "list">(() => {
    const v = searchParams.get("view"); return v === "table" || v === "list" ? v : "cards";
  });
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "blocked" | "deleted">(() => {
    const v = searchParams.get("status"); return (["active","blocked","deleted"].includes(v || "") ? v : "all") as any;
  });
  const [mfaFilter, setMfaFilter] = useState<"all" | "enrolled" | "none">(() => {
    const v = searchParams.get("mfa"); return (["enrolled","none"].includes(v || "") ? v : "all") as any;
  });
  const [billableFilter, setBillableFilter] = useState<"all" | "yes" | "no">(() => {
    const v = searchParams.get("billable"); return (["yes","no"].includes(v || "") ? v : "all") as any;
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; title: string; description: string;
    confirmLabel?: string; destructive?: boolean; onConfirm: () => void;
  }>({ open: false, title: "", description: "", onConfirm: () => {} });
  const [editSaving, setEditSaving] = useState(false);
  const [billableLinks, setBillableLinks] = useState<Record<string, { id: string; client_name: string }>>({});
  const [pageSize, setPageSize] = useState<number>(() => {
    const v = parseInt(searchParams.get("size") || "", 10);
    return [12, 24, 48, 100].includes(v) ? v : 24;
  });
  const [visibleCount, setVisibleCount] = useState<number>(24);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const EXPORT_COLUMNS = [
    { key: "full_name", label: "Nom" },
    { key: "email", label: "Email" },
    { key: "company", label: "Entreprise" },
    { key: "phone", label: "Téléphone" },
    { key: "role", label: "Rôle" },
    { key: "country", label: "Pays" },
    { key: "city", label: "Ville" },
    { key: "address_line", label: "Adresse" },
    { key: "timezone", label: "Fuseau horaire" },
    { key: "status", label: "Statut" },
    { key: "mfa", label: "MFA" },
    { key: "billable", label: "Facturable" },
    { key: "billable_client", label: "Client facturable" },
    { key: "created_at", label: "Créé le" },
  ] as const;
  const [exportCols, setExportCols] = useState<string[]>(["full_name", "email", "role", "status", "mfa"]);
  const [exportFormat, setExportFormat] = useState<"csv" | "xlsx">("csv");
  const { toast } = useToast();

  // Sync filter state -> URL
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    const setOrDel = (k: string, v: string, def: string) => {
      if (v && v !== def) next.set(k, v); else next.delete(k);
    };
    setOrDel("q", search, "");
    setOrDel("role", roleFilter, "all");
    setOrDel("status", statusFilter, "all");
    setOrDel("mfa", mfaFilter, "all");
    setOrDel("billable", billableFilter, "all");
    setOrDel("view", viewMode, "cards");
    setOrDel("size", String(pageSize), "24");
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [search, roleFilter, statusFilter, mfaFilter, billableFilter, viewMode, pageSize]);

  // Reset pagination on filter/search/view change
  useEffect(() => {
    setVisibleCount(pageSize);
  }, [search, roleFilter, statusFilter, mfaFilter, billableFilter, viewMode, pageSize]);

  const loadBillableLinks = async () => {
    const { data } = await supabase
      .from("service_clients")
      .select("id, client_name, user_id")
      .not("user_id", "is", null);
    const map: Record<string, { id: string; client_name: string }> = {};
    (data || []).forEach((c: any) => { if (c.user_id) map[c.user_id] = { id: c.id, client_name: c.client_name }; });
    setBillableLinks(map);
  };

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

    // Load MFA status for all users
    const mfaMap: Record<string, { enrolled: boolean; factors: any[]; has_phone: boolean; phone: string | null; email?: string | null }> = {};
    for (const prof of (profs || [])) {
      try {
        const { data } = await supabase.functions.invoke("manage-user-mfa", { body: { user_id: prof.user_id, action: "list" } });
        mfaMap[prof.user_id] = {
          enrolled: !!data?.enrolled,
          factors: data?.factors || [],
          has_phone: !!data?.has_phone,
          phone: data?.phone || null,
          email: data?.email || null,
        };
      } catch {
        mfaMap[prof.user_id] = { enrolled: false, factors: [], has_phone: false, phone: null, email: null };
      }
    }
    setMfaStatus(mfaMap);
  };

  useEffect(() => { load(); void loadBillableLinks(); }, []);

  const handleInviteSingle = async () => {
    if (!inviteEmail) return;
    setInviteLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: { action: "invite", users: [{ email: inviteEmail, full_name: inviteName, role: inviteRole }] },
      });
      if (error || data?.error) {
        toast({ title: "Erreur", description: data?.error || error?.message, variant: "destructive" });
      } else {
        toast({ title: "Invitation envoyée", description: `Un email d'invitation a été envoyé à ${inviteEmail}.` });
        setInviteEmail(""); setInviteName(""); setInviteRole("client");
        setShowInviteDialog(false);
        load();
      }
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      const parsed: { email: string; full_name: string; role: string }[] = [];
      // Skip header if present
      const start = lines[0]?.toLowerCase().includes("email") ? 1 : 0;
      for (let i = start; i < lines.length; i++) {
        const cols = lines[i].split(/[,;]/).map(c => c.trim().replace(/^"|"$/g, ""));
        if (cols[0]) {
          parsed.push({ email: cols[0], full_name: cols[1] || "", role: cols[2] || "client" });
        }
      }
      setCsvUsers(parsed);
      setImportResults(null);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleBulkInvite = async () => {
    if (csvUsers.length === 0) return;
    setInviteLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: { action: "bulk-invite", users: csvUsers },
      });
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
      } else {
        setImportResults(data?.details || []);
        toast({
          title: "Import terminé",
          description: `${data?.invited || 0} invitation(s) envoyée(s), ${data?.failed || 0} échec(s).`,
        });
        load();
      }
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setInviteLoading(false);
    }
  };

  const disableMfa = async (userId: string, userName: string) => {
    setConfirmDialog({
      open: true,
      title: "Réinitialiser tout le MFA ?",
      description: `Tous les facteurs MFA de "${userName}" seront supprimés. L'utilisateur devra reconfigurer la double authentification.`,
      confirmLabel: "Réinitialiser",
      destructive: true,
      onConfirm: async () => {
        setMfaLoading(userId);
        const { data, error } = await supabase.functions.invoke("manage-user-mfa", { body: { user_id: userId, action: "unenroll" } });
        if (error || data?.error) {
          toast({ title: "Erreur", description: data?.error || error?.message || "Impossible de désactiver le MFA.", variant: "destructive" });
        } else {
          toast({ title: "MFA désactivé", description: `Tout le MFA de "${userName}" a été réinitialisé.` });
          setMfaStatus(prev => ({ ...prev, [userId]: { ...prev[userId], enrolled: false, factors: [] } }));
          setMfaDialogUser(null);
        }
        setMfaLoading(null);
      },
    });
  };

  const disableFactor = async (userId: string, factorId: string, factorType: string) => {
    setConfirmDialog({
      open: true,
      title: `Désactiver le facteur ${factorType === "totp" ? "Authenticator" : factorType} ?`,
      description: "Ce facteur d'authentification sera retiré du compte.",
      confirmLabel: "Désactiver",
      destructive: true,
      onConfirm: async () => {
        setMfaLoading(userId);
        const { data, error } = await supabase.functions.invoke("manage-user-mfa", { body: { user_id: userId, action: "unenroll_factor", factor_id: factorId } });
        if (error || data?.error) {
          toast({ title: "Erreur", description: data?.error || error?.message || "Impossible de désactiver ce facteur.", variant: "destructive" });
        } else {
          toast({ title: "Facteur désactivé", description: `Le facteur ${factorType === "totp" ? "Authenticator" : factorType} a été supprimé.` });
          try {
            const { data: refreshed } = await supabase.functions.invoke("manage-user-mfa", { body: { user_id: userId, action: "list" } });
            setMfaStatus(prev => ({
              ...prev,
              [userId]: {
                enrolled: !!refreshed?.enrolled,
                factors: refreshed?.factors || [],
                has_phone: !!refreshed?.has_phone,
                phone: refreshed?.phone || null,
              },
            }));
          } catch { /* ignore */ }
        }
        setMfaLoading(null);
      },
    });
  };

  const assignRole = async (userId: string, role: string) => {
    setChangingRole(userId);
    const { error: delError } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (delError) { toast({ title: "Erreur", description: delError.message, variant: "destructive" }); setChangingRole(null); return; }
    const rolesToInsert: { user_id: string; role: "admin" | "agent" | "client" | "comptable" | "gestionnaire" | "hr" }[] = [{ user_id: userId, role: "client" }];
    if (role === "admin") rolesToInsert.push({ user_id: userId, role: "admin" });
    else if (role === "agent") rolesToInsert.push({ user_id: userId, role: "agent" });
    else if (role === "comptable") rolesToInsert.push({ user_id: userId, role: "comptable" });
    else if (role === "gestionnaire") rolesToInsert.push({ user_id: userId, role: "gestionnaire" });
    else if (role === "hr") rolesToInsert.push({ user_id: userId, role: "hr" });
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
    setConfirmDialog({
      open: true,
      title: "Supprimer définitivement le compte ?",
      description: `Vous êtes sur le point de supprimer le compte de "${userName}". Cette action est irréversible : profil, rôles et données associées seront effacés.`,
      confirmLabel: "Supprimer définitivement",
      destructive: true,
      onConfirm: async () => {
        const { data, error } = await supabase.functions.invoke("delete-user", { body: { user_id: userId } });
        if (error || data?.error) {
          toast({ title: "Erreur", description: data?.error || error?.message || "Impossible de supprimer l'utilisateur.", variant: "destructive" });
        } else {
          toast({ title: "Compte supprimé", description: `Le compte de "${userName}" a été supprimé définitivement.` });
          load();
        }
      },
    });
  };

  const promoteToBillableClient = async (p: any) => {
    if (!p.full_name && !p.company) {
      toast({ title: "Profil incomplet", description: "Le nom complet ou l'entreprise est requis pour créer un client facturable.", variant: "destructive" });
      return;
    }
    const email = mfaStatus[p.user_id]?.email || null;

    // Priority check: existing link via user_id
    const { data: linked } = await supabase
      .from("service_clients")
      .select("id, client_name")
      .eq("user_id", p.user_id)
      .limit(1);
    if (linked && linked.length > 0) {
      toast({ title: "Déjà client facturable", description: `Cet utilisateur est déjà lié au client : ${linked[0].client_name}.` });
      return;
    }

    setConfirmDialog({
      open: true,
      title: "Créer un client facturable ?",
      description: `Un client facturable sera créé à partir du profil de "${p.full_name || p.company}" et automatiquement lié à ce compte utilisateur.`,
      confirmLabel: "Créer le client",
      onConfirm: async () => {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) return;
        const { error } = await supabase.from("service_clients").insert({
          client_name: p.company || p.full_name,
          contact_person: p.company ? p.full_name : null,
          address_line: p.address_line || null,
          city: p.city || null,
          country: p.country || "Guinée",
          phone: p.phone || null,
          email,
          user_id: p.user_id,
          created_by: currentUser.id,
        });
        if (error) {
          toast({ title: "Erreur", description: error.message, variant: "destructive" });
        } else {
          toast({ title: "Client facturable créé", description: `${p.full_name || p.company} est maintenant un client facturable lié à son compte.` });
          void loadBillableLinks();
        }
      },
    });
  };

  const openEditUser = (p: any) => {
    setEditForm({
      full_name: p.full_name || "",
      company: p.company || "",
      phone: p.phone || "",
      country: p.country || "",
      city: p.city || "",
      address_line: p.address_line || "",
      timezone: p.timezone || "",
    });
    setEditingUser(p);
  };

  const handleSaveProfile = async () => {
    if (!editingUser) return;
    setEditSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: editForm.full_name || null,
      company: editForm.company || null,
      phone: editForm.phone || null,
      country: editForm.country || null,
      city: editForm.city || null,
      address_line: editForm.address_line || null,
      timezone: editForm.timezone || null,
    }).eq("user_id", editingUser.user_id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profil mis à jour", description: `Le profil de "${editForm.full_name || "l'utilisateur"}" a été modifié.` });
      setEditingUser(null);
      load();
    }
    setEditSaving(false);
  };

  const getRoleBadge = (roles: string[]) => {
    if (roles.includes("admin")) return { label: "Admin", color: "bg-primary/10 text-primary border-primary/20" };
    if (roles.includes("gestionnaire")) return { label: "Gestionnaire", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" };
    if (roles.includes("agent")) return { label: "Agent", color: "bg-orange-500/10 text-orange-500 border-orange-500/20" };
    if (roles.includes("comptable")) return { label: "Comptable", color: "bg-teal-500/10 text-teal-500 border-teal-500/20" };
    if (roles.includes("hr")) return { label: "RH", color: "bg-pink-500/10 text-pink-500 border-pink-500/20" };
    return { label: "Client", color: "bg-muted text-muted-foreground border-border" };
  };

  const getCurrentRole = (roles: string[]) => roles.includes("admin") ? "admin" : roles.includes("gestionnaire") ? "gestionnaire" : roles.includes("agent") ? "agent" : roles.includes("comptable") ? "comptable" : roles.includes("hr") ? "hr" : "client";

  const filtered = profilesList.filter(p => {
    const term = search.toLowerCase();
    const email = (mfaStatus[p.user_id]?.email || "").toLowerCase();
    const matchesSearch = !term ||
      (p.full_name || "").toLowerCase().includes(term) ||
      (p.company || "").toLowerCase().includes(term) ||
      (p.phone || "").toLowerCase().includes(term) ||
      email.includes(term);
    const roles = userRoles[p.user_id] || ["client"];
    const currentRole = getCurrentRole(roles);
    const matchesRole = roleFilter === "all" || currentRole === roleFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && !p.blocked && !p.deleted_at) ||
      (statusFilter === "blocked" && p.blocked) ||
      (statusFilter === "deleted" && p.deleted_at);
    const enrolled = !!mfaStatus[p.user_id]?.enrolled;
    const matchesMfa = mfaFilter === "all" || (mfaFilter === "enrolled" ? enrolled : !enrolled);
    const matchesBillable =
      billableFilter === "all" ||
      (billableFilter === "yes" && billableLinks[p.user_id]) ||
      (billableFilter === "no" && !billableLinks[p.user_id]);
    return matchesSearch && matchesRole && matchesStatus && matchesMfa && matchesBillable;
  });

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  // Count helper: applies all filters EXCEPT the one we're previewing for `dimension`
  const countWith = (overrides: { role?: string; status?: string; mfa?: string; billable?: string }) => {
    const r = overrides.role ?? roleFilter;
    const s = overrides.status ?? statusFilter;
    const m = overrides.mfa ?? mfaFilter;
    const b = overrides.billable ?? billableFilter;
    const term = search.toLowerCase();
    return profilesList.reduce((acc, p) => {
      const email = (mfaStatus[p.user_id]?.email || "").toLowerCase();
      const matchesSearch = !term ||
        (p.full_name || "").toLowerCase().includes(term) ||
        (p.company || "").toLowerCase().includes(term) ||
        (p.phone || "").toLowerCase().includes(term) ||
        email.includes(term);
      if (!matchesSearch) return acc;
      const roles = userRoles[p.user_id] || ["client"];
      const currentRole = getCurrentRole(roles);
      if (r !== "all" && currentRole !== r) return acc;
      const statusOk = s === "all"
        || (s === "active" && !p.blocked && !p.deleted_at)
        || (s === "blocked" && p.blocked)
        || (s === "deleted" && p.deleted_at);
      if (!statusOk) return acc;
      const enrolled = !!mfaStatus[p.user_id]?.enrolled;
      if (m !== "all" && (m === "enrolled" ? !enrolled : enrolled)) return acc;
      const bill = !!billableLinks[p.user_id];
      if (b !== "all" && (b === "yes" ? !bill : bill)) return acc;
      return acc + 1;
    }, 0);
  };

  const hasActiveFilters = roleFilter !== "all" || statusFilter !== "all" || mfaFilter !== "all" || billableFilter !== "all" || !!search;
  const resetFilters = () => { setRoleFilter("all"); setStatusFilter("all"); setMfaFilter("all"); setBillableFilter("all"); setSearch(""); };

  useEffect(() => {
    if (!hasMore) return;
    const el = loadMoreRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setVisibleCount((c) => Math.min(c + pageSize, filtered.length));
      }
    }, { rootMargin: "200px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, pageSize, filtered.length]);

  const roleOptions = [
    { value: "client", label: "Client" },
    { value: "comptable", label: "Comptable" },
    { value: "gestionnaire", label: "Gestionnaire" },
    { value: "agent", label: "Agent" },
    { value: "hr", label: "RH" },
    { value: "admin", label: "Admin" },
  ];

  const roleFilterButtons = [
    { v: "all", l: "Tous" }, { v: "client", l: "Client" }, { v: "comptable", l: "Comptable" },
    { v: "gestionnaire", l: "Gestionnaire" }, { v: "agent", l: "Agent" }, { v: "hr", l: "RH" }, { v: "admin", l: "Admin" },
  ];

  const renderEmail = (uid: string) => mfaStatus[uid]?.email || "—";

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-foreground">Utilisateurs</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <button onClick={() => setViewMode("cards")} title="Cartes"
              className={`p-1.5 rounded-md transition-colors ${viewMode === "cards" ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <LayoutGrid size={14} />
            </button>
            <button onClick={() => setViewMode("table")} title="Tableau"
              className={`p-1.5 rounded-md transition-colors ${viewMode === "table" ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <TableIcon size={14} />
            </button>
            <button onClick={() => setViewMode("list")} title="Liste"
              className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <ListIcon size={14} />
            </button>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => { setShowInviteDialog(true); setInviteMode("single"); setCsvUsers([]); setImportResults(null); }}>
            <UserPlus size={14} /> Inviter
          </Button>
          <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
            <RefreshCw size={14} /> Actualiser
          </Button>
          <Button variant="outline" size="sm" onClick={() => setExportOpen(true)} className="gap-1.5" title="Exporter les résultats filtrés">
            <Download size={14} /> Exporter
          </Button>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="text-xs border border-border rounded-lg px-2 py-1.5 bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            title="Utilisateurs par page"
          >
            {[12, 24, 48, 100].map((n) => <option key={n} value={n}>{n}/page</option>)}
          </select>
          <span className="text-sm text-muted-foreground">{Math.min(visibleCount, filtered.length)}/{filtered.length} affichés · {profilesList.length} total</span>
        </div>
      </div>

      <div className="bg-card rounded-xl p-4 shadow-card border border-border/50 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Rechercher par nom, email, téléphone ou entreprise..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-9" />
          {search && (
            <button onClick={() => setSearch("")} title="Effacer la recherche"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-muted text-muted-foreground">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Filter size={12} /> Rôle :</span>
          {roleFilterButtons.map((f) => {
            const n = countWith({ role: f.v });
            const active = roleFilter === f.v;
            return (
              <button key={f.v} onClick={() => setRoleFilter(f.v)} disabled={n === 0 && !active}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5 ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"} ${n === 0 && !active ? "opacity-40 cursor-not-allowed" : ""}`}
              >{f.l}<span className={`text-[10px] px-1.5 rounded-full ${active ? "bg-primary-foreground/20" : "bg-background/60"}`}>{n}</span></button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-medium text-muted-foreground">Statut :</span>
          {[{ v: "all", l: "Tous" }, { v: "active", l: "Actifs" }, { v: "blocked", l: "Bloqués" }, { v: "deleted", l: "Supprimés" }].map(f => {
            const n = countWith({ status: f.v });
            const active = statusFilter === f.v;
            return (
              <button key={f.v} onClick={() => setStatusFilter(f.v as any)} disabled={n === 0 && !active}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5 ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"} ${n === 0 && !active ? "opacity-40 cursor-not-allowed" : ""}`}
              >{f.l}<span className={`text-[10px] px-1.5 rounded-full ${active ? "bg-primary-foreground/20" : "bg-background/60"}`}>{n}</span></button>
            );
          })}
          <span className="text-xs font-medium text-muted-foreground ml-2">MFA :</span>
          {[{ v: "all", l: "Tous" }, { v: "enrolled", l: "Activé" }, { v: "none", l: "Inactif" }].map(f => {
            const n = countWith({ mfa: f.v });
            const active = mfaFilter === f.v;
            return (
              <button key={f.v} onClick={() => setMfaFilter(f.v as any)} disabled={n === 0 && !active}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5 ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"} ${n === 0 && !active ? "opacity-40 cursor-not-allowed" : ""}`}
              >{f.l}<span className={`text-[10px] px-1.5 rounded-full ${active ? "bg-primary-foreground/20" : "bg-background/60"}`}>{n}</span></button>
            );
          })}
          <span className="text-xs font-medium text-muted-foreground ml-2">Facturable :</span>
          {[{ v: "all", l: "Tous" }, { v: "yes", l: "Oui" }, { v: "no", l: "Non" }].map(f => {
            const n = countWith({ billable: f.v });
            const active = billableFilter === f.v;
            return (
              <button key={f.v} onClick={() => setBillableFilter(f.v as any)} disabled={n === 0 && !active}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5 ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"} ${n === 0 && !active ? "opacity-40 cursor-not-allowed" : ""}`}
              >{f.l}<span className={`text-[10px] px-1.5 rounded-full ${active ? "bg-primary-foreground/20" : "bg-background/60"}`}>{n}</span></button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-semibold text-foreground">{filtered.length}</span>
            <span className="text-muted-foreground">résultat{filtered.length > 1 ? "s" : ""} sur {profilesList.length}</span>
            {hasActiveFilters && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">Filtres :</span>
                {search && <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">« {search} »</span>}
                {roleFilter !== "all" && <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">Rôle: {roleFilterButtons.find(r => r.v === roleFilter)?.l}</span>}
                {statusFilter !== "all" && <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">Statut: {statusFilter}</span>}
                {mfaFilter !== "all" && <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">MFA: {mfaFilter === "enrolled" ? "Activé" : "Inactif"}</span>}
                {billableFilter !== "all" && <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">Facturable: {billableFilter === "yes" ? "Oui" : "Non"}</span>}
              </>
            )}
          </div>
          <Button
            size="sm"
            variant={hasActiveFilters ? "destructive" : "outline"}
            onClick={resetFilters}
            disabled={!hasActiveFilters}
            className="gap-1.5 h-8"
          >
            <X size={12} /> Réinitialiser les filtres
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-xl border border-border/50">
          <Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-muted-foreground text-sm">Aucun utilisateur trouvé.</p>
        </div>
      ) : viewMode === "cards" ? (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((p) => {
            const roles = userRoles[p.user_id] || ["client"];
            const badge = getRoleBadge(roles);
            const currentRole = getCurrentRole(roles);
            const enrolled = !!mfaStatus[p.user_id]?.enrolled;

            return (
              <div key={p.id} className={`group bg-card rounded-2xl p-5 shadow-card border transition-all duration-300 hover:shadow-card-hover hover:border-primary/30 ${p.blocked ? "border-destructive/30 bg-destructive/5" : "border-border/50"}`}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-lg font-bold flex-shrink-0">
                    {(p.full_name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="font-bold text-card-foreground">{p.full_name || "Non renseigné"}</p>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${badge.color}`}>{badge.label}</span>
                      {enrolled && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1"><Shield size={9} /> MFA</span>}
                      {billableLinks[p.user_id] && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-500/10 text-teal-600 border border-teal-500/20 flex items-center gap-1"><Receipt size={9} /> Facturable</span>}
                      {p.blocked && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 flex items-center gap-1"><ShieldBan size={9} /> Bloqué</span>}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                      {mfaStatus[p.user_id]?.email && <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail size={11} /> {mfaStatus[p.user_id].email}</span>}
                      {p.company && <span className="text-xs text-muted-foreground">🏢 {p.company}</span>}
                      {p.phone && <span className="text-xs text-muted-foreground">📱 {p.phone}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/30">
                  <p className="text-[11px] text-muted-foreground/60">
                    Inscrit le {new Date(p.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => openEditUser(p)}>
                      <Pencil size={13} /> Gérer
                    </Button>
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
                {(p as any).deleted_at && (
                  <div className="mt-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs text-destructive font-medium">
                      <Trash2 size={12} /> Supprimé le {new Date((p as any).deleted_at).toLocaleDateString("fr-FR")}
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
      ) : viewMode === "table" ? (
        <div className="bg-card rounded-xl border border-border/50 overflow-hidden shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Entreprise</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>MFA</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map(p => {
                const roles = userRoles[p.user_id] || ["client"];
                const badge = getRoleBadge(roles);
                const enrolled = !!mfaStatus[p.user_id]?.enrolled;
                return (
                  <TableRow key={p.id} className={p.blocked ? "bg-destructive/5" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-sm font-bold flex-shrink-0">
                          {(p.full_name || "?").charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{p.full_name || "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{renderEmail(p.user_id)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.company || "—"}</TableCell>
                    <TableCell><span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${badge.color}`}>{badge.label}</span></TableCell>
                    <TableCell>
                      {p.deleted_at ? <span className="text-xs text-destructive">Supprimé</span>
                        : p.blocked ? <span className="text-xs text-destructive flex items-center gap-1"><ShieldBan size={11} />Bloqué</span>
                        : <span className="text-xs text-emerald-600 flex items-center gap-1"><ShieldCheck size={11} />Actif</span>}
                    </TableCell>
                    <TableCell>
                      {enrolled ? <Shield size={14} className="text-emerald-600" /> : <span className="text-xs text-muted-foreground/40">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => openEditUser(p)}>
                        <Pencil size={12} /> Gérer
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border/50 divide-y divide-border/50 overflow-hidden shadow-card">
          {visible.map(p => {
            const roles = userRoles[p.user_id] || ["client"];
            const badge = getRoleBadge(roles);
            const enrolled = !!mfaStatus[p.user_id]?.enrolled;
            return (
              <button key={p.id} onClick={() => openEditUser(p)} className="w-full flex items-center gap-3 p-3 hover:bg-muted/40 transition text-left">
                <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-sm font-bold flex-shrink-0">
                  {(p.full_name || "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{p.full_name || "Non renseigné"}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold border ${badge.color}`}>{badge.label}</span>
                    {enrolled && <Shield size={11} className="text-emerald-600" />}
                    {billableLinks[p.user_id] && <Receipt size={11} className="text-teal-600" />}
                    {p.blocked && <ShieldBan size={11} className="text-destructive" />}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{renderEmail(p.user_id)}{p.company ? ` · ${p.company}` : ""}</div>
                </div>
                <Pencil size={14} className="text-muted-foreground/50" />
              </button>
            );
          })}
        </div>
      )}

      {filtered.length > 0 && hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVisibleCount((c) => Math.min(c + pageSize, filtered.length))}
            className="gap-1.5"
          >
            Charger plus ({filtered.length - visibleCount} restant{filtered.length - visibleCount > 1 ? "s" : ""})
          </Button>
        </div>
      )}

      {/* MFA Management Dialog */}
      {mfaDialogUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setMfaDialogUser(null)}>
          <div className="bg-card rounded-2xl shadow-xl border border-border/50 w-full max-w-md mx-4 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Shield size={20} className="text-primary" />
                MFA — {mfaDialogUser.full_name || "Utilisateur"}
              </h3>
              <button onClick={() => setMfaDialogUser(null)} className="p-1 rounded-lg hover:bg-muted transition-colors">
                <X size={18} className="text-muted-foreground" />
              </button>
            </div>

            {(() => {
              const status = mfaStatus[mfaDialogUser.user_id];
              if (!status) return <p className="text-sm text-muted-foreground">Chargement...</p>;

              return (
                <div className="space-y-4">
                  {/* TOTP Factors */}
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                      <Smartphone size={14} /> Authenticator (TOTP)
                    </h4>
                    {status.factors.filter(f => f.type === "totp").length > 0 ? (
                      <div className="space-y-2">
                        {status.factors.filter(f => f.type === "totp").map((f: any) => (
                          <div key={f.id} className="flex items-center justify-between bg-muted/50 rounded-lg p-3 border border-border/30">
                            <div>
                              <p className="text-sm font-medium text-foreground">{f.friendly_name || "Authenticator"}</p>
                              <p className="text-xs text-muted-foreground">
                                Ajouté le {new Date(f.created_at).toLocaleDateString("fr-FR")}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 text-xs"
                              disabled={mfaLoading === mfaDialogUser.user_id}
                              onClick={() => disableFactor(mfaDialogUser.user_id, f.id, "totp")}
                            >
                              Désactiver
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground/60 italic">Aucun authenticator configuré</p>
                    )}
                  </div>

                  {/* SMS MFA */}
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                      <Phone size={14} /> SMS
                    </h4>
                    {status.has_phone ? (
                      <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3 border border-border/30">
                        <div>
                          <p className="text-sm font-medium text-foreground">Éligible</p>
                          <p className="text-xs text-muted-foreground">📱 {status.phone}</p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">Disponible</span>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground/60 italic">Aucun numéro de téléphone configuré</p>
                    )}
                  </div>

                  {/* Actions */}
                  {status.enrolled && (
                    <div className="pt-2 border-t border-border/30">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        disabled={mfaLoading === mfaDialogUser.user_id}
                        onClick={() => disableMfa(mfaDialogUser.user_id, mfaDialogUser.full_name || "cet utilisateur")}
                      >
                        <Shield size={14} className="mr-2" />
                        Réinitialiser tout le MFA
                      </Button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Edit User Profile Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => { if (!open) setEditingUser(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil size={18} /> Gérer l'utilisateur — {editForm.full_name || "Utilisateur"}
            </DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="profile" className="mt-2">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="profile" className="gap-1.5"><Pencil size={13} /> Profil</TabsTrigger>
              <TabsTrigger value="security" className="gap-1.5"><Shield size={13} /> Sécurité &amp; MFA</TabsTrigger>
              <TabsTrigger value="danger" className="gap-1.5 data-[state=active]:text-destructive"><AlertCircle size={13} /> Zone danger</TabsTrigger>
            </TabsList>
            <TabsContent value="profile" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-muted-foreground">Email (non modifiable)</label>
              <Input value={editingUser ? (mfaStatus[editingUser.user_id]?.email || "—") : ""} disabled className="mt-1 bg-muted/50 cursor-not-allowed" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Nom complet</label>
              <Input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Entreprise</label>
              <Input value={editForm.company} onChange={(e) => setEditForm({ ...editForm, company: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Téléphone</label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder={getDialCode(editForm.country) ? `${getDialCode(editForm.country)} ...` : "+XXX ..."}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Pays</label>
              <select
                value={editForm.country}
                onChange={(e) => {
                  const newCountry = e.target.value;
                  const dial = getDialCode(newCountry);
                  setEditForm((prev) => ({
                    ...prev,
                    country: newCountry,
                    phone: dial ? applyDialCode(prev.phone, dial) : prev.phone,
                  }));
                }}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Sélectionner un pays</option>
                <option value="GN">🇬🇳 Guinée</option>
                <optgroup label="Afrique">
                  <option value="DZ">Algérie</option><option value="AO">Angola</option><option value="BJ">Bénin</option><option value="BW">Botswana</option>
                  <option value="BF">Burkina Faso</option><option value="BI">Burundi</option><option value="CM">Cameroun</option><option value="CV">Cap-Vert</option>
                  <option value="CF">Centrafrique</option><option value="TD">Tchad</option><option value="KM">Comores</option><option value="CG">Congo</option>
                  <option value="CD">RD Congo</option><option value="CI">Côte d'Ivoire</option><option value="DJ">Djibouti</option><option value="EG">Égypte</option>
                  <option value="GQ">Guinée équatoriale</option><option value="ER">Érythrée</option><option value="SZ">Eswatini</option><option value="ET">Éthiopie</option>
                  <option value="GA">Gabon</option><option value="GM">Gambie</option><option value="GH">Ghana</option><option value="GW">Guinée-Bissau</option>
                  <option value="KE">Kenya</option><option value="LS">Lesotho</option><option value="LR">Liberia</option><option value="LY">Libye</option>
                  <option value="MG">Madagascar</option><option value="MW">Malawi</option><option value="ML">Mali</option><option value="MR">Mauritanie</option>
                  <option value="MU">Maurice</option><option value="MA">Maroc</option><option value="MZ">Mozambique</option><option value="NA">Namibie</option>
                  <option value="NE">Niger</option><option value="NG">Nigeria</option><option value="RW">Rwanda</option><option value="ST">São Tomé-et-Príncipe</option>
                  <option value="SN">Sénégal</option><option value="SC">Seychelles</option><option value="SL">Sierra Leone</option><option value="SO">Somalie</option>
                  <option value="ZA">Afrique du Sud</option><option value="SS">Soudan du Sud</option><option value="SD">Soudan</option><option value="TZ">Tanzanie</option>
                  <option value="TG">Togo</option><option value="TN">Tunisie</option><option value="UG">Ouganda</option><option value="ZM">Zambie</option><option value="ZW">Zimbabwe</option>
                </optgroup>
                <optgroup label="Europe">
                  <option value="AL">Albanie</option><option value="DE">Allemagne</option><option value="AT">Autriche</option><option value="BE">Belgique</option>
                  <option value="BA">Bosnie-Herzégovine</option><option value="BG">Bulgarie</option><option value="HR">Croatie</option><option value="DK">Danemark</option>
                  <option value="ES">Espagne</option><option value="EE">Estonie</option><option value="FI">Finlande</option><option value="FR">France</option>
                  <option value="GR">Grèce</option><option value="HU">Hongrie</option><option value="IE">Irlande</option><option value="IS">Islande</option>
                  <option value="IT">Italie</option><option value="LV">Lettonie</option><option value="LT">Lituanie</option><option value="LU">Luxembourg</option>
                  <option value="MK">Macédoine du Nord</option><option value="MT">Malte</option><option value="MD">Moldavie</option><option value="ME">Monténégro</option>
                  <option value="NO">Norvège</option><option value="NL">Pays-Bas</option><option value="PL">Pologne</option><option value="PT">Portugal</option>
                  <option value="CZ">République tchèque</option><option value="RO">Roumanie</option><option value="GB">Royaume-Uni</option><option value="RS">Serbie</option>
                  <option value="SK">Slovaquie</option><option value="SI">Slovénie</option><option value="SE">Suède</option><option value="CH">Suisse</option><option value="UA">Ukraine</option>
                </optgroup>
                <optgroup label="Amérique">
                  <option value="AR">Argentine</option><option value="BR">Brésil</option><option value="CA">Canada</option><option value="CL">Chili</option>
                  <option value="CO">Colombie</option><option value="CR">Costa Rica</option><option value="CU">Cuba</option><option value="DO">République dominicaine</option>
                  <option value="EC">Équateur</option><option value="US">États-Unis</option><option value="GT">Guatemala</option><option value="HT">Haïti</option>
                  <option value="HN">Honduras</option><option value="JM">Jamaïque</option><option value="MX">Mexique</option><option value="PA">Panama</option>
                  <option value="PY">Paraguay</option><option value="PE">Pérou</option><option value="TT">Trinité-et-Tobago</option><option value="UY">Uruguay</option><option value="VE">Venezuela</option>
                </optgroup>
                <optgroup label="Asie">
                  <option value="SA">Arabie saoudite</option><option value="CN">Chine</option><option value="KR">Corée du Sud</option><option value="AE">Émirats arabes unis</option>
                  <option value="IN">Inde</option><option value="ID">Indonésie</option><option value="IQ">Irak</option><option value="IL">Israël</option>
                  <option value="JP">Japon</option><option value="JO">Jordanie</option><option value="KW">Koweït</option><option value="LB">Liban</option>
                  <option value="MY">Malaisie</option><option value="PK">Pakistan</option><option value="PH">Philippines</option><option value="QA">Qatar</option>
                  <option value="SG">Singapour</option><option value="TH">Thaïlande</option><option value="TR">Turquie</option><option value="VN">Vietnam</option>
                </optgroup>
                <optgroup label="Océanie">
                  <option value="AU">Australie</option><option value="NZ">Nouvelle-Zélande</option>
                </optgroup>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Ville</label>
              <Input value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} placeholder="Ex: Conakry" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Adresse postale</label>
              <Input value={editForm.address_line} onChange={(e) => setEditForm({ ...editForm, address_line: e.target.value })} placeholder="Ex: Quartier Almamya" className="mt-1" />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-foreground">Fuseau horaire</label>
              <select
                value={editForm.timezone}
                onChange={(e) => setEditForm({ ...editForm, timezone: e.target.value })}
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
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditingUser(null)}>Annuler</Button>
            <Button onClick={handleSaveProfile} disabled={editSaving} className="gap-1.5">
              {editSaving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {editSaving ? "Sauvegarde..." : "Sauvegarder"}
            </Button>
          </DialogFooter>
            </TabsContent>

            <TabsContent value="security" className="mt-4 space-y-4">
              {editingUser && (() => {
                const status = mfaStatus[editingUser.user_id];
                return (
                  <>
                    <div className="bg-muted/30 rounded-lg p-4">
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><Smartphone size={14} /> Authenticator (TOTP)</h4>
                      {status?.factors?.filter((f: any) => f.type === "totp").length > 0 ? (
                        <div className="space-y-2">
                          {status.factors.filter((f: any) => f.type === "totp").map((f: any) => (
                            <div key={f.id} className="flex items-center justify-between bg-card rounded-md p-3 border border-border/30">
                              <div>
                                <p className="text-sm font-medium">{f.friendly_name || "Authenticator"}</p>
                                <p className="text-xs text-muted-foreground">Ajouté le {new Date(f.created_at).toLocaleDateString("fr-FR")}</p>
                              </div>
                              <Button size="sm" variant="destructive" className="h-7 text-xs"
                                disabled={mfaLoading === editingUser.user_id}
                                onClick={() => disableFactor(editingUser.user_id, f.id, "totp")}>
                                Désactiver
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (<p className="text-xs text-muted-foreground italic">Aucun authenticator configuré</p>)}
                    </div>

                    <div className="bg-muted/30 rounded-lg p-4">
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><Phone size={14} /> SMS</h4>
                      {status?.has_phone ? (
                        <div className="flex items-center justify-between bg-card rounded-md p-3 border border-border/30">
                          <div>
                            <p className="text-sm font-medium">Éligible</p>
                            <p className="text-xs text-muted-foreground">📱 {status.phone}</p>
                          </div>
                          <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">Disponible</span>
                        </div>
                      ) : (<p className="text-xs text-muted-foreground italic">Aucun numéro de téléphone configuré</p>)}
                    </div>

                    {status?.enrolled && (
                      <Button variant="destructive" size="sm" className="w-full"
                        disabled={mfaLoading === editingUser.user_id}
                        onClick={() => disableMfa(editingUser.user_id, editingUser.full_name || "cet utilisateur")}>
                        <Shield size={14} className="mr-2" /> Réinitialiser tout le MFA
                      </Button>
                    )}
                  </>
                );
              })()}
            </TabsContent>

            <TabsContent value="danger" className="mt-4 space-y-3">
              {editingUser && (
                <>
                  {canPromoteBillable && (
                    billableLinks[editingUser.user_id] ? (
                      <div className="flex items-center justify-between p-4 bg-teal-500/10 border border-teal-500/30 rounded-lg">
                        <div>
                          <p className="text-sm font-medium flex items-center gap-2"><Receipt size={14} className="text-teal-600" /> Client facturable</p>
                          <p className="text-xs text-muted-foreground">Lié à : {billableLinks[editingUser.user_id].client_name}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
                        <div>
                          <p className="text-sm font-medium">Définir comme client facturable</p>
                          <p className="text-xs text-muted-foreground">Crée un client lié au compte pour la facturation.</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => promoteToBillableClient(editingUser)} className="gap-1.5">
                          <Receipt size={13} /> Créer
                        </Button>
                      </div>
                    )
                  )}

                  <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{editingUser.blocked ? "Débloquer le compte" : "Bloquer le compte"}</p>
                      <p className="text-xs text-muted-foreground">
                        {editingUser.blocked ? "L'utilisateur pourra à nouveau se connecter." : "L'utilisateur ne pourra plus accéder à son espace."}
                      </p>
                    </div>
                    <Button size="sm" variant={editingUser.blocked ? "default" : "outline"}
                      className={editingUser.blocked ? "" : "border-destructive/40 text-destructive hover:bg-destructive/10"}
                      onClick={() => toggleBlock(editingUser.user_id, !!editingUser.blocked)}>
                      {editingUser.blocked ? <><ShieldCheck size={13} className="mr-1.5" /> Débloquer</> : <><ShieldBan size={13} className="mr-1.5" /> Bloquer</>}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-destructive/5 border border-destructive/30 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-destructive">Supprimer définitivement</p>
                      <p className="text-xs text-muted-foreground">Action irréversible : profil, rôles et données associées effacés.</p>
                    </div>
                    <Button size="sm" variant="destructive"
                      onClick={() => deleteUser(editingUser.user_id, editingUser.full_name || "cet utilisateur")}>
                      <Trash2 size={13} className="mr-1.5" /> Supprimer
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog (replaces window.confirm) */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(o) => setConfirmDialog(prev => ({ ...prev, open: o }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className={confirmDialog.destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
              onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(prev => ({ ...prev, open: false })); }}>
              {confirmDialog.confirmLabel || "Confirmer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invite Users Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus size={18} />
              Inviter des utilisateurs
            </DialogTitle>
          </DialogHeader>

          <div className="flex gap-2 mb-4">
            <Button
              variant={inviteMode === "single" ? "default" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={() => { setInviteMode("single"); setCsvUsers([]); setImportResults(null); }}
            >
              <Send size={14} /> Invitation
            </Button>
            <Button
              variant={inviteMode === "csv" ? "default" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={() => { setInviteMode("csv"); setImportResults(null); }}
            >
              <FileSpreadsheet size={14} /> Import CSV
            </Button>
          </div>

          {inviteMode === "single" && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground">Email *</label>
                <Input
                  type="email"
                  placeholder="utilisateur@exemple.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Nom complet</label>
                <Input
                  placeholder="Jean Dupont"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Rôle</label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="comptable">Comptable</SelectItem>
                    <SelectItem value="gestionnaire">Gestionnaire</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="hr">RH</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowInviteDialog(false)}>Annuler</Button>
                <Button onClick={handleInviteSingle} disabled={!inviteEmail || inviteLoading} className="gap-1.5">
                  {inviteLoading ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                  {inviteLoading ? "Envoi..." : "Envoyer l'invitation"}
                </Button>
              </DialogFooter>
            </div>
          )}

          {inviteMode === "csv" && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 border border-border/30">
                <p className="text-sm text-foreground font-medium mb-1">Format CSV attendu :</p>
                <code className="text-xs text-muted-foreground block">email,nom,role</code>
                <code className="text-xs text-muted-foreground block">jean@exemple.com,Jean Dupont,client</code>
                <code className="text-xs text-muted-foreground block">marie@exemple.com,Marie Martin,agent</code>
                <p className="text-xs text-muted-foreground mt-2">Rôles : client, comptable, gestionnaire, agent, hr, admin</p>
              </div>

              <label className="cursor-pointer">
                <input type="file" accept=".csv,.txt" className="hidden" onChange={handleCsvImport} />
                <Button variant="outline" asChild className="w-full gap-2">
                  <span><Upload size={14} /> Sélectionner un fichier CSV</span>
                </Button>
              </label>

              {csvUsers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">{csvUsers.length} utilisateur(s) détecté(s) :</p>
                  <div className="max-h-40 overflow-y-auto border border-border/30 rounded-lg divide-y">
                    {csvUsers.map((u, i) => (
                      <div key={i} className="px-3 py-2 flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium text-foreground">{u.email}</span>
                          {u.full_name && <span className="text-muted-foreground ml-2">— {u.full_name}</span>}
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{u.role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {importResults && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Résultats :</p>
                  <div className="max-h-40 overflow-y-auto border border-border/30 rounded-lg divide-y">
                    {importResults.map((r, i) => (
                      <div key={i} className="px-3 py-2 flex items-center justify-between text-sm">
                        <span className="text-foreground">{r.email}</span>
                        {r.success ? (
                          <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 size={12} /> OK</span>
                        ) : (
                          <span className="text-xs text-destructive flex items-center gap-1"><AlertCircle size={12} /> {r.error}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowInviteDialog(false)}>Fermer</Button>
                {csvUsers.length > 0 && !importResults && (
                  <Button onClick={handleBulkInvite} disabled={inviteLoading} className="gap-1.5">
                    {inviteLoading ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                    {inviteLoading ? "Import..." : `Inviter ${csvUsers.length} utilisateur(s)`}
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
