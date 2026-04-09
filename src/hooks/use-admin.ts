import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "agent" | "client";

export function useUserRoles() {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setRoles([]);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      setRoles((data || []).map((r: any) => r.role as AppRole));
      setLoading(false);
    };
    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      check();
    });
    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = roles.includes("admin");
  const isAgent = roles.includes("agent");

  return { roles, isAdmin, isAgent, loading };
}

/** @deprecated Use useUserRoles instead */
export function useIsAdmin() {
  const { isAdmin, loading } = useUserRoles();
  return { isAdmin, loading };
}
