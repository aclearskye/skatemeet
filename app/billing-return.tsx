import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";
import { C } from "@/lib/theme";

// Stripe's return deep link (lib/storeAccounts/openStripePage.ts). On iOS
// the in-app browser session swallows it; on Android it can also reach the
// router, so this just steps back to wherever billing was opened from.
export default function BillingReturnScreen() {
  const router = useRouter();
  useEffect(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, [router]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color={C.primary} />
    </View>
  );
}
