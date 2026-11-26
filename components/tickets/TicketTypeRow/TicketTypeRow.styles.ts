import { StyleSheet } from "react-native";
import { C, F, R } from "@/lib/theme";

export const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: R,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceLow,
  },
  inactive: { opacity: 0.6 },
  text: { flex: 1, gap: 3 },
  name: { fontFamily: F.bodyBold, fontSize: 15, color: C.text },
  detail: { fontFamily: F.body, fontSize: 13, color: C.textVariant },
  price: { fontFamily: F.mono, fontSize: 12, color: C.primary },
  edit: { fontFamily: F.mono, fontSize: 10, letterSpacing: 1.5, color: C.muted, marginTop: 2 },
  toggle: { alignItems: "center", gap: 4 },
  toggleLabel: { fontFamily: F.mono, fontSize: 9, letterSpacing: 1, color: C.muted },
});
