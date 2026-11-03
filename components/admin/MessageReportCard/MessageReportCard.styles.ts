import { StyleSheet } from "react-native";
import { C, F, R } from "@/lib/theme";

export const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: R,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
    padding: 14,
  },
  textColumn: {
    gap: 2,
  },
  username: {
    fontFamily: F.bodyBold,
    fontSize: 14,
    color: C.text,
  },
  meta: {
    fontFamily: F.monoRegular,
    fontSize: 11,
    color: C.muted,
    letterSpacing: 0.5,
  },
  details: {
    fontFamily: F.body,
    fontSize: 13,
    color: C.textVariant,
    marginTop: 4,
  },
  viewBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  viewText: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.primary,
    letterSpacing: 1,
  },
  thread: {
    gap: 6,
    padding: 10,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.borderVariant,
  },
  contextLine: {
    gap: 2,
  },
  contextAuthor: {
    fontFamily: F.mono,
    fontSize: 9,
    color: C.muted,
    letterSpacing: 1,
  },
  contextBody: {
    fontFamily: F.body,
    fontSize: 13,
    color: C.muted,
  },
  reportedLine: {
    gap: 2,
    padding: 8,
    borderWidth: 2,
    borderColor: C.errorBorder,
    backgroundColor: C.errorContainer,
  },
  reportedBody: {
    fontFamily: F.body,
    fontSize: 14,
    color: C.text,
  },
  removedText: {
    fontFamily: F.monoRegular,
    fontSize: 11,
    color: C.muted,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
  dismissBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: C.border,
    paddingVertical: 12,
    alignItems: "center",
  },
  dismissText: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    letterSpacing: 1,
  },
  dangerBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: C.errorBorder,
    backgroundColor: C.errorContainer,
    paddingVertical: 12,
    alignItems: "center",
  },
  dangerText: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.error,
    letterSpacing: 1,
  },
  btnDisabled: {
    opacity: 0.4,
  },
});
