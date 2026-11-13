import { StyleSheet } from "react-native";
import { C, F, R } from "@/lib/theme";

export const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { fontFamily: F.mono, fontSize: 10, letterSpacing: 2, color: C.muted },
  row: { gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    maxWidth: 220,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: C.borderVariant,
    borderRadius: R,
    backgroundColor: C.surfaceLow,
  },
  logo: { width: 28, height: 28, borderRadius: R, backgroundColor: C.surfaceHigh },
  logoPlaceholder: { alignItems: "center", justifyContent: "center" },
  name: { fontFamily: F.bodyBold, fontSize: 13, color: C.text, maxWidth: 160 },
  distance: { fontFamily: F.monoRegular, fontSize: 10, color: C.muted },
});
