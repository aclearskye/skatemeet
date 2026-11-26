import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.borderVariant,
  },
  text: { flex: 1, gap: 3 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { flexShrink: 1, fontFamily: F.bodyBold, fontSize: 15, color: C.text },
  detail: { fontFamily: F.body, fontSize: 13, color: C.muted },
  time: { fontFamily: F.mono, fontSize: 12, color: C.textVariant },
});
