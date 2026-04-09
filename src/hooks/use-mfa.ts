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

      // Check if user has any verified TOTP factors
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const verifiedFactors = (factors?.totp || []).filter(f => f.status === "verified");

      // If no verified factors, MFA is not set up — force enrollment
      if (verifiedFactors.length === 0) {
        setMfaVerified(false);
        return;
      }

      // If factors exist, check AAL level
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (data?.currentLevel !== "aal2") {
        setMfaVerified(false);
      } else {
        setMfaVerified(true);
      }
    };
    check();
  }, []);

  return mfaVerified;
}
