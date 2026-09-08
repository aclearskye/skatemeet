import { NAV_ITEMS } from "@/components/ui/DrawerMenu";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { C, F } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function WebSidebar() {
  const { session, profile } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  // No app nav on auth/onboarding screens — this sidebar is for the logged-in app only.
  if (!session || !profile?.onboarding_completed) return null;

  return (
    <View style={[styles.sidebar, { paddingTop: insets.top + 24 }]}>
      <Text style={styles.logo}>SKATEMEET</Text>

      <View style={styles.divider} />

      <View style={styles.nav}>
        {NAV_ITEMS.map(({ label, icon, path, match }) => {
          const active = pathname === match;
          return (
            <TouchableOpacity
              key={path}
              style={[styles.navItem, active && styles.navItemActive]}
              onPress={() => router.push(path as any)}
              activeOpacity={0.7}
            >
              <Ionicons name={icon} size={18} color={active ? C.primary : C.muted} />
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 220,
    paddingHorizontal: 16,
    borderRightWidth: 2,
    borderRightColor: C.border,
    backgroundColor: C.bgLow,
  },
  logo: {
    fontFamily: F.heading,
    fontSize: 28,
    color: C.text,
    letterSpacing: 1,
    textAlign: "center",
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  divider: {
    height: 2,
    backgroundColor: C.border,
    marginBottom: 20,
  },
  nav: {
    gap: 2,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 12,
  },
  navItemActive: {
    backgroundColor: C.surfaceHigh,
  },
  navLabel: {
    fontFamily: F.mono,
    fontSize: 12,
    letterSpacing: 2,
    color: C.muted,
  },
  navLabelActive: {
    color: C.primary,
  },
});
