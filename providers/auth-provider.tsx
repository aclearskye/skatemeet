import { AuthContext, Profile } from "@/lib/context/use-auth-context";
import { supabase } from "@/lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { AppState, AppStateStatus } from "react-native";
import { PropsWithChildren, useCallback, useEffect, useRef, useState } from "react";

export default function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | undefined | null>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isBanned, setIsBanned] = useState(false);
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

      // The sole ban-enforcement mechanism: a banned account can still sign
      // in (see 20260927000000_bans_without_auth_lockout.sql), so this check
      // -- combined with app/_layout.tsx's redirect to app/banned.tsx -- is
      // what actually confines it, rather than a backup for an Auth-level lock.
      const { data: banned } = await supabase.rpc("is_banned", { p_profile_id: s.user.id });
      setIsBanned(banned === true);
    } else {
      setProfile(null);
      setIsBanned(false);
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
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Several cached queries aren't keyed by viewer (another user's full
      // profile, a chat thread), so the next account on this device must
      // not inherit what the previous one could see.
      if (event === "SIGNED_OUT") queryClient.clear();
      // Signal loading so the UI doesn't flash a stale profile between auth events
      setIsLoadingAuthContext(true);
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

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
        isBanned,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
