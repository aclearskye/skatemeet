import { StyleSheet } from "react-native";
import { C, F, R } from "@/lib/theme";

export const styles = StyleSheet.create({
  card: {
    gap: 10,
    padding: 14,
    borderRadius: R,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceLow,
  },
  skater: { flexDirection: "row", alignItems: "center", gap: 12 },
  skaterText: { flex: 1, gap: 2 },
  name: { fontFamily: F.bodyBold, fontSize: 15, color: C.text },
  ask: { fontFamily: F.bodyBold, fontSize: 14, lineHeight: 20, color: C.text },
  muted: { fontFamily: F.body, fontSize: 13, lineHeight: 18, color: C.muted },
  buttons: { flexDirection: "row", gap: 10, marginTop: 4 },
  button: { flex: 1 },
});
