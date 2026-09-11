import { useAuthContext } from "@/lib/context/use-auth-context";
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";

// Self-contained gate, mirroring the (tabs) group pattern rather than adding
// another branch to the root layout's already-dense redirect useEffect — no
// self-serve way to become admin, so a non-admin reaching this group (deep
// link, stale UI) is bounced straight back to the app.
export default function AdminLayout() {
  const { profile, isLoadingAuthContext } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (isLoadingAuthContext) return;
    if (!profile?.is_admin) {
      router.replace("/(tabs)");
    }
  }, [profile, isLoadingAuthContext, router]);

  if (!profile?.is_admin) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="verification-requests" />
      <Stack.Screen name="reports" />
      <Stack.Screen name="users" />
      <Stack.Screen name="data-deletion" />
    </Stack>
  );
}
