import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const GRID_GAP = 2;

export const styles = StyleSheet.create({
  // Each slot is exactly a third of the row and pads itself by half the
  // gap, so three always fit whatever the screen width (a percentage width
  // plus a fixed `gap` overflows on narrow phones and wraps the third cell).
  // The negative margin cancels the outer half-gap at the grid's edges.
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    margin: -GRID_GAP / 2,
  },
  cellSlot: {
    width: "33.3333%",
    padding: GRID_GAP / 2,
  },
  cell: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: C.surfaceLow,
  },
  createCell: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: C.borderVariant,
  },
  createPlus: {
    position: "absolute",
    right: -6,
    bottom: -4,
    width: 16,
    height: 16,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  createLabel: {
    fontFamily: F.mono,
    fontSize: 9,
    color: C.text,
    letterSpacing: 1,
    textAlign: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  badgeRow: {
    position: "absolute",
    top: 5,
    right: 5,
    flexDirection: "row",
    gap: 3,
  },
  badge: {
    backgroundColor: `${C.bgLowest}99`,
    padding: 3,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 10,
  },
  emptyLabel: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    letterSpacing: 1.5,
  },
});
