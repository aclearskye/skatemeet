import { StyleSheet } from "react-native";
import { C, F, R } from "@/lib/theme";

export const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: C.borderVariant,
    borderRadius: R,
  },
  btn: { width: 36, height: 40, alignItems: "center", justifyContent: "center" },
  value: { minWidth: 28, textAlign: "center", fontFamily: F.mono, fontSize: 14, color: C.text },
});
