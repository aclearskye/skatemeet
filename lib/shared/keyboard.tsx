import { forwardRef, Fragment, type ReactNode } from "react";
import {
  KeyboardAvoidingView as RNKeyboardAvoidingView,
  Platform,
  ScrollView,
  TurboModuleRegistry,
  type KeyboardAvoidingViewProps,
  type ScrollViewProps,
} from "react-native";
import type * as KeyboardControllerLib from "react-native-keyboard-controller";

// The app's one entry point for keeping text fields clear of the on-screen
// keyboard. Import these instead of React Native's KeyboardAvoidingView /
// ScrollView on any screen or sheet with a text field.
//
// Why a library: the app runs edge-to-edge on Android (app.json), where the
// window no longer resizes for the keyboard, so React Native's
// KeyboardAvoidingView (and the old `behavior={ios ? "padding" : undefined}`
// pattern, which relied on that resize) leaves fields under the keyboard.
// react-native-keyboard-controller tracks the keyboard natively on both
// platforms, including inside Modals.
//
// Why the guard: the library throws as soon as it's imported if its native
// module isn't in the build (a dev client built before it was added), which
// would take down every screen. Until the app is rebuilt this falls back to
// React Native's own components, which is roughly the old behaviour.

type Lib = typeof KeyboardControllerLib;

function loadLib(): Lib | null {
  if (Platform.OS === "web") return null;
  if (!TurboModuleRegistry.get("KeyboardController")) return null;
  // Deferred on purpose -- see above. A static import would run (and throw)
  // even when the module is missing.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("react-native-keyboard-controller") as Lib;
}

const lib = loadLib();

// Goes once at the app root.
export function KeyboardProvider({ children }: { children: ReactNode }) {
  if (!lib) return <Fragment>{children}</Fragment>;
  return <lib.KeyboardProvider>{children}</lib.KeyboardProvider>;
}

type AwareScrollProps = ScrollViewProps & {
  // Gap kept between the focused field and the keyboard -- make it cover
  // anything fixed below the scroll view (e.g. a sheet's footer button).
  bottomOffset?: number;
  children?: ReactNode;
};

// A ScrollView that scrolls the focused text field above the keyboard (and
// lets the content scroll fully while the keyboard is up).
export const KeyboardAwareScrollView = forwardRef<ScrollView, AwareScrollProps>(
  function KeyboardAwareScrollView({ bottomOffset = 24, keyboardShouldPersistTaps = "handled", ...props }, ref) {
    if (lib) {
      return (
        <lib.KeyboardAwareScrollView
          ref={ref}
          bottomOffset={bottomOffset}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          {...props}
        />
      );
    }
    return (
      <ScrollView
        ref={ref}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        {...props}
      />
    );
  }
);

// Shrinks to sit above the keyboard -- for layouts with something pinned to
// the bottom (a sheet's footer buttons, the chat composer). Pads on both
// platforms by default.
type AvoidingProps = Omit<KeyboardAvoidingViewProps, "behavior" | "contentContainerStyle"> & {
  behavior?: "padding" | "height";
};

export function KeyboardAvoidingView({ behavior = "padding", ...props }: AvoidingProps) {
  if (lib) return <lib.KeyboardAvoidingView behavior={behavior} {...props} />;
  return <RNKeyboardAvoidingView behavior={Platform.OS === "ios" ? behavior : undefined} {...props} />;
}
