import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/use-auth-session";

const SMS_MFA_KEY = "sms_mfa_verified";
const mfaStatusCache = new Map<string, boolean>();
const MFA_CHECK_TIMEOUT_MS = 8000;

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

  const [mfaVerified, setMfaVerified] = useState<boolean | null>(() => {
    if (!ready) return null;
    if (!userId) return false;
    if (mfaStatusCache.has(userId)) return mfaStatusCache.get(userId) ?? false;
    // Check sessionStorage synchronously for instant resolution
    if (sessionStorage.getItem(SMS_MFA_KEY) === "true") {
      mfaStatusCache.set(userId, true);
      return true;
    }
    return null;
  });

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;

    // Clear any previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (!ready) {
      setMfaVerified(null);
      return () => { active = false; };
    }

    if (!userId) {
      setMfaVerified(false);
      return () => { active = false; };
    }

    // Fast path: cached or sessionStorage
    if (mfaStatusCache.has(userId)) {
      setMfaVerified(mfaStatusCache.get(userId) ?? false);
      return () => { active = false; };
    }

    if (sessionStorage.getItem(SMS_MFA_KEY) === "true") {
      mfaStatusCache.set(userId, true);
      setMfaVerified(true);
      return () => { active = false; };
    }

    // Set timeout fallback to prevent infinite loading
    timeoutRef.current = setTimeout(() => {
      if (active && mfaVerified === null) {
        console.warn("MFA check timed out, defaulting to unverified");
        mfaStatusCache.set(userId, false);
        setMfaVerified(false);
      }
    }, MFA_CHECK_TIMEOUT_MS);

    const check = async () => {
      try {
        // Run both calls in parallel when possible
        const [aalResult, factorsResult] = await Promise.all([
          supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
          supabase.auth.mfa.listFactors(),
        ]);

        if (!active) return;

        if (aalResult.error) {
          console.error("MFA AAL check failed", aalResult.error);
          mfaStatusCache.set(userId, false);
          setMfaVerified(false);
          return;
        }

        if (aalResult.data?.currentLevel === "aal2") {
          mfaStatusCache.set(userId, true);
          setMfaVerified(true);
          return;
        }

        // Check SMS MFA again (may have been set during the async call)
        if (sessionStorage.getItem(SMS_MFA_KEY) === "true") {
          mfaStatusCache.set(userId, true);
          setMfaVerified(true);
          return;
        }

        const hasVerifiedTotp = (factorsResult.data?.totp || []).some(f => f.status === "verified");

        if (!hasVerifiedTotp) {
          // No TOTP enrolled and no SMS MFA → needs MFA setup
          mfaStatusCache.set(userId, false);
          setMfaVerified(false);
          return;
        }

        // Has TOTP but not at AAL2 → needs verification
        mfaStatusCache.set(userId, false);
        setMfaVerified(false);
      } catch (error) {
        console.error("Unexpected MFA check error", error);
        if (active) {
          mfaStatusCache.set(userId, false);
          setMfaVerified(false);
        }
      }
    };

    void check();

    return () => {
      active = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [ready, userId]);

  return mfaVerified;
}
