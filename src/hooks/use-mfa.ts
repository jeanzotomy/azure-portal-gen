import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useMfaCheck() {
  const [mfaVerified, setMfaVerified] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;

    const check = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!active) return;

        if (!session?.user) {
          setMfaVerified(false);
          return;
        }

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

    void check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      void check();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return mfaVerified;
}
