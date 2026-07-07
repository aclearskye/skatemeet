import { useAuthContext } from "@/lib/context/use-auth-context";
import AuthProvider from "@/providers/auth-provider";
import { DrawerProvider } from "@/lib/context/drawer-context";
import DrawerMenu from "@/components/ui/DrawerMenu";
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
import { View } from "react-native";
import { C } from "@/lib/theme";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const RootNavigation = () => {
  const { session, isLoadingAuthContext, profile } = useAuthContext();
  const segments = useSegments();
  const router = useRouter();

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
      </Stack>
    </ErrorBoundary>
  );
};

export default function Layout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DrawerProvider>
          <View style={{ flex: 1, backgroundColor: C.bg }}>
            <RootNavigation />
            <DrawerMenu />
          </View>
        </DrawerProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
