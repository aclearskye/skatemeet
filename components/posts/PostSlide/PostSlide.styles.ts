import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

// The caption/author block's distance from the slide's bottom edge. PostSlide
// uses it to line the right rail's last button up with the author's avatar.
export const INFO_BOTTOM = 28;
// Rail position before the info block is measured, or with no author.
export const RAIL_FALLBACK_BOTTOM = 120;

export const styles = StyleSheet.create({
  slide: {
    width: "100%",
    backgroundColor: C.bgLowest,
    justifyContent: "center",
  },
  videoArea: {
    ...StyleSheet.absoluteFillObject,
  },
  // Brand button: hard-edged square, neon outline when muted, solid neon
  // with sound on, flat offset shadow like the toast cards.
  muteBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.bg,
    borderWidth: 2,
    borderColor: C.primary,
    shadowColor: C.bgLowest,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.6,
    shadowRadius: 0,
    elevation: 4,
  },
  muteBtnOn: {
    backgroundColor: C.primary,
  },
  // Centre "paused" marker: solid square play button.
  pausedBadge: {
    position: "absolute",
    alignSelf: "center",
    top: "50%",
    marginTop: -32,
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.primary,
    borderWidth: 2,
    borderColor: C.border,
    shadowColor: C.bgLowest,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 0,
    elevation: 6,
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  placeholderText: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    letterSpacing: 1,
  },
  dots: {
    position: "absolute",
    top: 16,
    alignSelf: "center",
    flexDirection: "row",
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    backgroundColor: `${C.text}55`,
  },
  dotActive: {
    backgroundColor: C.text,
  },
  rail: {
    position: "absolute",
    right: 10,
    alignItems: "center",
    gap: 14,
  },
  info: {
    position: "absolute",
    left: 16,
    right: 72,
    bottom: INFO_BOTTOM,
    gap: 6,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  username: {
    fontFamily: F.mono,
    fontSize: 13,
    color: C.text,
    letterSpacing: 0.5,
  },
  entity: {
    alignSelf: "flex-start",
    fontFamily: F.mono,
    fontSize: 10,
    color: C.onPrimary,
    backgroundColor: C.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    letterSpacing: 1,
    overflow: "hidden",
  },
  caption: {
    fontFamily: F.body,
    fontSize: 14,
    color: C.text,
    lineHeight: 20,
  },
  tags: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.textVariant,
    letterSpacing: 0.5,
  },
});
