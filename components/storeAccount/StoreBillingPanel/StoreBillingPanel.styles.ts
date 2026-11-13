import { StyleSheet } from "react-native";
import { C, F, R } from "@/lib/theme";

export const styles = StyleSheet.create({
  card: {
    gap: 10,
    padding: 16,
    borderRadius: R,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceLow,
  },
  cardWarning: { borderColor: C.errorBorder, backgroundColor: C.errorDim },
  label: { fontFamily: F.mono, fontSize: 11, letterSpacing: 1.5, color: C.muted },
  status: { fontFamily: F.body, fontSize: 14, lineHeight: 20, color: C.text },
  statusWarning: { color: C.error },
  error: { fontFamily: F.body, fontSize: 13, color: C.error },
});
