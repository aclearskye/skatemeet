import { useEffect, useState } from "react";
import { Keyboard, KeyboardEvent, Platform } from "react-native";

// Height of the on-screen keyboard (0 when hidden), for lifting a bottom
// sheet above it. Used instead of KeyboardAvoidingView because the app runs
// edge-to-edge on Android (app.json), where the window no longer resizes for
// the keyboard and KeyboardAvoidingView inside a Modal doesn't move.
// iOS gets the "will" events so the sheet moves with the keyboard's slide;
// Android only fires "did".
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, (e: KeyboardEvent) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}
