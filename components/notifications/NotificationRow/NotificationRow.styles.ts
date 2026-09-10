import { StyleSheet } from "react-native";
import { C, F, R } from "@/lib/theme";

export const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    backgroundColor: C.surface,
    borderRadius: R,
    borderWidth: 1,
    borderColor: C.border,
  },
  textColumn: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontFamily: F.mono,
    fontSize: 11,
    letterSpacing: 1,
    color: C.muted,
    textTransform: "uppercase",
  },
  message: {
    fontFamily: F.body,
    fontSize: 15,
    color: C.text,
  },
  timestamp: {
    fontFamily: F.monoRegular,
    fontSize: 11,
    color: C.muted,
    marginTop: 4,
  },
  deleteBtn: {
    padding: 4,
  },
});
