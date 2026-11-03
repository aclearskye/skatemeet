import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

const backdropColor = `${C.bgLowest}cc`;

export const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    flexDirection: "row",
  },
  rowOwn: {
    justifyContent: "flex-end",
  },
  bubble: {
    maxWidth: "78%",
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
  bubblePending: {
    opacity: 0.6,
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
  meta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  time: {
    fontFamily: F.monoRegular,
    fontSize: 10,
  },
  timeOwn: {
    color: C.onPrimary,
  },
  timeOther: {
    color: C.muted,
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
