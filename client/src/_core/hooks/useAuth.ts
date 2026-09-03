import { supabase } from "@/lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";

type UseAuthOptions = { redirectOnUnauthenticated?: boolean; redirectPath?: string };
type AppUser = { id: number; openId: string; name: string | null; email: string | null; loginMethod: string; role: "user" | "admin"; createdAt: Date; updatedAt: Date; lastSignedIn: Date };

function toAppUser(user: SupabaseUser): AppUser {
  const now = new Date();
  const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email || "Utilisateur";
  const role = user.user_metadata?.role === "admin" ? "admin" : "user";
  return { id: 0, openId: user.id, name, email: user.email ?? null, loginMethod: "supabase", role, createdAt: new Date(user.created_at), updatedAt: now, lastSignedIn: now };
}

export function useAuth(_options?: UseAuthOptions) {
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) return;
      if (sessionError) setError(sessionError);
      setSupabaseUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSupabaseUser(session?.user ?? null);
      setLoading(false);
      setError(null);
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  const logout = useCallback(async () => {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) { setError(signOutError); throw signOutError; }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    const result = await supabase.auth.signInWithPassword({ email, password });
    if (result.error) { setError(result.error); throw result.error; }
    return result.data;
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    setError(null);
    const result = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
    if (result.error) { setError(result.error); throw result.error; }
    return result.data;
  }, []);

  const refresh = useCallback(async () => {
    const { data, error: refreshError } = await supabase.auth.getUser();
    if (refreshError) setError(refreshError);
    setSupabaseUser(data.user ?? null);
  }, []);

  const user = useMemo(() => supabaseUser ? toAppUser(supabaseUser) : null, [supabaseUser]);
  return { user, loading, error, isAuthenticated: Boolean(user), logout, signIn, signUp, refresh };
}
