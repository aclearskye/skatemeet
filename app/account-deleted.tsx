import { C, F } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

const REDIRECT_DELAY_MS = 2500;

// Reached right after DeactivateAccountButton's mutation resolves -- by that
// point supabase.auth.signOut() has already run, so this screen has no
// session. A brief held confirmation reads better than an instant redirect
// straight to /Login, which made a successful deletion look like it hadn't
// done anything.
export default function AccountDeletedScreen() {
  const router = useRouter();

  useEffect(() => {
    const timeout = setTimeout(() => router.replace("/Login"), REDIRECT_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <View style={styles.container}>
      <Ionicons name="checkmark-circle-outline" size={48} color={C.primary} />
      <Text style={styles.title}>YOUR ACCOUNT HAS BEEN DELETED</Text>
      <Text style={styles.message}>
        All your data has been permanently removed. Redirecting you to sign in…
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 16,
  },
  title: {
    fontFamily: F.heading,
    fontSize: 22,
    color: C.text,
    letterSpacing: 1,
    textAlign: "center",
  },
  message: {
    fontFamily: F.body,
    fontSize: 14,
    color: C.textVariant,
    textAlign: "center",
    lineHeight: 20,
  },
});
