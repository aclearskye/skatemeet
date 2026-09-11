import { StyleSheet } from "react-native";
import { C, F, R } from "@/lib/theme";

export const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: R,
    borderWidth: 1,
    borderColor: C.border,
    gap: 14,
    padding: 14,
  },
  textColumn: {
    gap: 4,
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
  testimonyLabel: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 1,
    marginTop: 6,
  },
  testimony: {
    fontFamily: F.body,
    fontSize: 13,
    color: C.text,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  denyBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: C.border,
    paddingVertical: 12,
    alignItems: "center",
  },
  denyText: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.muted,
    letterSpacing: 1,
  },
  reinstateBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: C.primary,
    backgroundColor: C.primary,
    paddingVertical: 12,
    alignItems: "center",
  },
  reinstateText: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.onPrimary,
    letterSpacing: 1,
  },
});
