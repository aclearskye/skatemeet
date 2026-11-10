import { C, F } from "@/lib/theme";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, Tabs } from "expo-router";
import { Platform } from "react-native";
import { useMapPrefetch } from "@/lib/map/useMapPrefetch";

// The bar reads Map, Feed, Upload, Search, Profile, but the app opens on
// Feed -- by default a tab navigator opens on whichever tab is listed first.
export const unstable_settings = {
  initialRouteName: "index",
};

export default function TabsLayout() {
  // Gets the map's location and nearby spots ready while you're on Feed.
  useMapPrefetch();

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
      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: "Feed",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          title: "Upload",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="plus-box-outline" color={color} size={size} />
          ),
        }}
        listeners={{
          // Opens the composer as a modal instead of switching tabs, so
          // closing it returns to the tab you were on.
          tabPress: (e) => {
            e.preventDefault();
            router.push("/post/new" as never);
          },
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
