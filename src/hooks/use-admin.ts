import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/use-auth-session";

export type AppRole = "admin" | "agent" | "client" | "comptable" | "gestionnaire" | "hr" | "onboarding";

const roleCache = new Map<string, AppRole[]>();

export function useUserRoles() {
  const { user, ready } = useAuthSession();
  const userId = user?.id ?? null;
  const hasCachedRoles = userId ? roleCache.has(userId) : false;

  const [roles, setRoles] = useState<AppRole[]>(() => {
    if (!userId || !hasCachedRoles) return [];
    return roleCache.get(userId) ?? [];
  });
  const [loading, setLoading] = useState(() => !ready || Boolean(userId && !hasCachedRoles));

  useEffect(() => {
    let active = true;

    const loadRoles = async () => {
      if (!ready) return;

      if (!userId) {
        if (active) {
          setRoles([]);
          setLoading(false);
        }
        return;
      }

      const cachedRoles = roleCache.get(userId);

      if (active) {
        if (cachedRoles) {
          setRoles(cachedRoles);
          setLoading(false);
        } else {
          setLoading(true);
        }
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (!active) return;

      if (error) {
        console.error("Role load failed", error);

        if (!roleCache.has(userId)) {
          setRoles([]);
        }

        setLoading(false);
        return;
      }

      const nextRoles = (data || []).map((roleRecord: { role: AppRole }) => roleRecord.role);

      roleCache.set(userId, nextRoles);
      setRoles(nextRoles);
      setLoading(false);
    };

    void loadRoles();

    // Re-fetch roles when window regains focus (e.g. after admin assigns a new role)
    const onFocus = () => { void loadRoles(); };
    window.addEventListener("focus", onFocus);

    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
    };
  }, [ready, userId]);

  const isAdmin = roles.includes("admin");
  const isAgent = roles.includes("agent");
  const isComptable = roles.includes("comptable");
  const isGestionnaire = roles.includes("gestionnaire");

  return { roles, isAdmin, isAgent, isComptable, isGestionnaire, loading: !ready || loading };
}

/** @deprecated Use useUserRoles instead */
export function useIsAdmin() {
  const { isAdmin, loading } = useUserRoles();
  return { isAdmin, loading };
}
