import { StyleSheet } from "react-native";
import { C, F, R } from "@/lib/theme";

export const styles = StyleSheet.create({
  container: { gap: 14 },
  title: { fontFamily: F.heading, fontSize: 20, letterSpacing: 1.5, color: C.text },
  hint: { fontFamily: F.body, fontSize: 13, color: C.muted },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 48,
    paddingHorizontal: 12,
    borderRadius: R,
    borderWidth: 1,
    borderColor: C.borderVariant,
    backgroundColor: C.surfaceLow,
  },
  searchInput: { flex: 1, color: C.text, fontFamily: F.body, fontSize: 16 },
  result: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.borderVariant,
  },
  resultText: { flex: 1, gap: 2 },
  resultName: { fontFamily: F.bodyBold, fontSize: 15, color: C.text },
  resultMeta: { fontFamily: F.body, fontSize: 13, color: C.muted },
  owned: { fontFamily: F.mono, fontSize: 10, letterSpacing: 0.5, color: C.secondary, marginTop: 2 },
  error: { fontFamily: F.body, fontSize: 13, color: C.error },
});
