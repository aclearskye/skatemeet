import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

// Same sheet as components/common/ConfirmDialog, holding a scrolling form.
export const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: `${C.bgLowest}cc`,
  },
  sheet: {
    backgroundColor: C.bg,
    borderTopWidth: 2,
    borderTopColor: C.border,
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  title: {
    fontFamily: F.heading,
    fontSize: 17,
    color: C.text,
    letterSpacing: 0.3,
  },
  form: { gap: 8, paddingBottom: 4 },
  fieldLabel: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 2,
  },
  fieldGap: { marginTop: 14 },
  input: {
    backgroundColor: C.surface,
    borderWidth: 2,
    borderColor: C.border,
    color: C.text,
    fontFamily: F.body,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputError: { borderColor: C.error },
  errorText: { fontFamily: F.monoRegular, fontSize: 11, color: C.error },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  chipText: { fontFamily: F.mono, fontSize: 11, letterSpacing: 1, color: C.muted },
  hint: { fontFamily: F.monoRegular, fontSize: 10, color: C.muted, letterSpacing: 0.5 },
  buttonRow: { flexDirection: "row", gap: 10 },
  cancelBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: C.border,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelText: { fontFamily: F.mono, fontSize: 12, color: C.muted, letterSpacing: 1 },
  saveBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: C.primary,
    backgroundColor: C.primary,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnBusy: { opacity: 0.6 },
  saveText: { fontFamily: F.mono, fontSize: 12, color: C.onPrimary, letterSpacing: 1 },
});
