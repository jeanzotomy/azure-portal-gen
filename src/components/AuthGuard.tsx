import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useMfaCheck } from "@/hooks/use-mfa";
import { useUserRoles, type AppRole } from "@/hooks/use-admin";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/i18n/LanguageContext";

interface AuthGuardProps {
  children: ReactNode;
  /** Roles allowed to view the protected content. Empty/undefined = any authenticated user. */
  requireRoles?: AppRole[];
  /** Where unauthorized (wrong-role) users should be sent. Defaults to /portal. */
  fallbackRoute?: string;
}

/**
 * Unified rendering guard. Resolves auth + MFA + roles + blocked-status before
 * rendering children. Always returns a node (never null), eliminating any race
 * that could produce a white page during initial hydration.
 *
 * No "early return between hooks" — every hook runs on every render.
 */
export function AuthGuard({ children, requireRoles, fallbackRoute = "/portal" }: AuthGuardProps) {
  const { user, ready } = useAuthSession();
  const { mfaVerified, timedOut: mfaTimedOut } = useMfaCheck();
  const { roles, loading: rolesLoading } = useUserRoles();
  const { t } = useTranslation();
  const location = useLocation();

  const [blockedState, setBlockedState] = useState<"idle" | "loading" | "blocked" | "deleted" | "ok">("idle");

  useEffect(() => {
    let active = true;
    if (!ready || !user) { setBlockedState("idle"); return; }
    setBlockedState("loading");
    supabase
      .from("profiles")
      .select("blocked, deleted_at")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        const deletedAt = (data as { deleted_at?: string | null } | null)?.deleted_at;
        if (data?.blocked) setBlockedState("blocked");
        else if (deletedAt) setBlockedState("deleted");
        else setBlockedState("ok");
      });
    return () => { active = false; };
  }, [ready, user]);

  // ----- Render decisions (no hooks below this point) -----

  // 1. Auth not yet hydrated → loader
  if (!ready) return <FullScreenLoader label={t("portal.loading")} timedOut={mfaTimedOut} />;

  // 2. Not authenticated → /auth (preserve location)
  if (!user) return <Navigate to="/auth" replace state={{ from: location.pathname }} />;

  // 3. Blocked / deleted account
  if (blockedState === "blocked") {
    void supabase.auth.signOut();
    return <Navigate to="/auth?blocked=1" replace />;
  }
  if (blockedState === "deleted") {
    void supabase.auth.signOut();
    return <Navigate to="/auth?deleted=1" replace />;
  }

  // 4. Still resolving MFA / roles / blocked-check → loader
  if (mfaVerified === null || rolesLoading || blockedState === "idle" || blockedState === "loading") {
    return <FullScreenLoader label={t("portal.loading")} timedOut={mfaTimedOut} />;
  }

  // 5. MFA required
  if (mfaVerified === false) return <Navigate to="/mfa" replace />;

  // 6. Role check
  if (requireRoles && requireRoles.length > 0) {
    const allowed = requireRoles.some((r) => roles.includes(r));
    if (!allowed) return <Navigate to={fallbackRoute} replace />;
  }

  return <>{children}</>;
}

function FullScreenLoader({ label, timedOut }: { label: string; timedOut: boolean }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      <p className="text-muted-foreground text-sm">{label}</p>
      {timedOut && (
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          Réessayer
        </Button>
      )}
    </div>
  );
}
