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
    fontFamily: F.heading,
    fontSize: 20,
    color: C.text,
    letterSpacing: 2,
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
  sectionLabel: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    letterSpacing: 1.5,
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
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.borderVariant,
  },
  kind: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.secondary,
    letterSpacing: 1,
    width: 44,
  },
  name: {
    flex: 1,
    fontFamily: F.bodySemiBold,
    fontSize: 15,
    color: C.text,
  },
  distance: {
    fontFamily: F.monoRegular,
    fontSize: 11,
    color: C.muted,
  },
});
