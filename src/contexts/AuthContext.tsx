import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  email: string;
  display_name?: string | null;
  role: 'user' | 'admin';
  is_enrolled?: boolean;
  is_blocked?: boolean;
  avatar_url?: string | null;
  phone?: string | null;
  created_at?: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  refresh: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (u: User): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from("profiles" as any)
      .select("*")
      .eq("id", u.id)
      .single();

    if (error || !data) {
      // Auto-create a profile if one does not exist yet.
      const newProfile = {
        id: u.id,
        email: u.email ?? "",
        display_name: u.user_metadata?.display_name || u.email?.split("@")[0] || "Student",
        role: "user" as const,
        is_enrolled: false,
        is_blocked: false,
      };
      const { data: created } = await supabase
        .from("profiles" as any)
        .insert(newProfile)
        .select("*")
        .single();
      return (created as unknown as Profile) ?? (newProfile as Profile);
    }
    return data as unknown as Profile;
  }, []);

  const enforceBlocked = useCallback(async (p: Profile | null) => {
    if (p?.is_blocked) {
      await supabase.auth.signOut();
      setProfile(null);
      throw new Error("Your account has been blocked. Contact support.");
    }
  }, []);

  useEffect(() => {
    // Set listener FIRST, then check existing session.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        // Defer Supabase calls to avoid deadlock.
        setTimeout(async () => {
          const p = await fetchProfile(s.user);
          setProfile(p);
          if (p?.is_blocked) {
            await supabase.auth.signOut();
            setProfile(null);
          }
        }, 0);
      } else {
        setProfile(null);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const p = await fetchProfile(s.user);
        setProfile(p);
        if (p?.is_blocked) {
          await supabase.auth.signOut();
          setProfile(null);
        }
      }
      setIsLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn: AuthState["signIn"] = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };

    if (data.user) {
      const p = await fetchProfile(data.user);
      setProfile(p);
      try {
        await enforceBlocked(p);
      } catch (e: any) {
        return { error: e.message };
      }
      // Activity log (fire and forget)
      supabase.from("activity_logs" as any).insert({
        user_id: data.user.id,
        action: "login",
        metadata: { email: data.user.email },
      } as any).then(() => {}, () => {});
    }
    return { error: null };
  };

  const signUp: AuthState["signUp"] = async (email, password, displayName) => {
    const redirectUrl = `${window.location.origin}/dashboard`;
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: redirectUrl, data: { display_name: displayName } },
    });
    if (error) return { error: error.message };
    if (data.user) {
      const p = await fetchProfile(data.user);
      setProfile(p);
    }
    return { error: null };
  };

  const signOut: AuthState["signOut"] = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const forgotPassword: AuthState["forgotPassword"] = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error?.message ?? null };
  };

  const updatePassword: AuthState["updatePassword"] = async (password) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error?.message ?? null };
  };

  const refresh = useCallback(async () => {
    if (user) {
      const p = await fetchProfile(user);
      setProfile(p);
    }
  }, [user, fetchProfile]);

  const isAdmin = profile?.role === "admin";

  const value: AuthState = {
    user, session, profile, isAdmin, isLoading,
    signIn, signUp, signOut, forgotPassword, updatePassword, refresh,
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const v = useContext(AuthCtx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}
