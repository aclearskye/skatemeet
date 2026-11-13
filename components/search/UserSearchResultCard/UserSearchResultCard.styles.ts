import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  card: {
    backgroundColor: C.bgLow,
    borderWidth: 2,
    borderColor: C.border,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "stretch",
    padding: 12,
    gap: 10,
  },
  previewRow: {
    flex: 1,
    flexDirection: "row",
    // Not stretch: the info column must report its own content height (the
    // avatar is sized from it), not grow to match the avatar.
    alignItems: "flex-start",
    gap: 12,
    minWidth: 0,
  },
  info: {
    flex: 1,
    gap: 5,
    justifyContent: "center",
    // Sets the card's height (the avatar matches it), so it can't collapse
    // below a comfortable size for a short name with no badges.
    minHeight: 64,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  displayName: {
    fontFamily: F.heading,
    fontSize: 16,
    color: C.text,
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  meta: {
    fontFamily: F.monoRegular,
    fontSize: 11,
    color: C.muted,
  },
  metaDot: {
    fontFamily: F.monoRegular,
    fontSize: 11,
    color: C.muted,
  },
  cta: {
    width: 80,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 6,
  },
  ctaIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  ctaText: {
    fontFamily: F.mono,
    fontSize: 9,
    color: C.onPrimary,
    letterSpacing: 0.5,
    textAlign: "center",
    lineHeight: 12,
  },
});
