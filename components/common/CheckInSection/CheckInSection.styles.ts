import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  section: { gap: 10, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.borderVariant },
  meta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { fontFamily: F.mono, fontSize: 10, color: C.muted, letterSpacing: 2 },
  liveCount: { fontFamily: F.monoRegular, fontSize: 11, letterSpacing: 0.5 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderWidth: 2,
  },
  btnText: { fontFamily: F.mono, fontSize: 12, letterSpacing: 1 },
  error: { fontFamily: F.monoRegular, fontSize: 11, color: C.error },
});
