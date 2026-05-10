import { onSignOutButtonPress } from "@/lib/auth/onSignOutButtonPress";
import { useDrawer } from "@/lib/context/drawer-context";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { avatarColor, C, F } from "@/lib/theme";
import SwitchToBusinessModal from "@/components/ui/SwitchToBusinessModal";
import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DRAWER_WIDTH = 280;

type NavItem = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  path: string;
  match: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: "FEED",    icon: "home-outline",   path: "/",        match: "/"        },
  { label: "MAP",     icon: "map-outline",    path: "/map",     match: "/map"     },
  { label: "PROFILE", icon: "person-outline", path: "/profile", match: "/profile" },
];

export default function DrawerMenu() {
  const { isOpen, closeDrawer } = useDrawer();
  const { profile } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [bizModalVisible, setBizModalVisible] = useState(false);

  const accountType = profile?.account_type ?? "user";

  const openBizModal = () => {
    closeDrawer();
    setBizModalVisible(true);
  };

  const translateX = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(translateX, { toValue: 0,            duration: 280, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 1,       duration: 280, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, { toValue: DRAWER_WIDTH, duration: 220, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0,       duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [isOpen]);

  const navigate = (path: string) => {
    closeDrawer();
    router.push(path as any);
  };

  const handleSignOut = () => {
    closeDrawer();
    onSignOutButtonPress();
  };

  const initials = (() => {
    if (!profile) return "?";
    const src = profile.display_name?.trim() || profile.username || "";
    if (!src) return "?";
    const parts = src.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return src.slice(0, 2).toUpperCase();
  })();

  const displayName =
    profile?.display_name ||
    (profile?.first_name ? `${profile.first_name} ${profile.last_name ?? ""}`.trim() : "") ||
    profile?.username ||
    "";

  const [avatarBg, avatarFg] = avatarColor(profile?.username ?? "");

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents={isOpen ? "auto" : "none"}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={closeDrawer} activeOpacity={1} />
      </Animated.View>

      {/* Panel */}
      <Animated.View
        style={[
          styles.panel,
          {
            transform: [{ translateX }],
            paddingTop: insets.top + 28,
            paddingBottom: insets.bottom + 24,
          },
        ]}
      >
        {/* Profile header */}
        <View style={styles.profileSection}>
          <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
            <Text style={[styles.avatarText, { color: avatarFg }]}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.displayName} numberOfLines={1}>{displayName}</Text>
            <View style={styles.metaRow}>
              {profile?.username ? (
                <Text style={styles.username}>@{profile.username}</Text>
              ) : null}
              {profile?.username && profile?.city ? (
                <Text style={styles.metaDot}>·</Text>
              ) : null}
              {profile?.city ? (
                <>
                  <Ionicons name="location-outline" size={11} color={C.muted} />
                  <Text style={styles.location}>{profile.city}</Text>
                </>
              ) : null}
            </View>
          </View>
          <TouchableOpacity style={styles.notifBtn} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={22} color={C.muted} />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* Nav items */}
        <View style={styles.navSection}>
          {NAV_ITEMS.map(({ label, icon, path, match }) => {
            const active = pathname === match;
            return (
              <TouchableOpacity
                key={path}
                style={[styles.navItem, active && styles.navItemActive]}
                onPress={() => navigate(path)}
                activeOpacity={0.7}
              >
                <Ionicons name={icon} size={18} color={active ? C.primary : C.muted} />
                <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={[styles.divider, styles.dividerBottom]} />

        {/* Business account section */}
        {accountType === "user" && (
          <TouchableOpacity style={styles.navItem} onPress={openBizModal} activeOpacity={0.7}>
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

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={18} color={C.error} />
          <Text style={styles.signOutText}>SIGN OUT</Text>
        </TouchableOpacity>
      </Animated.View>

      <SwitchToBusinessModal visible={bizModalVisible} onClose={() => setBizModalVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  panel: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: C.bgLow,
    borderLeftWidth: 2,
    borderLeftColor: C.border,
    paddingHorizontal: 20,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 16,
  },
  notifBtn: {
    padding: 4,
    flexShrink: 0,
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
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
  },
  metaDot: {
    fontFamily: F.body,
    fontSize: 12,
    color: C.muted,
  },
  username: {
    fontFamily: F.monoRegular,
    fontSize: 12,
    color: C.muted,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  location: {
    fontFamily: F.body,
    fontSize: 12,
    color: C.muted,
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
  navSection: {
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
