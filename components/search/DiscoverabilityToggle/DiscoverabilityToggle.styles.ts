import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    height: 30,
    borderWidth: 2,
  },
  toggleOn: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  toggleOff: {
    backgroundColor: C.bg,
    borderColor: C.border,
  },
  label: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  labelOn: { color: C.onPrimary },
  labelOff: { color: C.muted },
});
