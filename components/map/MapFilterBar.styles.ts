import { C, F } from "@/lib/theme";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  filtersRow: { flexDirection: "row", gap: 10, paddingVertical: 8, paddingHorizontal: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  chipText: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 1,
    color: C.muted,
    textTransform: "uppercase",
  },
});
