import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
    paddingHorizontal: 16,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: {
    flex: 1,
    fontFamily: F.heading,
    fontSize: 20,
    color: C.text,
    letterSpacing: 2,
  },
  count: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.muted,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.primary,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  chipText: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.onPrimary,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: C.surface,
    borderWidth: 2,
    borderColor: C.border,
    color: C.text,
    fontFamily: F.body,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  spinner: {
    marginTop: 24,
  },
  empty: {
    fontFamily: F.monoRegular,
    fontSize: 12,
    color: C.muted,
    marginTop: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.borderVariant,
  },
  username: {
    fontFamily: F.bodySemiBold,
    fontSize: 15,
    color: C.text,
  },
  doneBtn: {
    backgroundColor: C.primary,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  doneText: {
    fontFamily: F.mono,
    fontSize: 14,
    color: C.onPrimary,
    letterSpacing: 2,
  },
});
