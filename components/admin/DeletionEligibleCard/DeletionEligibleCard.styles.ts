import { StyleSheet } from "react-native";
import { C, F, R } from "@/lib/theme";

export const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: R,
    borderWidth: 1,
    borderColor: C.border,
    gap: 14,
    padding: 14,
  },
  textColumn: {
    gap: 2,
  },
  username: {
    fontFamily: F.bodyBold,
    fontSize: 14,
    color: C.text,
  },
  displayName: {
    fontFamily: F.monoRegular,
    fontSize: 12,
    color: C.textVariant,
  },
  meta: {
    fontFamily: F.monoRegular,
    fontSize: 11,
    color: C.muted,
    letterSpacing: 0.5,
  },
  deleteBtn: {
    borderWidth: 2,
    borderColor: C.errorBorder,
    backgroundColor: C.errorContainer,
    paddingVertical: 12,
    alignItems: "center",
  },
  deleteText: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.error,
    letterSpacing: 1,
  },
});
