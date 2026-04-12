import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import React from "react";

interface AuthSessionContextValue {
  user: User | null;
  ready: boolean;
}

const AuthSessionContext = createContext<AuthSessionContextValue>({
  user: null,
  ready: false,
});

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

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

  return React.createElement(
    AuthSessionContext.Provider,
    { value: { user, ready } },
    children
  );
}

export function useAuthSession() {
  return useContext(AuthSessionContext);
}
