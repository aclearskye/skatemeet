import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  footnote: { fontFamily: F.body, fontSize: 12, lineHeight: 18, color: C.muted, textAlign: "center" },
});
