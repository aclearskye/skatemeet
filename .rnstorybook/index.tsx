import { useEffect } from "react";
import { View } from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { Anton_400Regular } from "@expo-google-fonts/anton";
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  HankenGrotesk_800ExtraBold,
} from "@expo-google-fonts/hanken-grotesk";
import { SpaceMono_400Regular, SpaceMono_700Bold } from "@expo-google-fonts/space-mono";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { storyStyles } from "./storyStyles";
import { view } from "./storybook.requires";

const StorybookUI = view.getStorybookUI({
  storage: {
    getItem: AsyncStorage.getItem,
    setItem: AsyncStorage.setItem,
  },
});

// Standalone Storybook root. app/_layout.tsx renders this instead of the app
// when EXPO_PUBLIC_STORYBOOK_ENABLED is "true"; with it unset, Metro swaps this
// file for an empty stub (see metro.config.js).
export default function StorybookRoot() {
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

  // app/_layout.tsx holds the native splash screen until something hides it.
  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  return (
    <GestureHandlerRootView style={storyStyles.root}>
      {fontsLoaded ? <StorybookUI /> : <View style={storyStyles.root} />}
    </GestureHandlerRootView>
  );
}
