import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { useAuthContext } from "@/lib/context/use-auth-context";

// Business accounts only. The root layout sends Store accounts here; anyone
// else reaching it (deep link, stale UI) goes back to the app.
export default function StoreLayout() {
  const { profile, isLoadingAuthContext } = useAuthContext();
  const router = useRouter();
  const isStore = profile?.account_type === "store";

  useEffect(() => {
    if (isLoadingAuthContext) return;
    if (!isStore) router.replace("/(tabs)");
  }, [isStore, isLoadingAuthContext, router]);

  if (!isStore) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
