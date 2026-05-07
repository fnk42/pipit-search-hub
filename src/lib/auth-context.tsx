import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "recruiter" | "client" | null;

interface AuthState {
  session: Session | null;
  user: User | null;
  role: AppRole;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (userId: string): Promise<AppRole> => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    return (data?.role as AppRole) ?? null;
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        // defer to avoid deadlock
        setTimeout(async () => {
          setRole(await fetchRole(s.user.id));
          setLoading(false);
        }, 0);
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) setRole(await fetchRole(s.user.id));
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => { await supabase.auth.signOut(); };
  const refreshRole = async () => {
    if (session?.user) setRole(await fetchRole(session.user.id));
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, role, loading, signOut, refreshRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export const TOTAL_PE_UNIVERSE = 91;
export const ENGAGEMENT_TITLE = "Transformari · VP Investor Relations Search";

export function isWhitelistedEmail(email: string): boolean {
  const e = email.trim().toLowerCase();
  return e.endsWith("@goldenpipitrecruiting.com") || e === "sean@transformari.com";
}
