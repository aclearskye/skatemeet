import { StyleSheet } from "react-native";
import { C, F, R } from "@/lib/theme";

export const styles = StyleSheet.create({
  container: { gap: 16 },
  banner: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontFamily: F.heading, fontSize: 22, letterSpacing: 1.5 },
  body: { fontFamily: F.body, fontSize: 14, lineHeight: 20, color: C.textVariant },
  notes: {
    gap: 6,
    padding: 14,
    borderRadius: R,
    borderLeftWidth: 3,
    borderLeftColor: C.secondary,
    backgroundColor: C.surface,
  },
  notesLabel: { fontFamily: F.mono, fontSize: 11, letterSpacing: 1.5, color: C.muted },
  notesText: { fontFamily: F.body, fontSize: 14, lineHeight: 20, color: C.text },
  error: { fontFamily: F.body, fontSize: 13, color: C.error },
});
