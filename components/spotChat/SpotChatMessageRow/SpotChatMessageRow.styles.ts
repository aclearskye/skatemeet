import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

const backdropColor = `${C.bgLowest}cc`;

export const AVATAR_SIZE = 28;

export const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 12,
    paddingVertical: 2,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  rowOwn: {
    justifyContent: "flex-end",
  },
  rowRunStart: {
    marginTop: 10,
  },
  avatarSlot: {
    width: AVATAR_SIZE,
    alignSelf: "flex-start",
    paddingTop: 16,
  },
  column: {
    maxWidth: "78%",
    gap: 3,
  },
  columnOwn: {
    alignItems: "flex-end",
  },
  senderName: {
    fontFamily: F.bodySemiBold,
    fontSize: 12,
    color: C.textVariant,
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 2,
    gap: 4,
  },
  bubbleOwn: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  bubbleOther: {
    backgroundColor: C.surface,
    borderColor: C.borderVariant,
  },
  bubbleDimmed: {
    opacity: 0.55,
  },
  body: {
    fontFamily: F.body,
    fontSize: 15,
    lineHeight: 21,
  },
  bodyOwn: {
    color: C.onPrimary,
  },
  bodyOther: {
    color: C.text,
  },
  time: {
    fontFamily: F.monoRegular,
    fontSize: 10,
    alignSelf: "flex-end",
  },
  timeOwn: {
    color: C.onPrimary,
  },
  timeOther: {
    color: C.muted,
  },
  heldNote: {
    fontFamily: F.monoRegular,
    fontSize: 10,
    color: C.error,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: backdropColor,
  },
  sheet: {
    backgroundColor: C.bg,
    borderTopWidth: 2,
    borderTopColor: C.border,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.borderVariant,
  },
  actionText: {
    fontFamily: F.body,
    fontSize: 15,
    color: C.text,
  },
  actionDanger: {
    color: C.error,
  },
  cancelBtn: {
    paddingVertical: 16,
    alignItems: "center",
  },
  cancelText: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.muted,
    letterSpacing: 1,
  },
});
