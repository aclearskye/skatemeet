import { StyleSheet } from "react-native";
import { C, F, R } from "@/lib/theme";

export const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: C.borderVariant,
  },
  logo: { width: 48, height: 48, borderRadius: R, backgroundColor: C.surfaceHigh },
  logoPlaceholder: { alignItems: "center", justifyContent: "center" },
  text: { flex: 1, gap: 3 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4 },
  badgeText: { fontFamily: F.mono, fontSize: 11, letterSpacing: 1, color: C.secondary },
  followers: { fontFamily: F.monoRegular, fontSize: 11, letterSpacing: 0.5, color: C.muted },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  messageBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.tertiary,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 2,
    borderColor: C.borderVariant,
  },
  editText: { fontFamily: F.mono, fontSize: 11, letterSpacing: 1, color: C.text },
});
