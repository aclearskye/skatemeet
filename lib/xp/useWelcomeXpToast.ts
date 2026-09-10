import { useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useToast } from "@/lib/context/toast-context";
import { fetchProfileXpState } from "@/lib/xp/queries";
import type { Profile } from "@/lib/context/use-auth-context";

const welcomedKey = (profileId: string) => `xp_welcomed:${profileId}`;

// Fires the "welcome, you earned XP" toast exactly once per account, the
// first time we see a profile that hasn't finished onboarding yet. That
// condition is true for every signup path (direct email/password, email
// confirmation, first Discord login) since they all converge on the same
// profile/onboarding_completed state the root layout already redirects on —
// and it's false for any pre-existing user who'd already finished onboarding
// before this shipped, so the account-created XP backfill doesn't trigger a
// confusing toast for long-time users.
export function useWelcomeXpToast(profile: Profile | null | undefined) {
  const { showToast } = useToast();
  const checkedProfileId = useRef<string | null>(null);

  useEffect(() => {
    if (!profile || profile.onboarding_completed) return;
    if (checkedProfileId.current === profile.profile_id) return;
    checkedProfileId.current = profile.profile_id;

    let cancelled = false;
    (async () => {
      try {
        const key = welcomedKey(profile.profile_id);
        const alreadyWelcomed = await AsyncStorage.getItem(key);
        if (alreadyWelcomed || cancelled) return;

        const xpState = await fetchProfileXpState(profile.profile_id);
        if (cancelled) return;

        showToast({
          message: `WELCOME TO THE CREW · +${xpState.xpIntoLevel} XP`,
          variant: "success",
        });
        await AsyncStorage.setItem(key, "true");
      } catch {
        // Not a critical path — if this fails, the next mount (still
        // onboarding_completed: false) gets another chance.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile, showToast]);
}
