import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  chipText: { fontFamily: F.mono, fontSize: 11, letterSpacing: 1, color: C.muted },
});
