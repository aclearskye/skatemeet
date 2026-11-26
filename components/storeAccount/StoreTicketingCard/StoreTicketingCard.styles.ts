import { StyleSheet } from "react-native";
import { C, F, R } from "@/lib/theme";

export const styles = StyleSheet.create({
  card: {
    gap: 14,
    padding: 16,
    borderRadius: R,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceLow,
  },
  checking: { flexDirection: "row", alignItems: "center", gap: 10 },
  connected: { fontFamily: F.bodyBold, fontSize: 15, color: C.text },
  hint: { fontFamily: F.body, fontSize: 13, lineHeight: 19, color: C.muted },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: F.bodyBold, fontSize: 14, color: C.text },
  buttonRow: { flexDirection: "row", gap: 10 },
  buttonHalf: { flex: 1 },
  error: { fontFamily: F.body, fontSize: 13, color: C.error },
});
