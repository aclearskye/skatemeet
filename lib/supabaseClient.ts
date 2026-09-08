import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import "react-native-url-polyfill/auto";

const ExpoWebSecureStoreAdapter = {
  getItem: (key: string) => {
    console.debug("getItem", { key });
    return AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    return AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
  {
    auth: {
      ...(Platform.OS !== "web" ? { storage: ExpoWebSecureStoreAdapter } : {}),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === "web",
      flowType: "pkce",
    },
  },
);
