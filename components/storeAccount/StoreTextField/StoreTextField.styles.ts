import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: {
    fontFamily: F.mono,
    fontSize: 11,
    letterSpacing: 1.5,
    color: C.muted,
  },
  input: {
    minHeight: 48,
    borderBottomWidth: 2,
    borderBottomColor: C.border,
    paddingHorizontal: 4,
    color: C.text,
    fontFamily: F.body,
    fontSize: 16,
  },
  inputFocused: { borderBottomColor: C.primary },
  inputMultiline: { minHeight: 96, paddingTop: 12, textAlignVertical: "top" },
  hint: {
    fontFamily: F.body,
    fontSize: 12,
    color: C.muted,
  },
});
