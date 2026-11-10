import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

const THUMB_HEIGHT = 150;

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: C.border,
  },
  title: {
    fontFamily: F.heading,
    fontSize: 20,
    color: C.text,
    letterSpacing: 2,
  },
  postBtn: {
    backgroundColor: C.primary,
    paddingHorizontal: 16,
    height: 36,
    minWidth: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  postBtnDisabled: {
    opacity: 0.4,
  },
  postText: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.onPrimary,
    letterSpacing: 2,
  },
  error: {
    fontFamily: F.monoRegular,
    fontSize: 12,
    color: C.error,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  body: {
    padding: 16,
    gap: 10,
  },
  strip: {
    gap: 8,
  },
  videoThumb: {
    aspectRatio: 9 / 16,
    overflow: "hidden",
  },
  durationBadge: {
    position: "absolute",
    left: 6,
    bottom: 6,
    backgroundColor: `${C.bgLowest}CC`,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  durationText: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.text,
  },
  thumb: {
    height: THUMB_HEIGHT,
    aspectRatio: 3 / 4,
    backgroundColor: C.surfaceHigh,
    overflow: "hidden",
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  thumbRemove: {
    position: "absolute",
    top: 6,
    right: 6,
    padding: 4,
    backgroundColor: `${C.bgLowest}CC`,
  },
  addColumn: {
    height: THUMB_HEIGHT,
    gap: 8,
  },
  addBtn: {
    flex: 1,
    width: 100,
    borderWidth: 2,
    borderColor: C.borderVariant,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  addText: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 1,
  },
  hint: {
    fontFamily: F.monoRegular,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 0.5,
  },
  label: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    letterSpacing: 1.5,
    marginTop: 8,
  },
  aspectRow: {
    flexDirection: "row",
    gap: 8,
  },
  aspectBtn: {
    borderWidth: 2,
    borderColor: C.borderVariant,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  aspectBtnActive: {
    borderColor: C.primary,
  },
  aspectText: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    letterSpacing: 1,
  },
  aspectTextActive: {
    color: C.primary,
  },
  caption: {
    minHeight: 90,
    backgroundColor: C.surface,
    borderWidth: 2,
    borderColor: C.border,
    color: C.text,
    fontFamily: F.body,
    fontSize: 15,
    padding: 12,
  },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.borderVariant,
  },
  tagText: {
    flex: 1,
    fontFamily: F.mono,
    fontSize: 12,
    color: C.text,
    letterSpacing: 0.5,
  },
});
