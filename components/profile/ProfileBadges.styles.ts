import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  // Smaller tapes need less room around them.
  rowCompact: {
    gap: 6,
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  rowWrap: {
    flexWrap: "wrap",
  },
});
