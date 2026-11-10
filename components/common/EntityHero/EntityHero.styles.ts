import { Platform, StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  // Native: 4:3 rather than 16:9 so the name and a row or two of labels fit
  // over the photo without hiding most of it. Web: the column is far wider,
  // so 4:3 would push everything below the fold — a wide crop, capped.
  hero: {
    width: "100%",
    backgroundColor: C.surfaceHigh,
    ...Platform.select({
      web: { aspectRatio: 21 / 9, maxHeight: 340 },
      default: { aspectRatio: 4 / 3 },
    }),
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  // Straight on the photo; the name has its own black strip and the tapes
  // carry their own colour.
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 8,
  },
  // A big black duct-tape strip (DuctTapeLabel paints the colour and tilt)
  // so the name reads on any photo.
  nameTape: {
    alignSelf: "flex-start",
    maxWidth: "100%",
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  // A size up on web's wider hero.
  name: {
    fontFamily: F.heading,
    color: C.text,
    letterSpacing: 0.5,
    ...Platform.select({
      web: { fontSize: 38, lineHeight: 44 },
      default: { fontSize: 28, lineHeight: 32 },
    }),
  },
  actionCorner: {
    position: "absolute",
    top: 12,
    right: 12,
    alignItems: "flex-end",
    gap: 8,
  },
});
