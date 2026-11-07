import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { clearSmsMfaVerified } from "@/hooks/use-mfa";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Receipt, Briefcase, Users, LogOut, Shield,
  FileCheck2, Send, FileX2, FileEdit,
} from "lucide-react";
import ProposalsTab from "@/components/admin/ProposalsTab";
import ServiceClientsTab from "@/components/ServiceClientsTab";
import { LeadsManager } from "@/components/marketing/LeadsManager";
import { PortalInfoBar } from "@/components/PortalInfoBar";
import cmLogo from "@/assets/cloudmature-logo.png";
import { ProfileSignatureDialog } from "@/components/ProfileSignatureDialog";

type CommercialTab = "dashboard" | "proposals" | "clients" | "leads";

const COMMERCIAL_TABS: { id: CommercialTab; label: string; icon: typeof Briefcase }[] = [
  { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { id: "proposals", label: "Propositions", icon: Receipt },
  { id: "clients", label: "Clients", icon: Briefcase },
  { id: "leads", label: "Prospects", icon: Users },
];

export default function CommercialPortalPage() {
  const { user } = useAuthSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const tab: CommercialTab = COMMERCIAL_TABS.some((t) => t.id === rawTab)
    ? (rawTab as CommercialTab)
    : "dashboard";
  const setTab = (t: CommercialTab) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (t === "dashboard") p.delete("tab");
      else p.set("tab", t);
      return p;
    }, { replace: true });
  };
  const [signatureOpen, setSignatureOpen] = useState(false);

  const handleLogout = async () => {
    clearSmsMfaVerified();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-16 flex items-center border-b border-border bg-card px-4 sm:px-6">
        <div className="max-w-[1400px] mx-auto w-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img src={cmLogo} alt="CloudMature" className="h-9 w-auto shrink-0" />
            <div className="hidden sm:block h-8 w-px bg-border" />
            <h1 className="text-sm font-semibold flex items-center gap-2 min-w-0">
              <Receipt size={16} className="text-primary shrink-0" />
              <span className="truncate">Portail Commercial</span>
            </h1>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden md:inline-flex text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full font-medium items-center gap-1.5">
              <Shield size={12} /> Commercial
            </span>
            <div className="flex items-center gap-2 pl-3 sm:border-l border-border">
              <button
                type="button"
                onClick={() => setSignatureOpen(true)}
                title="Ma signature"
                className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-sm font-bold shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
              >
                {(user.user_metadata?.full_name || user.email || "C").charAt(0).toUpperCase()}
              </button>
              <span className="hidden lg:block text-sm text-foreground truncate max-w-[140px]">
                {user.user_metadata?.full_name || user.email}
              </span>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-destructive gap-1.5">
                <LogOut size={14} />
                <span className="hidden md:inline">Déconnexion</span>
              </Button>
            </div>
          </div>
        </div>
      </header>
      <PortalInfoBar />
      <nav className="border-b border-border bg-card overflow-x-auto">
        <div className="flex items-center gap-1 px-3 py-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">Ventes</span>
          {COMMERCIAL_TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors ${
                  active ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
                }`}
              >
                <t.icon size={15} />
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-6 pb-[calc(80px+env(safe-area-inset-bottom))] md:pb-6">
        {tab === "dashboard" && <CommercialDashboard onGo={setTab} />}
        {tab === "proposals" && <ProposalsTab />}
        {tab === "clients" && <ServiceClientsTab />}
        {tab === "leads" && (
          <div className="bg-card rounded-xl border border-border/50 shadow-card p-4 md:p-6">
            <LeadsManager canDelete={false} />
          </div>
        )}
      </main>
      <ProfileSignatureDialog open={signatureOpen} onOpenChange={setSignatureOpen} />
    </div>
  );
}

interface DashboardStats {
  proposalsTotal: number;
  proposalsDraft: number;
  proposalsSent: number;
  proposalsAccepted: number;
  proposalsRefused: number;
  clientsTotal: number;
  leadsTotal: number;
  leadsLast30d: number;
}

function CommercialDashboard({ onGo }: { onGo: (t: CommercialTab) => void }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    const count = async (table: "commercial_proposals" | "service_clients" | "marketing_leads", filter?: (q: any) => any) => {
      let q = supabase.from(table).select("id", { count: "exact", head: true });
      if (filter) q = filter(q);
      const { count: c } = await q;
      return c ?? 0;
    };
    const load = async () => {
      try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const [proposalsTotal, proposalsDraft, proposalsSent, proposalsAccepted, proposalsRefused, clientsTotal, leadsTotal, leadsLast30d] = await Promise.all([
          count("commercial_proposals"),
          count("commercial_proposals", (q) => q.eq("status", "brouillon")),
          count("commercial_proposals", (q) => q.eq("status", "envoyee")),
          count("commercial_proposals", (q) => q.eq("status", "acceptee")),
          count("commercial_proposals", (q) => q.eq("status", "refusee")),
          count("service_clients"),
          count("marketing_leads"),
          count("marketing_leads", (q) => q.gte("created_at", thirtyDaysAgo)),
        ]);
        if (active) setStats({ proposalsTotal, proposalsDraft, proposalsSent, proposalsAccepted, proposalsRefused, clientsTotal, leadsTotal, leadsLast30d });
      } catch {
        if (active) setError(true);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  const cards = [
    { icon: Receipt, label: "Propositions", value: stats?.proposalsTotal, target: "proposals" as CommercialTab, subtitle: stats ? `${stats.proposalsSent} en attente de réponse` : undefined },
    { icon: Briefcase, label: "Clients", value: stats?.clientsTotal, target: "clients" as CommercialTab },
    { icon: Users, label: "Prospects", value: stats?.leadsTotal, target: "leads" as CommercialTab, subtitle: stats ? `${stats.leadsLast30d} sur 30 jours` : undefined },
  ];

  const pipeline = [
    { icon: FileEdit, label: "Brouillons", value: stats?.proposalsDraft, className: "text-muted-foreground bg-muted" },
    { icon: Send, label: "Envoyées", value: stats?.proposalsSent, className: "text-primary bg-primary/10" },
    { icon: FileCheck2, label: "Acceptées", value: stats?.proposalsAccepted, className: "text-teal-600 bg-teal-600/10" },
    { icon: FileX2, label: "Refusées", value: stats?.proposalsRefused, className: "text-destructive bg-destructive/10" },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h2 className="text-lg font-bold text-foreground">Tableau de bord commercial</h2>
        <p className="text-sm text-muted-foreground">Votre activité de vente en un coup d'œil.</p>
      </div>
      {error && (
        <p className="text-sm text-destructive">Impossible de charger les statistiques. Réessayez dans un instant.</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((c) => (
          <button
            key={c.label}
            onClick={() => onGo(c.target)}
            className="text-left bg-card rounded-xl p-5 shadow-card border border-border/50 hover:shadow-card-hover hover:border-primary/20 transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground font-medium">{c.label}</span>
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <c.icon size={18} className="text-primary-foreground" />
              </div>
            </div>
            <p className="text-3xl font-bold text-card-foreground">{stats ? c.value : "—"}</p>
            {c.subtitle && <p className="text-xs text-muted-foreground mt-1">{c.subtitle}</p>}
          </button>
        ))}
      </div>
      <div className="bg-card rounded-xl border border-border/50 shadow-card p-5">
        <h3 className="font-semibold text-card-foreground flex items-center gap-2 mb-4">
          <Receipt size={16} className="text-primary" /> Pipeline des propositions
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {pipeline.map((p) => (
            <div key={p.label} className="flex items-center gap-3 rounded-lg border border-border/50 p-3">
              <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${p.className}`}>
                <p.icon size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-xl font-bold text-card-foreground leading-tight">{stats ? p.value : "—"}</p>
                <p className="text-xs text-muted-foreground truncate">{p.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
