import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useMfaCheck() {
  const [mfaVerified, setMfaVerified] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMfaVerified(false);
        return;
      }

      const { data: factors } = await supabase.auth.mfa.listFactors();
      const verifiedFactors = (factors?.totp || []).filter(f => f.status === "verified");

      if (verifiedFactors.length === 0) {
        setMfaVerified(false);
        return;
      }

      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (data?.currentLevel !== "aal2") {
        setMfaVerified(false);
      } else {
        setMfaVerified(true);
      }
    };

    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        check();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return mfaVerified;
}
