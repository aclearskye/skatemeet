import { useAuthContext } from "@/lib/context/use-auth-context";
import AuthProvider from "@/providers/auth-provider";
import { DrawerProvider } from "@/lib/context/drawer-context";
import { ToastProvider } from "@/lib/context/toast-context";
import { UploadQueueProvider } from "@/lib/context/upload-queue-context";
import { VideoSoundProvider } from "@/lib/context/video-sound-context";
import { KeyboardProvider } from "@/lib/shared/keyboard";
import { UploadProgressBar } from "@/components/posts/UploadProgressBar";
import { useWelcomeXpToast } from "@/lib/xp/useWelcomeXpToast";
import { useCheckInSync } from "@/lib/shared/hooks/useCheckInSync";
import { useLiveLocationReporter } from "@/lib/shared/hooks/useLiveLocationReporter";
import { useChatRealtime } from "@/lib/messages/hooks/useChatRealtime";
import { useSpotChatsRealtime } from "@/lib/spotChat/hooks/useSpotChatsRealtime";
import { usePushNotificationRouting } from "@/lib/notifications/usePushNotificationRouting";
import DrawerMenu from "@/components/ui/DrawerMenu";
import { ToastHost } from "@/components/ui/ToastHost";
import WebAccountSidebar from "@/components/ui/WebAccountSidebar";
import WebSidebar from "@/components/ui/WebSidebar";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
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
import StorybookRoot from "@/.rnstorybook";

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
  useLiveLocationReporter();
  useChatRealtime();
  useSpotChatsRealtime();
  usePushNotificationRouting();

  useEffect(() => {
    if (isLoadingAuthContext || !fontsLoaded) return;

    const inOnboardingGroup = segments[0] === "(onboarding)";
    const inPublicScreen =
      segments[0] === "Login" || segments[0] === "SignUp" || segments[0] === "store-sign-up";
    const inStoreGroup = segments[0] === "(store)";
    // A business account never sees skater onboarding, the age check or the
    // app itself until Phase 2 -- only its own dashboard (docs/ACCOUNT_TYPES.md).
    const isStoreAccount = profile?.account_type === "store";
    // Readable signed in or out -- SignUp links to it.
    const inPrivacyScreen = segments[0] === "privacy";
    const inAgeCheckScreen = segments[0] === "age-check";
    const needsAgeCheck = !!profile?.onboarding_completed && !profile.age_confirmed_at;
    const inBannedScreen = segments[0] === "banned";
    const inAccountDeletedScreen = segments[0] === "account-deleted";
    // A single shared post is viewable logged out (web share links); the
    // composer and grid browser still need a session.
    const [firstSegment, secondSegment] = segments as string[];
    const inPublicPostScreen =
      firstSegment === "post" && secondSegment != null && secondSegment !== "new" && secondSegment !== "browse";

    if (session && isBanned && !inBannedScreen) {
      // The only ban enforcement -- a banned account can still authenticate,
      // it's just confined here instead of being rejected at sign-in (see
      // AuthProvider and 20260927000000_bans_without_auth_lockout.sql).
      router.replace("/banned");
    } else if (
      !session &&
      !inPublicScreen &&
      !inBannedScreen &&
      !inAccountDeletedScreen &&
      !inPrivacyScreen &&
      !inPublicPostScreen
    ) {
      router.replace("/Login");
    } else if (session && isStoreAccount) {
      if (!inStoreGroup && !inPrivacyScreen && !inAccountDeletedScreen) {
        router.replace("/(store)" as never);
      }
    } else if (session && profile === null && !inPublicScreen && !inOnboardingGroup) {
      router.replace("/(onboarding)");
    } else if (profile && !inOnboardingGroup && !profile.onboarding_completed) {
      router.replace("/(onboarding)");
    } else if (session && needsAgeCheck && !inAgeCheckScreen && !inPrivacyScreen && !inAccountDeletedScreen) {
      // One-time 18+ check for accounts that never passed the current
      // sign-up gate (all pre-18+ accounts were reset to need it).
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
        <Stack.Screen name="store-sign-up" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(store)" />
        <Stack.Screen name="spot-detail" />
        <Stack.Screen name="store-detail" />
        <Stack.Screen name="user/[userId]" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="favourites" />
        <Stack.Screen name="friends" />
        <Stack.Screen name="chats" />
        <Stack.Screen name="chat/[conversationId]" />
        <Stack.Screen name="spot-chat" />
        <Stack.Screen name="blocked" />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="age-check" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="banned" />
        <Stack.Screen name="account-deleted" />
        <Stack.Screen name="post/new" options={{ presentation: "modal" }} />
        <Stack.Screen name="post/[postId]" />
        <Stack.Screen name="post/browse" />
        <Stack.Screen name="follows/[userId]" />
        <Stack.Screen name="archive" />
      </Stack>
    </ErrorBoundary>
  );
};

function AppLayout() {
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
    // Gesture-handler gestures (e.g. the post viewer's tap / double tap /
    // hold) only work under this root.
    <GestureHandlerRootView style={{ flex: 1 }}>
    <KeyboardProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DrawerProvider>
          <ToastProvider>
            <UploadQueueProvider>
            <VideoSoundProvider>
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
            {fontsLoaded && <UploadProgressBar />}
            <ToastHost />
            </VideoSoundProvider>
            </UploadQueueProvider>
          </ToastProvider>
        </DrawerProvider>
      </AuthProvider>
    </QueryClientProvider>
    </KeyboardProvider>
    </GestureHandlerRootView>
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

// `npm run storybook` swaps the whole app for the standalone component browser
// (.rnstorybook/). Otherwise Metro stubs that import out of the bundle.
export default process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === "true" ? StorybookRoot : AppLayout;
