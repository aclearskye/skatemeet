import { StyleSheet } from "react-native";
import { C, F, R } from "@/lib/theme";

export const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { fontFamily: F.mono, fontSize: 11, letterSpacing: 1.5, color: C.muted },
  frame: {
    borderRadius: R,
    borderWidth: 1,
    borderColor: C.borderVariant,
    backgroundColor: C.surfaceHigh,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  square: { width: 96, height: 96 },
  wide: { width: "100%", aspectRatio: 3 },
  image: { width: "100%", height: "100%" },
  actions: { flexDirection: "row", gap: 20 },
  action: { fontFamily: F.mono, fontSize: 11, letterSpacing: 1, color: C.primary },
  remove: { fontFamily: F.mono, fontSize: 11, letterSpacing: 1, color: C.error },
  error: { fontFamily: F.body, fontSize: 12, color: C.error },
});
