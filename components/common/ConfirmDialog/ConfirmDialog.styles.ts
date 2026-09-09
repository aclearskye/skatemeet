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
    gap: 6,
  },
  title: {
    fontFamily: F.heading,
    fontSize: 17,
    color: C.text,
    letterSpacing: 0.3,
  },
  message: {
    fontFamily: F.body,
    fontSize: 14,
    color: C.muted,
    marginBottom: 18,
  },
  buttonRow: { flexDirection: "row", gap: 10 },
  cancelBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: C.border,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelText: { fontFamily: F.mono, fontSize: 12, color: C.muted, letterSpacing: 1 },
  confirmBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: C.errorBorder,
    backgroundColor: C.errorContainer,
    paddingVertical: 14,
    alignItems: "center",
  },
  confirmText: { fontFamily: F.mono, fontSize: 12, color: C.error, letterSpacing: 1 },
});
