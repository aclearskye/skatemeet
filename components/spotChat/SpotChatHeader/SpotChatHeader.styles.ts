import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

const backdropColor = `${C.bgLowest}cc`;

export const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: C.border,
    backgroundColor: C.bg,
  },
  backBtn: {
    width: 30,
  },
  titleColumn: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontFamily: F.heading,
    fontSize: 17,
    color: C.text,
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  meta: {
    fontFamily: F.monoRegular,
    fontSize: 11,
    color: C.muted,
  },
  menuBtn: {
    width: 30,
    alignItems: "flex-end",
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
