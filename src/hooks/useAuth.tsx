import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { isSupabaseConfigured, missingSupabaseEnv, supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

const AUTH_INIT_TIMEOUT_MS = 5000;

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({ user: null, session: null, loading: true, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      console.error(`[supabase] Missing environment variables: ${missingSupabaseEnv.join(", ")}`);
      setLoading(false);
      return;
    }

    let isMounted = true;
    const timeoutId = window.setTimeout(() => {
      if (!isMounted) return;
      console.warn(`[supabase] Session initialization timed out after ${AUTH_INIT_TIMEOUT_MS}ms`);
      setLoading(false);
    }, AUTH_INIT_TIMEOUT_MS);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch((error) => {
        console.error("[supabase] Failed to get current session.", error);
        if (!isMounted) return;
        setLoading(false);
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
      });

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
