import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useUserRoles } from "@/hooks/use-admin";
import { clearSmsMfaVerified } from "@/hooks/use-mfa";
import { Button } from "@/components/ui/button";
import { Briefcase, LogOut, Shield, FileSignature, Users, GraduationCap } from "lucide-react";
import HrTab from "@/components/HrTab";
import { PortalInfoBar } from "@/components/PortalInfoBar";
import cmLogo from "@/assets/cloudmature-logo.png";

type HrSubTab = "recruitment" | "contracts" | "onboarding" | "trainings";

const SUBS: { id: HrSubTab; label: string; icon: typeof Briefcase }[] = [
  { id: "recruitment", label: "Recrutement", icon: Briefcase },
  { id: "contracts", label: "Générer le contrat", icon: FileSignature },
  { id: "onboarding", label: "Onboarding", icon: Users },
  { id: "trainings", label: "Formation", icon: GraduationCap },
];

export default function HrPortalPage() {
  const { user, ready } = useAuthSession();
  const { isHr, loading } = useUserRoles();
  const navigate = useNavigate();
  const [sub, setSub] = useState<HrSubTab>("recruitment");

  useEffect(() => {
    if (!ready || loading) return;
    if (!user) navigate("/auth");
    else if (!isHr) navigate("/portal");
  }, [ready, loading, user, isHr, navigate]);

  const handleLogout = async () => {
    clearSmsMfaVerified();
    await supabase.auth.signOut();
    navigate("/");
  };

  if (!user || !isHr) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-14 flex items-center justify-between border-b border-border bg-card px-4">
        <div className="flex items-center gap-3">
          <img src={cmLogo} alt="CloudMature" className="h-8 w-auto" />
          <h1 className="text-sm font-semibold flex items-center gap-2">
            <Briefcase size={16} className="text-primary" /> Portail RH
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
            <Shield size={12} /> Ressources Humaines
          </span>
          <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
            {(user.user_metadata?.full_name || user.email || "R").charAt(0).toUpperCase()}
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-destructive">
            <LogOut size={14} />
          </Button>
        </div>
      </header>
      <PortalInfoBar />
      <nav className="border-b border-border bg-card overflow-x-auto">
        <div className="flex gap-1 px-3 py-2">
          {SUBS.map((s) => {
            const active = sub === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSub(s.id)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors ${
                  active ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
                }`}
              >
                <s.icon size={14} />
                {s.label}
              </button>
            );
          })}
        </div>
      </nav>
      <main className="flex-1 p-3 sm:p-6 overflow-auto">
        <HrTab onboardingReadOnly defaultTab={sub} key={sub} />
      </main>
    </div>
  );
}
