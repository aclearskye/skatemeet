import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: `${C.bgLowest}AA`,
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopWidth: 2,
    borderTopColor: C.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 4,
  },
  busy: {
    position: "absolute",
    top: 12,
    right: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
  },
  rowText: {
    fontFamily: F.mono,
    fontSize: 13,
    color: C.text,
    letterSpacing: 1,
  },
  rowTextDanger: {
    color: C.error,
  },
  editHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8,
  },
  backBtn: {
    width: 32,
  },
  editTitle: {
    fontFamily: F.heading,
    fontSize: 18,
    color: C.text,
    letterSpacing: 2,
  },
  label: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    letterSpacing: 1.5,
  },
  caption: {
    minHeight: 90,
    backgroundColor: C.bg,
    borderWidth: 2,
    borderColor: C.border,
    color: C.text,
    fontFamily: F.body,
    fontSize: 15,
    padding: 12,
    marginVertical: 6,
  },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.borderVariant,
  },
  tagText: {
    flex: 1,
    fontFamily: F.mono,
    fontSize: 12,
    color: C.text,
  },
  saveBtn: {
    backgroundColor: C.primary,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  cancelBtn: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  cancelText: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.muted,
    letterSpacing: 2,
  },
  saveText: {
    fontFamily: F.mono,
    fontSize: 13,
    color: C.onPrimary,
    letterSpacing: 2,
  },
});
