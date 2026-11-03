import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 2,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  field: {
    borderBottomWidth: 2,
    borderBottomColor: C.border,
    height: 48,
    color: C.text,
    fontFamily: F.body,
    fontSize: 16,
    textAlign: "center",
  },
  fieldFocused: {
    borderBottomColor: C.primary,
  },
  short: {
    flex: 1,
  },
  long: {
    flex: 1.6,
  },
});
