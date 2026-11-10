import { unregisterPushToken } from "@/lib/notifications/pushRegistration";
import { supabase } from "@/lib/supabaseClient";
import { router } from "expo-router";

export const onSignOutButtonPress = async () => {
  // Needs the session still alive -- unregister_push_token is signed-in only.
  await unregisterPushToken();
  const { error } = await supabase.auth.signOut();
  // Drop every screen from the signed-in session rather than just covering
  // them with Login -- left mounted underneath, they re-render with the next
  // account's data (e.g. a brand-new account with no username yet).
  if (router.canDismiss()) router.dismissAll();
  router.replace("/Login");
  if (error) {
    console.error("Error signing out:", error);
  }
};
