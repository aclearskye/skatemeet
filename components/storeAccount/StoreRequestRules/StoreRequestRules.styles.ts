import { StyleSheet } from "react-native";
import { C, F, R } from "@/lib/theme";

export const styles = StyleSheet.create({
  container: { gap: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.borderVariant },
  title: { fontFamily: F.mono, fontSize: 11, letterSpacing: 1.5, color: C.muted },
  hint: { fontFamily: F.body, fontSize: 13, lineHeight: 18, color: C.muted },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: F.bodyBold, fontSize: 14, color: C.text },
  amountRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  amount: {
    width: 100,
    height: 40,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: C.borderVariant,
    borderRadius: R,
    fontFamily: F.mono,
    fontSize: 15,
    color: C.text,
  },
  error: { fontFamily: F.body, fontSize: 13, color: C.error },
});
