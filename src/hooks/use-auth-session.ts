import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import React from "react";

interface AuthSessionContextValue {
  user: User | null;
  ready: boolean;
  /** Horodatage de la déconnexion automatique prévue, posé 15 min avant ; null sinon. */
  idleDeadline: number | null;
  /** Remet le compteur d'inactivité à zéro et masque l'avertissement. */
  stayConnected: () => void;
  /** Déconnexion immédiate (choix de l'utilisateur depuis l'avertissement). */
  signOutNow: () => void;
}

const AuthSessionContext = createContext<AuthSessionContextValue>({
  user: null,
  ready: false,
  idleDeadline: null,
  stayConnected: () => {},
  signOutNow: () => {},
});

const IDLE_TIMEOUT_MS = 4 * 60 * 60 * 1000; // 4 heures
const IDLE_WARN_BEFORE_MS = 15 * 60 * 1000; // avertissement 15 minutes avant
const IDLE_STORAGE_KEY = "cm_last_activity_at";

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [idleDeadline, setIdleDeadline] = useState<number | null>(null);
  const resetTimerRef = useRef<() => void>(() => {});
  const signOutRef = useRef<() => void>(() => {});
  const stayConnected = useCallback(() => resetTimerRef.current(), []);
  const signOutNow = useCallback(() => signOutRef.current(), []);

  useEffect(() => {
    let active = true;

    const applySession = (session: Session | null) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setReady(true);
    };

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => applySession(session))
      .catch(() => {
        if (!active) return;
        setUser(null);
        setReady(true);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // Auto sign-out after 4 hours of inactivity
  useEffect(() => {
    if (!user) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let warnTimer: ReturnType<typeof setTimeout> | null = null;

    const signOutForIdle = async () => {
      setIdleDeadline(null);
      try {
        await supabase.auth.signOut();
      } catch {
        /* ignore */
      }
      try {
        localStorage.removeItem(IDLE_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      // Redirect to auth with a notice
      const url = new URL(window.location.href);
      if (url.pathname !== "/auth") {
        window.location.replace("/auth?reason=idle");
      }
    };

    const resetTimer = () => {
      if (timer) clearTimeout(timer);
      if (warnTimer) clearTimeout(warnTimer);
      try {
        localStorage.setItem(IDLE_STORAGE_KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
      setIdleDeadline(null);
      warnTimer = setTimeout(() => {
        const last = Number(localStorage.getItem(IDLE_STORAGE_KEY) || Date.now());
        setIdleDeadline(last + IDLE_TIMEOUT_MS);
      }, IDLE_TIMEOUT_MS - IDLE_WARN_BEFORE_MS);
      timer = setTimeout(signOutForIdle, IDLE_TIMEOUT_MS);
    };
    resetTimerRef.current = resetTimer;
    signOutRef.current = () => {
      void signOutForIdle();
    };

    // If the user comes back to the tab and idle period elapsed, sign out immediately
    const checkOnFocus = () => {
      try {
        const last = Number(localStorage.getItem(IDLE_STORAGE_KEY) || 0);
        const elapsed = last ? Date.now() - last : 0;
        if (last && elapsed > IDLE_TIMEOUT_MS) {
          signOutForIdle();
          return;
        }
        if (last && elapsed > IDLE_TIMEOUT_MS - IDLE_WARN_BEFORE_MS) {
          // Dans la fenêtre d'avertissement : afficher le bandeau sans réarmer les compteurs.
          setIdleDeadline(last + IDLE_TIMEOUT_MS);
          return;
        }
      } catch {
        /* ignore */
      }
      resetTimer();
    };

    const events: (keyof WindowEventMap)[] = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
      "click",
    ];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    window.addEventListener("focus", checkOnFocus);
    document.addEventListener("visibilitychange", checkOnFocus);

    resetTimer();

    return () => {
      if (timer) clearTimeout(timer);
      if (warnTimer) clearTimeout(warnTimer);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      window.removeEventListener("focus", checkOnFocus);
      document.removeEventListener("visibilitychange", checkOnFocus);
    };
  }, [user]);

  return React.createElement(
    AuthSessionContext.Provider,
    { value: { user, ready, idleDeadline, stayConnected, signOutNow } },
    children
  );
}

export function useAuthSession() {
  return useContext(AuthSessionContext);
}
