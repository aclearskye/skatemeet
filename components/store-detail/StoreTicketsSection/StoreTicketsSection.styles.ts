import { StyleSheet } from "react-native";
import { C, F, R } from "@/lib/theme";

export const styles = StyleSheet.create({
  section: { gap: 12, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.borderVariant },
  label: { fontFamily: F.mono, fontSize: 10, color: C.muted, letterSpacing: 2 },
  notice: { fontFamily: F.body, fontSize: 13, color: C.muted },
  tabs: { flexDirection: "row", gap: 8 },
  tab: {
    flex: 1,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: C.borderVariant,
    borderRadius: R,
  },
  tabText: { fontFamily: F.mono, fontSize: 11, letterSpacing: 1.5, color: C.text },
  days: { flexDirection: "row", gap: 4 },
  day: {
    flex: 1,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.borderVariant,
    borderRadius: R,
  },
  dayEmpty: { opacity: 0.35 },
  dayText: { fontFamily: F.mono, fontSize: 10, letterSpacing: 1, color: C.text },
  error: { fontFamily: F.body, fontSize: 13, color: C.error },
});
