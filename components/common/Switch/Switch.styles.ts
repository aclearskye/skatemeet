import { StyleSheet } from "react-native";
import { C } from "@/lib/theme";

export const styles = StyleSheet.create({
  track: {
    width: 52,
    height: 28,
    backgroundColor: C.surfaceHigh,
    borderWidth: 2,
    borderColor: C.border,
    justifyContent: "center",
  },
  trackOn: {
    backgroundColor: C.primary,
  },
  trackDisabled: {
    opacity: 0.4,
  },
  thumb: {
    position: "absolute",
    top: 3,
    left: 3,
    width: 18,
    height: 18,
    backgroundColor: C.muted,
  },
  thumbOn: {
    left: 27,
    backgroundColor: C.onPrimary,
  },
});
