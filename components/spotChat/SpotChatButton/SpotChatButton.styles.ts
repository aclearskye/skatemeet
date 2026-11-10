import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.bgLow,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  // Joins the preview card above it: no top border, so the two read as one.
  strip: {
    borderWidth: 2,
    borderTopWidth: 0,
  },
  section: {
    borderWidth: 1,
    borderColor: C.borderVariant,
  },
  textColumn: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  title: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.text,
    letterSpacing: 1.5,
  },
  meta: {
    fontFamily: F.monoRegular,
    fontSize: 10,
    color: C.muted,
  },
  cta: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ctaText: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 1,
  },
});
