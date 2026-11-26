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
  label: { fontFamily: F.mono, fontSize: 11, letterSpacing: 1.5, color: C.muted },
  connected: { fontFamily: F.bodyBold, fontSize: 15, color: C.text },
  hint: { fontFamily: F.body, fontSize: 13, color: C.muted },
  help: { fontFamily: F.body, fontSize: 13, lineHeight: 19, color: C.textVariant },
  tabs: { flexDirection: "row", gap: 8 },
  tab: {
    flex: 1,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: C.borderVariant,
    borderRadius: R,
  },
  tabSelected: { borderColor: C.primary, backgroundColor: C.primary },
  tabText: { fontFamily: F.mono, fontSize: 11, letterSpacing: 1.5, color: C.text },
  tabTextSelected: { color: C.onPrimary },
  error: { fontFamily: F.body, fontSize: 13, color: C.error },
});
