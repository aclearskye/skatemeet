import { Platform, StyleSheet } from "react-native";

import { C, SP } from "@/lib/theme";

// iPhone 14/15 logical size: components are laid out at the width they get
// in the app, not stretched across a desktop browser.
const PHONE_WIDTH = 390;
const PHONE_HEIGHT = 844;
const isWeb = Platform.OS === "web";

export const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    alignItems: "center",
    // On a real phone the frame is the screen; on web it's a phone-sized
    // column on a slightly lighter backdrop so its edges are visible.
    backgroundColor: isWeb ? C.bgMid : C.bg,
    paddingVertical: isWeb ? SP.stackMd : 0,
  },
  phone: {
    width: "100%",
    maxWidth: PHONE_WIDTH,
    backgroundColor: C.bg,
  },
  gutter: { padding: SP.gutter },
  inline: { alignItems: "flex-start" },
  screen: {
    flex: 1,
    maxHeight: PHONE_HEIGHT,
    position: "relative",
    overflow: "hidden",
  },
});
