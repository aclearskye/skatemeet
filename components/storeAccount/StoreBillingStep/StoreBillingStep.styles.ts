import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  container: { gap: 18 },
  title: { fontFamily: F.heading, fontSize: 20, letterSpacing: 1.5, color: C.text },
  body: { fontFamily: F.body, fontSize: 15, lineHeight: 22, color: C.textVariant },
  points: { gap: 10 },
  point: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  pointText: { flex: 1, fontFamily: F.body, fontSize: 14, lineHeight: 20, color: C.textVariant },
  hint: { fontFamily: F.body, fontSize: 13, color: C.muted },
  error: { fontFamily: F.body, fontSize: 13, color: C.error },
});
