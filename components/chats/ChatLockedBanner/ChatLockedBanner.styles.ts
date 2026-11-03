import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    borderTopWidth: 2,
    borderTopColor: C.border,
    backgroundColor: C.bgLow,
  },
  text: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.muted,
    letterSpacing: 0.5,
    textAlign: "center",
  },
  link: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.primary,
    letterSpacing: 0.5,
  },
});
