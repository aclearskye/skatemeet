import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

const backdropColor = `${C.bgLowest}cc`;

export const styles = StyleSheet.create({
  container: { gap: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dayLabel: {
    width: 34,
    fontFamily: F.mono,
    fontSize: 11,
    color: C.text,
    letterSpacing: 1,
  },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  timeSep: { fontFamily: F.mono, fontSize: 12, color: C.muted },
  // Trigger recipe from the theme sheet's "Dropdown": surface-2 bg, 2px ink
  // border, solid chartreuse caret (a real triangle, not an icon glyph).
  timeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.surfaceHigh,
  },
  timeBtnDisabled: { opacity: 0.4 },
  timeBtnText: { fontFamily: F.body, fontSize: 13, color: C.text },
  caret: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: C.primary,
  },
  closedToggle: { flexDirection: "row", alignItems: "center", gap: 6 },
  closedLabel: { fontFamily: F.mono, fontSize: 9, color: C.muted, letterSpacing: 1 },
  closedLabelOn: { color: C.text },
  pickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  pickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: backdropColor,
  },
  // Menu recipe: surface bg, 2px ink border, hard offset shadow.
  pickerSheet: {
    backgroundColor: C.surface,
    borderWidth: 2,
    borderColor: C.border,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    maxHeight: "60%",
    shadowColor: "#000",
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.55,
    shadowRadius: 0,
    elevation: 6,
  },
  pickerTitle: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  pickerList: { maxHeight: 300 },
  pickerRow: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderLeftWidth: 4,
    borderLeftColor: "transparent",
    borderBottomWidth: 1,
    borderBottomColor: C.borderVariant,
  },
  pickerRowSelected: {
    borderLeftColor: C.primary,
    backgroundColor: C.surfaceHigh,
  },
  pickerRowText: { fontFamily: F.body, fontSize: 15, color: C.text },
});
