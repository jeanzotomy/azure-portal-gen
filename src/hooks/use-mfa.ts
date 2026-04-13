import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/use-auth-session";

const SMS_MFA_KEY = "sms_mfa_verified";
const mfaStatusCache = new Map<string, boolean>();

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
  const userId = user?.id ?? null;
  const hasCachedMfaStatus = userId ? mfaStatusCache.has(userId) : false;

  const [mfaVerified, setMfaVerified] = useState<boolean | null>(() => {
    if (!ready) return null;
    if (!userId) return false;
    return hasCachedMfaStatus ? mfaStatusCache.get(userId) ?? false : null;
  });

  useEffect(() => {
    let active = true;

    const check = async () => {
      if (!ready) return;

      if (!userId) {
        setMfaVerified(false);
        return;
      }

      if (mfaStatusCache.has(userId)) {
        setMfaVerified(mfaStatusCache.get(userId) ?? false);
      } else {
        setMfaVerified(null);
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
          mfaStatusCache.set(userId, true);
          setMfaVerified(true);
          return;
        }

        // Check if SMS MFA was verified this session
        if (sessionStorage.getItem(SMS_MFA_KEY) === "true") {
          mfaStatusCache.set(userId, true);
          setMfaVerified(true);
          return;
        }

        // Check if user has any TOTP factors enrolled
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const hasVerifiedTotp = (factors?.totp || []).some(f => f.status === "verified");

        if (!hasVerifiedTotp) {
          // No TOTP enrolled and no SMS MFA verified → needs MFA setup
          mfaStatusCache.set(userId, false);
          setMfaVerified(false);
          return;
        }

        // Has TOTP but not at AAL2 → needs verification
        mfaStatusCache.set(userId, false);
        setMfaVerified(false);
      } catch (error) {
        console.error("Unexpected MFA check error", error);

        if (active && !mfaStatusCache.has(userId)) {
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
  }, [ready, userId]);

  return mfaVerified;
}
