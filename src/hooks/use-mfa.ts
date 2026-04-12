import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/use-auth-session";

const SMS_MFA_KEY = "sms_mfa_verified";

/** Mark SMS/custom MFA as verified for the current session */
export function markSmsMfaVerified() {
  sessionStorage.setItem(SMS_MFA_KEY, "true");
}

/** Clear SMS MFA flag (call on logout) */
export function clearSmsMfaVerified() {
  sessionStorage.removeItem(SMS_MFA_KEY);
}

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
        // Check native TOTP AAL2
        const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

        if (!active) return;

        if (error) {
          console.error("MFA check failed", error);
          setMfaVerified(false);
          return;
        }

        if (data?.currentLevel === "aal2") {
          setMfaVerified(true);
          return;
        }

        // Check if SMS MFA was verified this session
        if (sessionStorage.getItem(SMS_MFA_KEY) === "true") {
          setMfaVerified(true);
          return;
        }

        // Check if user has any TOTP factors enrolled
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const hasVerifiedTotp = (factors?.totp || []).some(f => f.status === "verified");

        if (!hasVerifiedTotp) {
          // No TOTP enrolled and no SMS MFA verified → needs MFA setup
          setMfaVerified(false);
          return;
        }

        // Has TOTP but not at AAL2 → needs verification
        setMfaVerified(false);
      } catch (error) {
        console.error("Unexpected MFA check error", error);
        if (active) {
          setMfaVerified(false);
        }
      }
    };

    if (!ready) {
      setMfaVerified(null);
      return () => { active = false; };
    }

    void check();

    return () => { active = false; };
  }, [ready, user]);

  return mfaVerified;
}
