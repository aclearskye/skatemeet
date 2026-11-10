import { TS } from "@/lib/theme";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  rowWrap: {
    flexWrap: "wrap",
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: {
    ...TS.labelTape,
  },
});
