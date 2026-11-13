import { StyleSheet } from "react-native";
import { C, F, R } from "@/lib/theme";

export const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: R,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  text: { flex: 1, gap: 2 },
  name: { fontFamily: F.bodyBold, fontSize: 16, color: C.text },
  meta: { fontFamily: F.body, fontSize: 13, color: C.muted },
  change: { fontFamily: F.mono, fontSize: 11, letterSpacing: 1, color: C.primary },
});
