import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

// Matches the viewer's mute button (PostSlide.styles muteBtn): 40px square,
// 2px border, flat offset shadow.
export const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: 4,
  },
  square: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${C.bg}cc`,
    borderWidth: 2,
    borderColor: C.border,
    shadowColor: C.bgLowest,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.6,
    shadowRadius: 0,
    elevation: 4,
  },
  count: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.text,
    textShadowColor: C.bgLowest,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
});
