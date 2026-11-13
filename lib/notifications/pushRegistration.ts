import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { supabase } from "@/lib/supabaseClient";

const TOKEN_KEY = "expo_push_token";

// Asked the first time someone posts or chats rather than on launch (md/media_posts.md
// §5), so the prompt arrives with an obvious reason. Best effort: a denial or
// any failure just means no push -- the in-app inbox still gets everything.
export async function registerForPushNotifications(): Promise<void> {
  if (Platform.OS === "web" || !Device.isDevice) return;
  try {
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== "granted") return;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const { error } = await supabase.rpc("register_push_token", { p_token: token, p_platform: Platform.OS });
    if (!error) await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch {
    // No push this time; the next post tries again.
  }
}

// For moments with an obvious reason to want pushes (starting a DM, joining
// a spot chat): registers once, then no-ops. The OS only shows the
// permission prompt the first time, so a refusal isn't re-asked.
export async function ensurePushRegistered(): Promise<void> {
  if (await hasRegisteredPushToken()) return;
  await registerForPushNotifications();
}

// Whether this device has a push token on the server, i.e. whether the
// server's own push will reach it (see lib/notifications/localNotification.ts).
export async function hasRegisteredPushToken(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(TOKEN_KEY)) != null;
  } catch {
    return false;
  }
}

// Called before sign-out so the next account on this device doesn't receive
// the previous one's pushes.
export async function unregisterPushToken(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return;
    await supabase.rpc("unregister_push_token", { p_token: token });
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    // The token is reassigned on the next account's registration anyway.
  }
}
