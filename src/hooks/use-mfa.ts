import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/use-auth-session";

const SMS_MFA_KEY = "sms_mfa_verified";
const mfaStatusCache = new Map<string, boolean>();
const MFA_CHECK_TIMEOUT_MS = 6000;

/** Mark SMS/custom MFA as verified for the current session */
export function markSmsMfaVerified() {
  sessionStorage.setItem(SMS_MFA_KEY, "true");
}

/** Mark MFA as verified in memory cache (call after successful TOTP verify) */
export function markMfaVerified(userId: string) {
  mfaStatusCache.set(userId, true);
}

/** Clear SMS MFA flag (call on logout) */
export function clearSmsMfaVerified() {
  sessionStorage.removeItem(SMS_MFA_KEY);
  mfaStatusCache.clear();
}

export function useMfaCheck() {
  const { user, ready } = useAuthSession();
  const userId = user?.id ?? null;

  const [mfaVerified, setMfaVerified] = useState<boolean | null>(() => {
    if (!ready) return null;
    if (!userId) return false;
    if (mfaStatusCache.has(userId)) return mfaStatusCache.get(userId) ?? false;
    if (sessionStorage.getItem(SMS_MFA_KEY) === "true") {
      mfaStatusCache.set(userId, true);
      return true;
    }
    return null;
  });

  const resolvedRef = useRef(false);

  useEffect(() => {
    let active = true;
    resolvedRef.current = false;

    const resolve = (value: boolean) => {
      if (!active || resolvedRef.current) return;
      resolvedRef.current = true;
      if (userId) mfaStatusCache.set(userId, value);
      setMfaVerified(value);
    };

    if (!ready) {
      setMfaVerified(null);
      return () => { active = false; };
    }

    if (!userId) {
      resolve(false);
      return () => { active = false; };
    }

    // Fast path: cached or sessionStorage
    if (mfaStatusCache.has(userId)) {
      resolve(mfaStatusCache.get(userId) ?? false);
      return () => { active = false; };
    }

    if (sessionStorage.getItem(SMS_MFA_KEY) === "true") {
      resolve(true);
      return () => { active = false; };
    }

    // Timeout fallback
    const timer = setTimeout(() => {
      console.warn("MFA check timed out, defaulting to unverified");
      resolve(false);
    }, MFA_CHECK_TIMEOUT_MS);

    const check = async () => {
      try {
        const [aalResult, factorsResult] = await Promise.all([
          supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
          supabase.auth.mfa.listFactors(),
        ]);

        if (!active || resolvedRef.current) return;

        if (aalResult.error) {
          console.error("MFA AAL check failed", aalResult.error);
          resolve(false);
          return;
        }

        if (aalResult.data?.currentLevel === "aal2") {
          resolve(true);
          return;
        }

        if (sessionStorage.getItem(SMS_MFA_KEY) === "true") {
          resolve(true);
          return;
        }

        const hasVerifiedTotp = (factorsResult.data?.totp || []).some(f => f.status === "verified");

        if (!hasVerifiedTotp) {
          resolve(false);
          return;
        }

        // Has TOTP but not at AAL2 → needs verification
        resolve(false);
      } catch (error) {
        console.error("Unexpected MFA check error", error);
        resolve(false);
      }
    };

    void check();

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [ready, userId]);

  return mfaVerified;
}
