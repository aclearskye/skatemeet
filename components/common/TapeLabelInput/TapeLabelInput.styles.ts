import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  container: { gap: 12 },
  inputRow: { flexDirection: "row", gap: 8 },
  input: {
    flex: 1,
    backgroundColor: C.surface,
    borderWidth: 2,
    borderColor: C.border,
    color: C.text,
    fontFamily: F.mono,
    fontSize: 13,
    letterSpacing: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  addBtn: {
    width: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: C.border,
  },
  addBtnDisabled: { opacity: 0.4 },
  swatchRow: { flexDirection: "row", gap: 10 },
  swatch: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: C.bg,
  },
  swatchSelected: { borderColor: C.border },
  error: { fontFamily: F.monoRegular, fontSize: 11, color: C.error },
});
