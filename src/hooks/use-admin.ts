import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/use-auth-session";

export type AppRole = "admin" | "agent" | "client" | "comptable" | "gestionnaire";

export function useUserRoles() {
  const { user, ready } = useAuthSession();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadRoles = async () => {
      if (!ready) return;

      if (!user) {
        if (active) {
          setRoles([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (!active) return;

      if (error) {
        console.error("Role load failed", error);
        setRoles([]);
        setLoading(false);
        return;
      }

      setRoles((data || []).map((roleRecord: { role: AppRole }) => roleRecord.role));
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
  }, [ready, user]);

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
