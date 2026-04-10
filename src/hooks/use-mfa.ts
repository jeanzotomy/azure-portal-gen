import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/use-auth-session";

export function useMfaCheck() {
  const { user, ready } = useAuthSession();
  const [mfaVerified, setMfaVerified] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;

    const check = async () => {
      if (!ready) return;

      if (!user) {
        setMfaVerified(false);
        return;
      }

      try {
        const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

        if (!active) return;

        if (error) {
          console.error("MFA check failed", error);
          setMfaVerified(false);
          return;
        }

        setMfaVerified(data?.currentLevel === "aal2");
      } catch (error) {
        console.error("Unexpected MFA check error", error);
        if (active) {
          setMfaVerified(false);
        }
      }
    };

    if (!ready) {
      setMfaVerified(null);
      return () => {
        active = false;
      };
    }

    void check();

    return () => {
      active = false;
    };
  }, [ready, user]);

  return mfaVerified;
}
