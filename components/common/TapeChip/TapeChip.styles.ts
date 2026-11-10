import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

const chipBase = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  alignSelf: "flex-start" as const,
  // Same 2px frame on and off, so toggling never shifts the layout. On
  // tape it's painted the tape colour, so it reads as part of the strip.
  borderWidth: 2,
};

export const styles = StyleSheet.create({
  chipSm: { ...chipBase, gap: 3, paddingHorizontal: 7, paddingVertical: 1 },
  chipMd: { ...chipBase, gap: 4, paddingHorizontal: 10, paddingVertical: 4 },
  chipLg: { ...chipBase, gap: 6, paddingHorizontal: 12, paddingVertical: 4 },
  textSm: { fontFamily: F.mono, fontSize: 10, letterSpacing: 1 },
  textMd: { fontFamily: F.mono, fontSize: 12, letterSpacing: 1 },
  textLg: { fontFamily: F.mono, fontSize: 13, letterSpacing: 1.5 },
  inactive: { borderColor: C.border, backgroundColor: C.surface },
  textInactive: { color: C.muted },
});
