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
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: C.border,
    paddingHorizontal: 4,
  },
  fieldFocused: { borderBottomColor: C.primary },
  input: {
    flex: 1,
    minHeight: 48,
    color: C.text,
    fontFamily: F.body,
    fontSize: 16,
  },
  inputMultiline: { minHeight: 96, paddingTop: 12, textAlignVertical: "top" },
  hint: {
    fontFamily: F.body,
    fontSize: 12,
    color: C.muted,
  },
});
