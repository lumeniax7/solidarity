import { supabase } from "@/lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";

type UseAuthOptions = { redirectOnUnauthenticated?: boolean; redirectPath?: string };
type AppUser = { id: number; openId: string; name: string | null; email: string | null; loginMethod: string; role: "user" | "admin"; createdAt: Date; updatedAt: Date; lastSignedIn: Date };

function toAppUser(user: SupabaseUser): AppUser {
  const now = new Date();
  const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email || "Utilisateur";
  const role = user.user_metadata?.role === "admin" || user.email === "admin@tontine.local" ? "admin" : "user";
  return { id: 0, openId: user.id, name, email: user.email ?? null, loginMethod: "supabase", role, createdAt: new Date(user.created_at), updatedAt: now, lastSignedIn: now };
}

function loginEmail(identifier: string) {
  const value = identifier.trim().toLowerCase();
  if (value === "admin") return "admin@tontine.local";
  if (value === "users" || value === "user") return "users@tontine.local";
  return value.includes("@") ? value : `${value}@tontine.local`;
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
    const normalizedEmail = loginEmail(email);
    const result = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
    if (result.error && (normalizedEmail === "admin@tontine.local" || normalizedEmail === "users@tontine.local")) {
      const created = await supabase.auth.signUp({ email: normalizedEmail, password, options: { data: { full_name: email.trim(), role: email.trim().toLowerCase() === "admin" ? "admin" : "user" } } });
      if (!created.error && created.data.session) return created.data;
      if (!created.error) {
        const confirmationError = new Error("Compte créé. Désactivez la confirmation e-mail dans Supabase, ou confirmez l’adresse avant de vous reconnecter.");
        setError(confirmationError);
        throw confirmationError;
      }
    }
    if (result.error) { setError(result.error); throw result.error; }
    return result.data;
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    setError(null);
    const result = await supabase.auth.signUp({ email: loginEmail(email), password, options: { data: { full_name: fullName, role: email.trim().toLowerCase() === "admin" ? "admin" : "user" } } });
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
