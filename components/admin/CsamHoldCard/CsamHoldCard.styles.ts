import { StyleSheet } from "react-native";
import { C, F, R } from "@/lib/theme";

export const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: R,
    borderWidth: 1,
    borderColor: C.borderVariant,
    padding: 14,
    gap: 6,
  },
  cardToFile: {
    borderColor: C.tapeRed,
    borderWidth: 2,
  },
  status: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.secondary,
    letterSpacing: 1,
  },
  meta: {
    fontFamily: F.monoRegular,
    fontSize: 11,
    color: C.muted,
    letterSpacing: 0.5,
  },
  fileRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  input: {
    flex: 1,
    backgroundColor: C.surfaceHigh,
    borderWidth: 2,
    borderColor: C.border,
    color: C.text,
    fontFamily: F.monoRegular,
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  fileBtn: {
    backgroundColor: C.primary,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  fileBtnDisabled: {
    opacity: 0.4,
  },
  fileText: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.onPrimary,
    letterSpacing: 1,
  },
});
