import { AuthContext, Profile } from "@/lib/context/use-auth-context";
import { supabase } from "@/lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";
import { AppState, AppStateStatus } from "react-native";
import { PropsWithChildren, useCallback, useEffect, useRef, useState } from "react";

export default function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | undefined | null>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoadingAuthContext, setIsLoadingAuthContext] =
    useState<boolean>(true);
  const sessionRef = useRef<Session | null | undefined>(session);
  sessionRef.current = session;

  const fetchProfile = useCallback(async (activeSession?: Session | null) => {
    const s = activeSession !== undefined ? activeSession : sessionRef.current;
    if (s) {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("profile_id", s.user.id)
        .single();
      if (error) {
        console.error("Error fetching profile:", error);
        setProfile(null);
      } else {
        setProfile(data as Profile | null);
      }
    } else {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    const fetchSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) {
        console.error("Error fetching session:", error);
      }
      // Don't set loading false here — the profile effect owns that transition
      setSession(session);
    };

    fetchSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // Signal loading so the UI doesn't flash a stale profile between auth events
      setIsLoadingAuthContext(true);
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Single source of truth for the loading → profile fetch → done cycle
  useEffect(() => {
    const load = async () => {
      setIsLoadingAuthContext(true);
      await fetchProfile(session);
      setIsLoadingAuthContext(false);
    };
    load();
  }, [session, fetchProfile]);

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
