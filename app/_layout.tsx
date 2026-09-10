import { useAuthContext } from "@/lib/context/use-auth-context";
import AuthProvider from "@/providers/auth-provider";
import { DrawerProvider } from "@/lib/context/drawer-context";
import { ToastProvider } from "@/lib/context/toast-context";
import { useWelcomeXpToast } from "@/lib/xp/useWelcomeXpToast";
import DrawerMenu from "@/components/ui/DrawerMenu";
import { ToastHost } from "@/components/ui/ToastHost";
import WebAccountSidebar from "@/components/ui/WebAccountSidebar";
import WebSidebar from "@/components/ui/WebSidebar";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Anton_400Regular,
} from "@expo-google-fonts/anton";
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  HankenGrotesk_800ExtraBold,
} from "@expo-google-fonts/hanken-grotesk";
import {
  SpaceMono_400Regular,
  SpaceMono_700Bold,
} from "@expo-google-fonts/space-mono";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { C } from "@/lib/theme";

// Screen content is capped well beyond its original ~375-430px phone sizing
// so it doesn't look sparse between the two sidebars on desktop, but still
// centered rather than stretched edge-to-edge across the whole browser window.
const WEB_CONTENT_WIDTH = 960;

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const RootNavigation = () => {
  const { session, isLoadingAuthContext, profile } = useAuthContext();
  const segments = useSegments();
  const router = useRouter();

  useWelcomeXpToast(profile);

  const [fontsLoaded] = useFonts({
    Anton_400Regular,
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    HankenGrotesk_800ExtraBold,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });

  useEffect(() => {
    if (isLoadingAuthContext || !fontsLoaded) return;

    const inOnboardingGroup = segments[0] === "(onboarding)";
    const inPublicScreen = segments[0] === "Login" || segments[0] === "SignUp";

    if (!session && !inPublicScreen) {
      router.replace("/Login");
    } else if (session && profile === null && !inPublicScreen && !inOnboardingGroup) {
      router.replace("/(onboarding)");
    } else if (profile && !inOnboardingGroup && !profile.onboarding_completed) {
      router.replace("/(onboarding)");
    } else if (session && profile?.onboarding_completed && (inOnboardingGroup || inPublicScreen || segments[0] === undefined)) {
      router.replace("/(tabs)");
    }

    SplashScreen.hideAsync();
  }, [session, isLoadingAuthContext, profile, segments, router, fontsLoaded]);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  }

  return (
    <ErrorBoundary>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="Login" />
        <Stack.Screen name="SignUp" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="spot-detail" />
        <Stack.Screen name="store-detail" />
        <Stack.Screen name="user/[userId]" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="favourites" />
        <Stack.Screen name="notifications" />
      </Stack>
    </ErrorBoundary>
  );
};

export default function Layout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DrawerProvider>
          <ToastProvider>
            {Platform.OS === "web" ? (
              // No hamburger/drawer on web — nav and account actions live
              // permanently in two sidebars pinned to the true left/right edges
              // of the screen, with the (capped, centered) content between them.
              <View style={[styles.webRoot, { backgroundColor: C.bg }]}>
                <WebSidebar />
                <View style={styles.webBodyOuter}>
                  <View style={[styles.webContentInner, { backgroundColor: C.bg }]}>
                    <RootNavigation />
                  </View>
                </View>
                <WebAccountSidebar />
              </View>
            ) : (
              <View style={{ flex: 1, backgroundColor: C.bg }}>
                <RootNavigation />
                <DrawerMenu />
              </View>
            )}
            <ToastHost />
          </ToastProvider>
        </DrawerProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  webRoot: {
    flex: 1,
    flexDirection: "row",
  },
  webBodyOuter: {
    flex: 1,
    alignItems: "center",
  },
  webContentInner: {
    flex: 1,
    width: "100%",
    maxWidth: WEB_CONTENT_WIDTH,
    overflow: "hidden",
  },
});
