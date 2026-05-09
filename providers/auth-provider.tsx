import { AuthContext, Profile } from "@/lib/context/use-auth-context";
import { supabase } from "@/lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";
import { AppState, AppStateStatus } from "react-native";
import { PropsWithChildren, useCallback, useEffect, useRef, useState } from "react";

export default function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | undefined | null>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoadingAuthContext, setisLoadingAuthContext] =
    useState<boolean>(true);
  const sessionRef = useRef<Session | null | undefined>(session);
  sessionRef.current = session;

  const fetchProfile = useCallback(async (activeSession?: Session | null) => {
    const s = activeSession !== undefined ? activeSession : sessionRef.current;
    if (s) {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("profile_id", s.user.id)
        .single();
      setProfile(data as Profile | null);
    } else {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    const fetchSession = async () => {
      setisLoadingAuthContext(true);
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) {
        console.error("Error fetching session:", error);
      }
      setSession(session);
      setisLoadingAuthContext(false);
    };

    fetchSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setisLoadingAuthContext(true);
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      setisLoadingAuthContext(true);
      await fetchProfile(session);
      setisLoadingAuthContext(false);
    };
    load();
  }, [session, fetchProfile]);

  // Re-fetch profile whenever the app comes back to the foreground
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "active") {
        fetchProfile();
      }
    };
    const sub = AppState.addEventListener("change", handleAppStateChange);
    return () => sub.remove();
  }, [fetchProfile]);

  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  return (
    <AuthContext.Provider
      value={{
        session,
        isLoadingAuthContext,
        profile,
        isLoggedIn: session !== undefined && session !== null,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
