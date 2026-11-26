import { StyleSheet } from "react-native";
import { C, F, R } from "@/lib/theme";

export const styles = StyleSheet.create({
  panel: {
    gap: 10,
    marginTop: -8,
    padding: 14,
    borderBottomLeftRadius: R,
    borderBottomRightRadius: R,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  status: { fontFamily: F.bodyBold, fontSize: 14, lineHeight: 20, color: C.text },
  hint: { fontFamily: F.body, fontSize: 13, lineHeight: 18, color: C.textVariant },
  buttons: { flexDirection: "row", gap: 10 },
  button: { flex: 1 },
  error: { fontFamily: F.body, fontSize: 13, color: C.error },
});
