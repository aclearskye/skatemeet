import { StyleSheet } from "react-native";
import { C, F, R } from "@/lib/theme";

export const styles = StyleSheet.create({
  section: { gap: 12, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.borderVariant },
  label: { fontFamily: F.mono, fontSize: 10, color: C.muted, letterSpacing: 2 },
  notice: { fontFamily: F.body, fontSize: 13, color: C.muted },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: C.borderVariant,
    borderRadius: R,
  },
  searchInput: { flex: 1, height: 40, fontFamily: F.body, fontSize: 14, color: C.text },
  loading: { paddingVertical: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: { width: "47%", flexGrow: 1, gap: 6 },
  image: { width: "100%", aspectRatio: 1, borderRadius: R, backgroundColor: C.surfaceHigh },
  imagePlaceholder: { alignItems: "center", justifyContent: "center" },
  title: { fontFamily: F.bodyBold, fontSize: 13, color: C.text },
  price: { fontFamily: F.mono, fontSize: 12, color: C.primary },
  soldOut: { color: C.muted },
  more: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: C.borderVariant,
    borderRadius: R,
  },
  moreText: { fontFamily: F.mono, fontSize: 12, letterSpacing: 2, color: C.text },
});
