import { StyleSheet } from "react-native";
import { C, F, R } from "@/lib/theme";

export const styles = StyleSheet.create({
  container: { gap: 20 },
  preview: {
    gap: 10,
    padding: 14,
    borderRadius: R,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: C.borderVariant,
    backgroundColor: C.bg,
  },
  field: { gap: 8 },
  label: { fontFamily: F.mono, fontSize: 11, letterSpacing: 1.5, color: C.muted },
  hint: { fontFamily: F.body, fontSize: 13, lineHeight: 19, color: C.muted },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  swatches: { flexDirection: "row", gap: 10 },
  swatch: { width: 40, height: 40, borderRadius: R, alignItems: "center", justifyContent: "center" },
  swatchSelected: { borderWidth: 2, borderColor: C.border },
});
