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
    position: "relative",
  },
  previewRow: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
    minWidth: 0,
  },
  thumb: {
    width: 88,
    height: 88,
    flexShrink: 0,
  },
  thumbImg: {
    width: 88,
    height: 88,
  },
  thumbPlaceholder: {
    backgroundColor: C.surfaceHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    gap: 5,
    justifyContent: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  name: {
    fontFamily: F.heading,
    fontSize: 18,
    color: C.text,
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  verifiedStamp: {
    backgroundColor: C.primary,
    paddingHorizontal: 7,
    paddingVertical: 2,
    transform: [{ rotate: "-2deg" }],
  },
  verifiedText: {
    fontFamily: F.mono,
    fontSize: 9,
    color: C.onPrimary,
    letterSpacing: 1,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "space-between",
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: C.surfaceHigh,
    borderWidth: 1,
    borderColor: C.borderVariant,
  },
  typeBadgeText: {
    fontFamily: F.mono,
    fontSize: 9,
    color: C.textVariant,
    letterSpacing: 1,
  },
  subtitle: {
    fontFamily: F.monoRegular,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 0.3,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingTextStore: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.secondary,
    marginLeft: 2,
  },
  cta: {
    width: 80,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 6,
  },
  ctaDiy: {
    backgroundColor: C.tertiary,
  },
  ctaStore: {
    backgroundColor: C.secondary,
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
  ctaTextDiy: {
    color: C.onTertiary,
  },
  ctaTextStore: {
    color: C.onSecondary,
  },
  ctaDistanceText: {
    fontFamily: F.mono,
    fontSize: 8,
    color: C.onPrimary,
    letterSpacing: 0.3,
    textAlign: "center",
    opacity: 0.75,
  },
});
