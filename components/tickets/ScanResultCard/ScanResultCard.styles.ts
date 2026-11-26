import { StyleSheet } from "react-native";
import { C, F, R } from "@/lib/theme";

export const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    borderRadius: R,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  banner: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  headline: { fontFamily: F.heading, fontSize: 22, letterSpacing: 2 },
  body: { gap: 14, padding: 16 },
  detail: { fontFamily: F.bodyBold, fontSize: 15, lineHeight: 21, color: C.text },
  skater: { flexDirection: "row", alignItems: "center", gap: 14 },
  skaterText: { flex: 1, gap: 4, alignItems: "flex-start" },
  name: { fontFamily: F.heading, fontSize: 20, letterSpacing: 1, color: C.text },
  muted: { fontFamily: F.body, fontSize: 13, color: C.muted },
  waiver: {
    gap: 4,
    padding: 12,
    borderRadius: R,
    borderWidth: 1,
    borderColor: C.borderVariant,
    backgroundColor: C.surfaceLow,
  },
  waiverMissing: { borderColor: C.errorBorder, backgroundColor: C.errorDim },
  waiverTitle: { fontFamily: F.mono, fontSize: 11, letterSpacing: 1.5, color: C.text },
  waiverLine: { fontFamily: F.bodyBold, fontSize: 14, color: C.text },
  ticket: { gap: 2, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.borderVariant },
  ticketName: { fontFamily: F.bodyBold, fontSize: 15, color: C.text },
});
