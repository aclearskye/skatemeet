import { StyleSheet } from "react-native";
import { F } from "@/lib/theme";

export const styles = StyleSheet.create({
  tape: { paddingHorizontal: 14, paddingVertical: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  text: { flex: 1, fontFamily: F.bodyBold, fontSize: 14, lineHeight: 20 },
});
