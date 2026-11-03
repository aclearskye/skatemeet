import { StyleSheet } from "react-native";
import { C, F, R } from "@/lib/theme";

export const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    backgroundColor: C.surface,
    borderRadius: R,
    borderWidth: 1,
    borderColor: C.border,
  },
  contentRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  textColumn: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontFamily: F.mono,
    fontSize: 11,
    letterSpacing: 1,
    color: C.muted,
    textTransform: "uppercase",
  },
  message: {
    fontFamily: F.body,
    fontSize: 15,
    color: C.text,
  },
  timestamp: {
    fontFamily: F.monoRegular,
    fontSize: 11,
    color: C.muted,
    marginTop: 4,
  },
  deleteBtn: {
    padding: 4,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  acceptBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  acceptText: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.onPrimary,
    letterSpacing: 1,
  },
  declineBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  declineText: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.onSecondary,
    letterSpacing: 1,
  },
});
