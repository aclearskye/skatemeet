import { StyleSheet } from "react-native";
import { C, F, R } from "@/lib/theme";

export const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 6,
  },
  captionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  captionLeft: {
    fontFamily: F.mono,
    fontSize: 12,
    letterSpacing: 1,
    color: C.text,
    textTransform: "uppercase",
  },
  captionRight: {
    fontFamily: F.mono,
    fontSize: 12,
    letterSpacing: 1,
    color: C.muted,
    textTransform: "uppercase",
  },
  track: {
    height: 22,
    backgroundColor: C.surfaceHigh,
    borderWidth: 2,
    borderColor: C.border,
    borderRadius: R,
    overflow: "hidden",
  },
  fill: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    overflow: "hidden",
  },
});
