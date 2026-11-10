import { StyleSheet } from "react-native";
import { F } from "@/lib/theme";

export const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  chipSm: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipMd: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipLg: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  textSm: { fontFamily: F.mono, fontSize: 9, letterSpacing: 1 },
  textMd: { fontFamily: F.mono, fontSize: 10, letterSpacing: 1 },
  textLg: { fontFamily: F.mono, fontSize: 13, letterSpacing: 1.5 },
});
