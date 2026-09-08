import { onSignOutButtonPress } from "@/lib/auth/onSignOutButtonPress";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { avatarColor, C, F } from "@/lib/theme";
import { IconBadgeButton } from "@/components/common/IconBadgeButton";
import SwitchToBusinessModal from "@/components/ui/SwitchToBusinessModal";
import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function WebAccountSidebar() {
  const { profile, session } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [bizModalVisible, setBizModalVisible] = useState(false);
  const settingsActive = pathname === "/settings";

  // No account sidebar on auth/onboarding screens — this is for the logged-in app only.
  if (!session || !profile?.onboarding_completed) return null;

  const accountType = profile?.account_type ?? "user";

  const initials = (() => {
    const src = profile.display_name?.trim() || profile.username || "";
    if (!src) return "?";
    const parts = src.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return src.slice(0, 2).toUpperCase();
  })();

  const displayName =
    profile.display_name ||
    (profile.first_name ? `${profile.first_name} ${profile.last_name ?? ""}`.trim() : "") ||
    profile.username ||
    "";

  const [avatarBg, avatarFg] = avatarColor(profile.username ?? "");

  return (
    <View style={[styles.sidebar, { paddingTop: insets.top + 24 }]}>
      {/* Profile details */}
      <View style={styles.profileSection}>
        {profile.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} resizeMode="cover" />
        ) : (
          <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
            <Text style={[styles.avatarText, { color: avatarFg }]}>{initials}</Text>
          </View>
        )}
        <View style={styles.profileInfo}>
          <Text style={styles.displayName} numberOfLines={1}>{displayName}</Text>
          {profile.username ? <Text style={styles.username}>@{profile.username}</Text> : null}
        </View>
        <View style={styles.iconRow}>
          <IconBadgeButton icon="notifications-outline" hasBadge={false} />
          <IconBadgeButton icon="mail-outline" hasBadge={false} />
        </View>
      </View>

      <View style={styles.divider} />

      <TouchableOpacity
        style={[styles.navItem, settingsActive && styles.navItemActive]}
        onPress={() => router.push("/settings")}
        activeOpacity={0.7}
      >
        <Ionicons name="settings-outline" size={18} color={settingsActive ? C.primary : C.muted} />
        <Text style={[styles.navLabel, settingsActive && styles.navLabelActive]}>SETTINGS</Text>
      </TouchableOpacity>

      {/* Pushed to the bottom via dividerBottom's marginTop: "auto" */}
      <View style={[styles.divider, styles.dividerBottom]} />

      {accountType === "user" && (
        <TouchableOpacity style={styles.navItem} onPress={() => setBizModalVisible(true)} activeOpacity={0.7}>
          <Ionicons name="briefcase-outline" size={18} color={C.muted} />
          <Text style={styles.navLabel}>SWITCH TO BUSINESS</Text>
        </TouchableOpacity>
      )}
      {accountType === "business_pending" && (
        <View style={styles.pendingRow}>
          <Ionicons name="time-outline" size={16} color={C.secondary} />
          <Text style={styles.pendingText}>BUSINESS REVIEW PENDING</Text>
        </View>
      )}

      <TouchableOpacity style={styles.signOutBtn} onPress={onSignOutButtonPress} activeOpacity={0.7}>
        <Ionicons name="log-out-outline" size={18} color={C.error} />
        <Text style={styles.signOutText}>SIGN OUT</Text>
      </TouchableOpacity>

      <SwitchToBusinessModal visible={bizModalVisible} onClose={() => setBizModalVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 260,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderLeftWidth: 2,
    borderLeftColor: C.border,
    backgroundColor: C.bgLow,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 4,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    fontFamily: F.heading,
    fontSize: 16,
    letterSpacing: 1,
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  displayName: {
    fontFamily: F.bodyBold,
    fontSize: 15,
    color: C.text,
  },
  username: {
    fontFamily: F.monoRegular,
    fontSize: 12,
    color: C.muted,
  },
  iconRow: {
    flexDirection: "row",
    gap: 4,
    flexShrink: 0,
  },
  divider: {
    height: 2,
    backgroundColor: C.border,
    marginVertical: 16,
  },
  dividerBottom: {
    marginTop: "auto",
    marginBottom: 8,
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
  pendingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 12,
  },
  pendingText: {
    fontFamily: F.mono,
    fontSize: 11,
    letterSpacing: 1,
    color: C.secondary,
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 12,
  },
  signOutText: {
    fontFamily: F.mono,
    fontSize: 12,
    letterSpacing: 2,
    color: C.error,
  },
});
