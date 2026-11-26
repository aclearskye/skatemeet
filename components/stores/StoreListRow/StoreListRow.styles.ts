import { StyleSheet } from "react-native";
import { C, F, R } from "@/lib/theme";

export const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: R,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceLow,
  },
  logo: { width: 48, height: 48, borderRadius: R, backgroundColor: C.surfaceHigh },
  logoPlaceholder: { alignItems: "center", justifyContent: "center" },
  text: { flex: 1, gap: 3 },
  name: { fontFamily: F.bodyBold, fontSize: 15, color: C.text },
  address: { fontFamily: F.body, fontSize: 12, color: C.muted },
  detail: { fontFamily: F.monoRegular, fontSize: 11, color: C.textVariant },
  distance: { fontFamily: F.mono, fontSize: 11, letterSpacing: 0.5, color: C.primary },
});
