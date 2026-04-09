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
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (data?.nextLevel === "aal2" && data?.currentLevel !== "aal2") {
        setMfaVerified(false);
      } else {
        setMfaVerified(true);
      }
    };
    check();
  }, []);

  return mfaVerified;
}
