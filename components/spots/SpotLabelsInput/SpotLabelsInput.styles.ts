import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  container: { gap: 12 },
  preview: { marginTop: 4 },
  hint: { fontFamily: F.monoRegular, fontSize: 10, color: C.muted, letterSpacing: 0.5 },
});
