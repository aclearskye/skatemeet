import { useAuthContext } from "@/lib/context/use-auth-context";
import AuthProvider from "@/providers/auth-provider";
import { DrawerProvider } from "@/lib/context/drawer-context";
import { ToastProvider } from "@/lib/context/toast-context";
import { useWelcomeXpToast } from "@/lib/xp/useWelcomeXpToast";
import { useCheckInSync } from "@/lib/shared/hooks/useCheckInSync";
import { useChatRealtime } from "@/lib/messages/hooks/useChatRealtime";
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

const RootNavigation = ({ fontsLoaded }: { fontsLoaded: boolean }) => {
  const { session, isLoadingAuthContext, profile, isBanned } = useAuthContext();
  const segments = useSegments();
  const router = useRouter();

  useWelcomeXpToast(profile);
  useCheckInSync();
  useChatRealtime();

  useEffect(() => {
    if (isLoadingAuthContext || !fontsLoaded) return;

    const inOnboardingGroup = segments[0] === "(onboarding)";
    const inPublicScreen = segments[0] === "Login" || segments[0] === "SignUp";
    // Readable signed in or out -- SignUp links to it.
    const inPrivacyScreen = segments[0] === "privacy";
    const inAgeCheckScreen = segments[0] === "age-check";
    const needsAgeCheck = !!profile?.onboarding_completed && !profile.age_confirmed_at;
    const inBannedScreen = segments[0] === "banned";
    const inAccountDeletedScreen = segments[0] === "account-deleted";

    if (session && isBanned && !inBannedScreen) {
      // The only ban enforcement -- a banned account can still authenticate,
      // it's just confined here instead of being rejected at sign-in (see
      // AuthProvider and 20260927000000_bans_without_auth_lockout.sql).
      router.replace("/banned");
    } else if (!session && !inPublicScreen && !inBannedScreen && !inAccountDeletedScreen && !inPrivacyScreen) {
      router.replace("/Login");
    } else if (session && profile === null && !inPublicScreen && !inOnboardingGroup) {
      router.replace("/(onboarding)");
    } else if (profile && !inOnboardingGroup && !profile.onboarding_completed) {
      router.replace("/(onboarding)");
    } else if (session && needsAgeCheck && !inAgeCheckScreen && !inPrivacyScreen && !inAccountDeletedScreen) {
      // One-time 16+ check for accounts that never passed the sign-up gate.
      router.replace("/age-check" as any);
    } else if (
      session &&
      profile?.onboarding_completed &&
      !needsAgeCheck &&
      (inOnboardingGroup || inPublicScreen || inAgeCheckScreen || segments[0] === undefined)
    ) {
      router.replace("/(tabs)");
    }

    SplashScreen.hideAsync();
  }, [session, isLoadingAuthContext, profile, isBanned, segments, router, fontsLoaded]);

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
        <Stack.Screen name="friends" />
        <Stack.Screen name="chats" />
        <Stack.Screen name="chat/[conversationId]" />
        <Stack.Screen name="blocked" />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="age-check" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="banned" />
        <Stack.Screen name="account-deleted" />
      </Stack>
    </ErrorBoundary>
  );
};

export default function Layout() {
  // Lifted above RootNavigation so DrawerMenu (a sibling, not a descendant of
  // RootNavigation) can be gated on it too — otherwise DrawerMenu mounts and
  // lays out its text against the fallback system font before these custom
  // fonts finish loading, and Android swaps the glyphs in place afterward
  // without re-measuring, clipping the wider real glyphs against the stale box.
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
                    <RootNavigation fontsLoaded={fontsLoaded} />
                  </View>
                </View>
                <WebAccountSidebar />
              </View>
            ) : (
              <View style={{ flex: 1, backgroundColor: C.bg }}>
                <RootNavigation fontsLoaded={fontsLoaded} />
                {fontsLoaded && <DrawerMenu />}
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
