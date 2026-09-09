import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  container: { gap: 8 },
  label: { fontFamily: F.mono, fontSize: 10, color: C.muted, letterSpacing: 2 },
  row: { flexDirection: "row", gap: 8 },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  segmentText: { fontFamily: F.mono, fontSize: 11, letterSpacing: 1, color: C.muted },
});
