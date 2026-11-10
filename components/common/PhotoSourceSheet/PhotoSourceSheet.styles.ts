import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: `${C.bgLowest}cc`,
  },
  sheet: {
    backgroundColor: C.bg,
    borderTopWidth: 2,
    borderTopColor: C.border,
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 10,
  },
  title: {
    fontFamily: F.heading,
    fontSize: 17,
    color: C.text,
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: C.border,
  },
  optionText: { fontFamily: F.mono, fontSize: 12, color: C.text, letterSpacing: 1 },
  cancel: { paddingVertical: 12, alignItems: "center" },
  cancelText: { fontFamily: F.mono, fontSize: 12, color: C.muted, letterSpacing: 1 },
});
