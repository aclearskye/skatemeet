import { C, F } from "@/lib/theme";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  sortRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 16, paddingBottom: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  chipText: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 1,
    color: C.muted,
    textTransform: "uppercase",
  },
  chipTextActive: { color: C.onPrimary },
  chipTextActiveNearest: { color: C.onSecondary },
  chipTextActiveUserUploaded: { color: C.onTertiary },
  statusWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 80,
  },
  statusText: {
    color: C.muted,
    fontFamily: F.mono,
    fontSize: 11,
    letterSpacing: 1,
    textAlign: "center",
  },
  listContent: { paddingHorizontal: 12 },
  cardWrap: { marginBottom: 10 },
  footerLoading: { paddingVertical: 20 },
});
