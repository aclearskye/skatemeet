import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  section: { gap: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.borderVariant },
  hint: { fontFamily: F.monoRegular, fontSize: 10, color: C.muted, letterSpacing: 0.5 },
});
