import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const AVATAR_SIZE = 72;

export const styles = StyleSheet.create({
  // Both columns start at the top, and info is (at least) avatar-height with
  // space-between, so the name's top edge lines up with the avatar's top and
  // the action buttons' bottom edge with its bottom.
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 12,
    backgroundColor: C.bgLow,
    borderWidth: 2,
    borderColor: C.border,
  },
  info: {
    flex: 1,
    minWidth: 0,
    minHeight: AVATAR_SIZE,
    justifyContent: "space-between",
  },
  textGroup: {
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  // Shrinks before the lock and streak badge do, so a long name truncates
  // instead of pushing them out of the row.
  nameBtn: {
    flexShrink: 1,
  },
  // lineHeight matched to fontSize drops the font's extra top leading, so
  // the visible cap height starts flush with the avatar's top edge.
  displayName: {
    fontFamily: F.heading,
    fontSize: 16,
    lineHeight: 18,
    // Android-only: otherwise adds font padding above the first line.
    includeFontPadding: false,
    color: C.text,
    letterSpacing: 0.3,
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
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  // Same footprint as MessageButton / AddFriendButton on the profile page.
  unfriendBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  cta: {
    alignSelf: "stretch",
    width: 80,
    marginVertical: -12,
    marginRight: -12,
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
