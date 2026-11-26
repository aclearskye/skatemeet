import { C, F } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { router, Tabs, usePathname } from "expo-router";
import { Platform } from "react-native";
import { useMapPrefetch } from "@/lib/map/useMapPrefetch";
import { useUnreadChatCount } from "@/lib/messages/hooks/useUnreadChatCount";
import { useTabShortcuts } from "@/lib/navigation/hooks/useTabShortcuts";
import { startTab, TAB_SHORTCUTS, tabPath } from "@/lib/navigation/types";

// The bar shows the tabs picked in Settings (Customise navigation), in a
// fixed order: by default Map, Feed, Upload, Search, Profile (a store that
// sells tickets first gets Scan instead of Upload). Unpicked tabs are
// hidden with href: null. The app launches on Feed (a tab navigator
// otherwise opens on the first tab), then moves to the user's start tab
// when Feed isn't in their bar (startTab).
export const unstable_settings = {
  initialRouteName: "index",
};

export default function TabsLayout() {
  // Gets the map's location and nearby spots ready while you're on Feed.
  useMapPrefetch();
  const { keys, isLoaded } = useTabShortcuts();
  const unreadChatCount = useUnreadChatCount();
  const pathname = usePathname();
  const openedOnStartTab = useRef(false);

  // The app launches on Feed (the "/" URL). Once the saved bar is read,
  // move to the user's start tab if Feed isn't in it. Only at launch, so
  // picking Feed from the drawer later still works.
  useEffect(() => {
    if (!isLoaded || openedOnStartTab.current) return;
    openedOnStartTab.current = true;
    const start = startTab(keys);
    if (pathname === "/" && start.key !== "feed") router.replace(tabPath(start) as never);
  }, [isLoaded, keys, pathname]);

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        // Web has its own persistent nav (WebSidebar); the bottom tab bar would
        // just duplicate it.
        tabBarStyle: Platform.OS === "web" ? { display: "none" } : {
          backgroundColor: C.bg,
          borderTopWidth: 2,
          borderTopColor: C.border,
          height: 84,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.muted,
        tabBarLabelStyle: {
          fontFamily: F.mono,
          fontSize: 9,
          letterSpacing: 1.5,
          textTransform: "uppercase",
        },
      }}
    >
      {TAB_SHORTCUTS.map((item) => (
        <Tabs.Screen
          key={item.key}
          name={item.tabName}
          options={{
            title: item.label,
            href: keys.includes(item.key) ? undefined : null,
            tabBarIcon: ({ color, size }) => <Ionicons name={item.icon} color={color} size={size} />,
            // A dot, like the drawer's, when there are unread chats.
            ...(item.key === "chats" && unreadChatCount > 0
              ? { tabBarBadge: "", tabBarBadgeStyle: { minWidth: 10, maxHeight: 10, backgroundColor: C.primary } }
              : {}),
          }}
          listeners={
            item.opens
              ? {
                  // Opens the screen on top instead of switching tabs, so
                  // closing it returns to the tab you were on.
                  tabPress: (e) => {
                    e.preventDefault();
                    router.push(item.opens as never);
                  },
                }
              : undefined
          }
        />
      ))}
    </Tabs>
  );
}
