import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  // 4:3 rather than 16:9 so the name and a row or two of labels fit over the
  // photo without hiding most of it.
  hero: {
    width: "100%",
    aspectRatio: 4 / 3,
    backgroundColor: C.surfaceHigh,
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  // Straight on the photo, no backing band. The tapes carry their own
  // colour; the name gets a hard offset shadow (the brand's flat-shadow
  // look) so it stays readable on bright photos.
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 8,
  },
  name: {
    fontFamily: F.heading,
    fontSize: 28,
    lineHeight: 32,
    color: C.text,
    letterSpacing: 0.5,
    textShadowColor: C.bgLowest,
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  actionCorner: {
    position: "absolute",
    top: 12,
    right: 12,
    alignItems: "flex-end",
    gap: 8,
  },
  hintTape: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  hintText: {
    fontFamily: F.mono,
    fontSize: 9,
    color: C.onTape,
    letterSpacing: 1,
  },
});
