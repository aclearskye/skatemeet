import { C, F, TAPE } from "@/lib/theme";
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
  chipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
    transform: [{ rotate: TAPE.rotatePrimary }],
  },
  chipActiveNearest: {
    backgroundColor: C.secondary,
    borderColor: C.secondary,
    transform: [{ rotate: TAPE.rotateSecondary }],
  },
  // The design system's closest accent to "blue" is the cyan tertiary token —
  // there's no separate blue in the palette, so this reuses it.
  chipActiveUserUploaded: {
    backgroundColor: C.tertiary,
    borderColor: C.tertiary,
    transform: [{ rotate: TAPE.rotateTertiary }],
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
