import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 6 },
  step: { flex: 1, paddingTop: 8, borderTopWidth: 3, borderTopColor: C.borderVariant },
  stepDone: { borderTopColor: C.primary },
  label: { fontFamily: F.mono, fontSize: 10, letterSpacing: 1, color: C.muted },
  labelCurrent: { color: C.text },
});
