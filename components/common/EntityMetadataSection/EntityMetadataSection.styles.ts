import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  loading: { marginVertical: 12 },
  section: { paddingTop: 14, borderTopWidth: 1, borderTopColor: C.border, gap: 10 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionLabel: { fontFamily: F.mono, fontSize: 10, color: C.muted, letterSpacing: 2 },
  editLink: { fontFamily: F.mono, fontSize: 11, letterSpacing: 0.5 },
  hoursRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  hoursText: { fontFamily: F.body, fontSize: 13, color: C.textVariant, flex: 1 },
  weekList: { gap: 4, paddingLeft: 23 },
  weekRow: { flexDirection: "row", justifyContent: "space-between" },
  weekDay: { fontFamily: F.body, fontSize: 12, color: C.muted },
  weekHours: { fontFamily: F.monoRegular, fontSize: 12, color: C.textVariant },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  chipText: { fontFamily: F.mono, fontSize: 10, color: C.muted, letterSpacing: 0.5 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    backgroundColor: C.surface,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoText: { fontFamily: F.body, fontSize: 13, color: C.textVariant },
  emptyText: {
    fontFamily: F.body,
    fontSize: 13,
    color: C.muted,
    fontStyle: "italic",
  },
});
