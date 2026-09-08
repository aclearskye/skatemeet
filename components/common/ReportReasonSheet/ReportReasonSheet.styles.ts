import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

const backdropColor = `${C.bgLowest}cc`;

export const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: backdropColor,
  },
  sheet: {
    backgroundColor: C.bg,
    borderTopWidth: 2,
    borderTopColor: C.border,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  title: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  row: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  rowText: { fontFamily: F.body, fontSize: 15, color: C.text },
  cancelBtn: { paddingVertical: 16, alignItems: "center" },
  cancelText: { fontFamily: F.mono, fontSize: 12, color: C.muted, letterSpacing: 1 },
});
