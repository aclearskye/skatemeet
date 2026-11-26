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
  sheet: {
    width: "100%",
    maxWidth: 420,
    gap: 12,
    padding: 16,
    borderRadius: R,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  title: { fontFamily: F.heading, fontSize: 18, letterSpacing: 2, color: C.text },
  hint: { fontFamily: F.body, fontSize: 13, lineHeight: 18, color: C.muted },
  loading: { paddingVertical: 16 },
  list: { maxHeight: 320 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.borderVariant,
  },
  optionText: { flex: 1, gap: 2 },
  name: { fontFamily: F.bodyBold, fontSize: 15, color: C.text },
  price: { fontFamily: F.mono, fontSize: 13, color: C.primary },
});
