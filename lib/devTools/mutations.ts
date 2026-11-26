import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { unregisterPushToken } from "@/lib/notifications/pushRegistration";
import { supabase } from "@/lib/supabaseClient";
import { DEV_SETTINGS_STORAGE_KEY, DevAccountSettings } from "@/lib/devTools/types";

export async function saveDevSettings(settings: DevAccountSettings): Promise<void> {
  await AsyncStorage.setItem(DEV_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

// A real sign-out then sign-in, never a session swap: SIGNED_OUT is what
// clears the React Query cache (AuthProvider), and the screens stack is
// dropped like onSignOutButtonPress does, so nothing from the previous
// account survives. app/_layout.tsx routes the new account from Login.
export async function switchToAccount(email: string, password: string): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    await unregisterPushToken().catch(() => {});
    // Local: only this device. The default (global) ends the account's
    // sessions everywhere, so switching here would sign a test account
    // out on your other devices too.
    await supabase.auth.signOut({ scope: "local" });
  }
  if (router.canDismiss()) router.dismissAll();
  router.replace("/Login");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}
