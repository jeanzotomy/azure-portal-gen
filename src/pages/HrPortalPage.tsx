import { useEffect, useState } from "react";
import { useNavigate, Outlet, useMatch, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useUserRoles } from "@/hooks/use-admin";
import { clearSmsMfaVerified } from "@/hooks/use-mfa";
import { Button } from "@/components/ui/button";
import { Briefcase, LogOut, Shield, FileSignature, Users, GraduationCap, BookOpenCheck, LayoutDashboard } from "lucide-react";
import HrTab from "@/components/HrTab";
import { PortalInfoBar } from "@/components/PortalInfoBar";
import cmLogo from "@/assets/cloudmature-logo.png";
import { ProfileSignatureDialog } from "@/components/ProfileSignatureDialog";

type HrSubTab = "dashboard" | "recruitment" | "contracts" | "onboarding" | "trainings" | "employee-trainings";

const RH_SUBS: { id: HrSubTab; label: string; icon: typeof Briefcase }[] = [
  { id: "dashboard", label: "Vue d'ensemble", icon: LayoutDashboard },
  { id: "contracts", label: "Générer le contrat", icon: FileSignature },
  { id: "onboarding", label: "Onboarding", icon: Users },
  { id: "trainings", label: "Formation (onboarding)", icon: GraduationCap },
];

const RECRUITMENT_SUBS: { id: HrSubTab; label: string; icon: typeof Briefcase }[] = [
  { id: "recruitment", label: "Recrutement", icon: Briefcase },
];

export default function HrPortalPage() {
  const { user, ready } = useAuthSession();
  const { isHr, loading } = useUserRoles();
  const navigate = useNavigate();
  const location = useLocation();
  const [sub, setSub] = useState<HrSubTab>("dashboard");
  const [signatureOpen, setSignatureOpen] = useState(false);
  const formationsMatch = useMatch("/rh/formations/*");
  const isFormationsRoute = !!formationsMatch || location.pathname === "/rh/formations";

  useEffect(() => {
    if (!ready || loading) return;
    if (!user) navigate("/auth");
    else if (!isHr) navigate("/portal");
  }, [ready, loading, user, isHr, navigate]);

  const handleLogout = async () => {
    clearSmsMfaVerified();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (!user || !isHr) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-16 flex items-center border-b border-border bg-card px-4 sm:px-6">
        <div className="max-w-[1400px] mx-auto w-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img src={cmLogo} alt="CloudMature"
  className="h-9 w-auto shrink-0" />
            <div className="hidden sm:block h-8 w-px bg-border" />
            <h1 className="text-sm font-semibold flex items-center gap-2 min-w-0">
              <Briefcase size={16} className="text-primary shrink-0" />
              <span className="truncate">Portail RH</span>
            </h1>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden md:inline-flex text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full font-medium items-center gap-1.5">
              <Shield size={12} /> Ressources Humaines
            </span>
            <div className="flex items-center gap-2 pl-3 sm:border-l border-border">
              <button
                type="button"
                onClick={() => setSignatureOpen(true)}
                title="Ma signature"
                className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-sm font-bold shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
              >
                {(user.user_metadata?.full_name || user.email || "R").charAt(0).toUpperCase()}
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
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">RH</span>
          {RH_SUBS.map((s) => {
            const active = !isFormationsRoute && sub === s.id;
            return (
              <button
                key={s.id}
                onClick={() => {
                  if (isFormationsRoute) navigate("/rh");
                  setSub(s.id);
                }}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors ${
                  active ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
  }`}
              >
                <s.icon size={14} />
                {s.label}
              </button>
            );
          })}
          <div className="w-px h-6 bg-border mx-1" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">Recrutements</span>
          {RECRUITMENT_SUBS.map((s) => {
            const active = !isFormationsRoute && sub === s.id;
            return (
              <button
                key={s.id}
                onClick={() => {
                  if (isFormationsRoute) navigate("/rh");
                  setSub(s.id);
                }}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors ${
                  active ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
  }`}
              >
                <s.icon size={14} />
                {s.label}
              </button>
            );
          })}
          <div className="w-px h-6 bg-border mx-1" />
          <button
            onClick={() => navigate("/rh/formations")}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors ${
              isFormationsRoute ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
  }`}
          >
            <BookOpenCheck size={14} />
            Formations employés
          </button>
        </div>
      </nav>
      <main className="flex-1 p-3 sm:p-6 overflow-auto">
        {isFormationsRoute ? <Outlet /> : <HrTab onboardingReadOnly activeTab={sub} onTabChange={setSub} />}
      </main>
      <ProfileSignatureDialog open={signatureOpen} onOpenChange={setSignatureOpen} />
    </div>
  );
}
