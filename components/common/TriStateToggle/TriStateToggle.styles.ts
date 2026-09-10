import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

// Recipe from docs/theme/sk8meet-theme-sheet.html "Toggle group": segments
// share one 2px ink frame with 2px internal dividers, not separate chips.
export const styles = StyleSheet.create({
  container: { gap: 8 },
  label: { fontFamily: F.mono, fontSize: 10, color: C.muted, letterSpacing: 2 },
  group: { flexDirection: "row", borderWidth: 2, borderColor: C.border },
  segment: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 16,
    alignItems: "center",
    backgroundColor: C.surface,
  },
  segmentDivider: { borderRightWidth: 2, borderRightColor: C.border },
  segmentText: { fontFamily: F.mono, fontSize: 12, letterSpacing: 1, color: C.muted },
});
