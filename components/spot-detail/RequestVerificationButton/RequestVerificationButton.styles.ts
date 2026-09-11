import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  section: { gap: 8, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.borderVariant },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderWidth: 2,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: { fontFamily: F.mono, fontSize: 12, letterSpacing: 1 },
  hint: { fontFamily: F.monoRegular, fontSize: 10, color: C.muted, letterSpacing: 0.3, textAlign: "center" },
  error: { fontFamily: F.monoRegular, fontSize: 11, color: C.error },
});
