import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  hint: { fontFamily: F.body, fontSize: 13, color: C.muted, textAlign: "center" },
  error: { fontFamily: F.body, fontSize: 13, color: C.error },
  saved: { color: C.primary },
  saveBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: C.border,
    backgroundColor: C.bg,
  },
  saveStatus: { flex: 1, fontFamily: F.monoRegular, fontSize: 12, color: C.muted },
  saveButton: { width: 150 },
});
