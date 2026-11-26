import { StyleSheet } from "react-native";
import { C, F, R } from "@/lib/theme";

export const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: `${C.bgLowest}CC`,
  },
  sheet: { width: "100%", maxWidth: 380, gap: 12, backgroundColor: C.bg, borderRadius: R },
  close: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: C.borderVariant,
    borderRadius: R,
  },
  closeText: { fontFamily: F.mono, fontSize: 12, letterSpacing: 2, color: C.text },
});
