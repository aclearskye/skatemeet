import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  container: { gap: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerText: { flex: 1, gap: 3 },
  title: { fontFamily: F.mono, fontSize: 11, color: C.muted, letterSpacing: 1 },
  summary: { fontFamily: F.body, fontSize: 13, color: C.text },
  body: { gap: 10 },
  hint: { fontFamily: F.body, fontSize: 12, lineHeight: 17, color: C.muted },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 2 },
  label: { flex: 1, fontFamily: F.bodyBold, fontSize: 14, color: C.text },
  labelOff: { color: C.muted },
  note: { fontFamily: F.body, fontSize: 12, color: C.muted },
  reset: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingVertical: 4 },
  resetText: { fontFamily: F.mono, fontSize: 11, letterSpacing: 1.5, color: C.muted },
});
