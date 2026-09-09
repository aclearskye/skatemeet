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
  timeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  timeBtnDisabled: { opacity: 0.4 },
  timeBtnText: { fontFamily: F.mono, fontSize: 11, color: C.text, letterSpacing: 0.5 },
  closedToggle: { flexDirection: "row", alignItems: "center", gap: 6 },
  closedLabel: { fontFamily: F.mono, fontSize: 9, color: C.muted, letterSpacing: 1 },
  pickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  pickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: backdropColor,
  },
  pickerSheet: {
    backgroundColor: C.bg,
    borderTopWidth: 2,
    borderTopColor: C.border,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    maxHeight: "60%",
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
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  pickerRowText: { fontFamily: F.body, fontSize: 15, color: C.text },
});
