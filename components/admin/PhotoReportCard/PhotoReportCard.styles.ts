import { StyleSheet } from "react-native";
import { C, F, R } from "@/lib/theme";

export const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: R,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    gap: 14,
    paddingBottom: 14,
  },
  photoWrap: {
    position: "relative",
  },
  photo: {
    width: "100%",
    height: 220,
    borderRadius: R,
    backgroundColor: C.surfaceHigh,
  },
  enlargeHint: {
    position: "absolute",
    right: 10,
    bottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: `${C.bgLowest}CC`,
    borderWidth: 1,
    borderColor: C.border,
  },
  enlargeHintText: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.text,
    letterSpacing: 1,
  },
  textColumn: {
    gap: 2,
    paddingHorizontal: 14,
  },
  entityBadge: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.secondary,
    letterSpacing: 1,
  },
  meta: {
    fontFamily: F.monoRegular,
    fontSize: 11,
    color: C.muted,
    letterSpacing: 0.5,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
  },
  dismissBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: C.border,
    paddingVertical: 12,
    alignItems: "center",
  },
  dismissText: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.muted,
    letterSpacing: 1,
  },
  removeBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: C.errorBorder,
    backgroundColor: C.errorContainer,
    paddingVertical: 12,
    alignItems: "center",
  },
  removeText: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.error,
    letterSpacing: 1,
  },
  lightboxRoot: {
    flex: 1,
    backgroundColor: C.bgLowest,
    justifyContent: "center",
  },
  lightboxImage: {
    width: "100%",
    height: "100%",
  },
  lightboxCloseBtn: {
    position: "absolute",
    right: 16,
    padding: 6,
  },
});
