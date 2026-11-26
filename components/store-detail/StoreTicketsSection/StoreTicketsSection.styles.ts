import { StyleSheet } from "react-native";
import { C, F, R } from "@/lib/theme";

export const styles = StyleSheet.create({
  section: { gap: 12, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.borderVariant },
  label: { fontFamily: F.mono, fontSize: 10, color: C.muted, letterSpacing: 2 },
  notice: { fontFamily: F.body, fontSize: 13, color: C.muted },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: C.borderVariant,
    borderRadius: R,
  },
  text: { flex: 1, gap: 3 },
  name: { fontFamily: F.bodyBold, fontSize: 14, color: C.text },
  detail: { fontFamily: F.body, fontSize: 13, color: C.textVariant },
  description: { fontFamily: F.body, fontSize: 12, lineHeight: 17, color: C.muted },
  price: { fontFamily: F.mono, fontSize: 12, color: C.primary },
  buy: {
    minWidth: 72,
    height: 40,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: R,
    backgroundColor: C.primary,
  },
  buyBusy: { opacity: 0.6 },
  // Outlined in the page accent: a ticket the skater already holds.
  view: { borderWidth: 2, backgroundColor: "transparent" },
  buyText: { fontFamily: F.mono, fontSize: 12, letterSpacing: 2, color: C.onPrimary },
  error: { fontFamily: F.body, fontSize: 13, color: C.error },
});
