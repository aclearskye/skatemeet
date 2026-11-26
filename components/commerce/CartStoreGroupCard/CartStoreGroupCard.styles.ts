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
  storeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 32, height: 32, borderRadius: R, backgroundColor: C.surfaceHigh },
  logoPlaceholder: { alignItems: "center", justifyContent: "center" },
  storeName: { flex: 1, fontFamily: F.heading, fontSize: 18, letterSpacing: 1, color: C.text },
  item: { flexDirection: "row", alignItems: "center", gap: 12 },
  itemImage: { width: 56, height: 56, borderRadius: R, backgroundColor: C.surfaceHigh },
  itemText: { flex: 1, gap: 2 },
  itemTitle: { fontFamily: F.bodyBold, fontSize: 14, color: C.text },
  itemMeta: { fontFamily: F.body, fontSize: 12, color: C.muted },
  itemPrice: { fontFamily: F.mono, fontSize: 12, color: C.primary },
  subtotal: { fontFamily: F.body, fontSize: 12, color: C.muted },
  error: { fontFamily: F.body, fontSize: 13, color: C.error },
  checkoutBtn: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    backgroundColor: C.primary,
    borderRadius: R,
  },
  disabled: { opacity: 0.6 },
  checkoutText: { fontFamily: F.mono, fontSize: 13, letterSpacing: 1.5, color: C.onPrimary },
  doneRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  doneText: { fontFamily: F.body, fontSize: 13, color: C.textVariant },
  link: { fontFamily: F.mono, fontSize: 12, letterSpacing: 1, color: C.primary },
});
