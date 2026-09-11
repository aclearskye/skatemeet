import { StyleSheet } from "react-native";
import { C, F, R } from "@/lib/theme";

export const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: R,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    gap: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  photo: {
    width: 48,
    height: 48,
    borderRadius: R,
  },
  photoPlaceholder: {
    backgroundColor: C.surfaceHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  textColumn: {
    flex: 1,
    gap: 2,
  },
  spotName: {
    fontFamily: F.bodyBold,
    fontSize: 15,
    color: C.text,
  },
  meta: {
    fontFamily: F.monoRegular,
    fontSize: 11,
    color: C.muted,
    letterSpacing: 0.5,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  rejectBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: C.errorBorder,
    backgroundColor: C.errorContainer,
    paddingVertical: 12,
    alignItems: "center",
  },
  rejectText: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.error,
    letterSpacing: 1,
  },
  approveBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: C.primary,
    backgroundColor: C.primary,
    paddingVertical: 12,
    alignItems: "center",
  },
  approveText: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.onPrimary,
    letterSpacing: 1,
  },
});
