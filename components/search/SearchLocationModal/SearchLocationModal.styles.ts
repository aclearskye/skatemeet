import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    paddingHorizontal: 16,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heading: {
    fontFamily: F.heading,
    fontSize: 20,
    color: C.text,
    letterSpacing: 2,
  },
  hint: {
    fontFamily: F.monoRegular,
    fontSize: 11,
    color: C.muted,
  },
  currentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.bgLow,
  },
  placeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: C.borderVariant,
    backgroundColor: C.bgLow,
  },
  rowSelected: {
    borderColor: C.primary,
  },
  rowLabel: {
    flex: 1,
    fontFamily: F.mono,
    fontSize: 12,
    letterSpacing: 0.5,
    color: C.text,
  },
  deniedWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  deniedText: {
    flex: 1,
    fontFamily: F.monoRegular,
    fontSize: 11,
    color: C.secondary,
  },
  deniedLink: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.primary,
    textDecorationLine: "underline",
  },
  searchWrap: {
    marginTop: 4,
  },
  statusWrap: {
    alignItems: "center",
    paddingTop: 24,
  },
  statusText: {
    fontFamily: F.monoRegular,
    fontSize: 12,
    color: C.muted,
    textAlign: "center",
  },
  listContent: {
    gap: 8,
  },
});
