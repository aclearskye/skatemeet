import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  section: { padding: 20 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  fieldLabel: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 2,
    marginBottom: 10,
  },
  spaced: { marginTop: 24 },
  skipLink: { fontFamily: F.mono, fontSize: 11, letterSpacing: 0.5 },
  toggles: { marginTop: 24, gap: 14 },
});
