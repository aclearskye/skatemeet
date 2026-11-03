import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const AVATAR_SIZE = 52;

export const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.borderVariant,
  },
  info: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  name: {
    flexShrink: 1,
    fontFamily: F.heading,
    fontSize: 16,
    color: C.text,
    letterSpacing: 0.3,
  },
  nameMuted: {
    color: C.muted,
  },
  time: {
    marginLeft: "auto",
    fontFamily: F.monoRegular,
    fontSize: 11,
    color: C.muted,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 18,
  },
  preview: {
    flex: 1,
    fontFamily: F.body,
    fontSize: 13,
    color: C.muted,
  },
  previewUnread: {
    fontFamily: F.bodyBold,
    color: C.text,
  },
  sayHi: {
    flex: 1,
    fontFamily: F.bodySemiBold,
    fontSize: 13,
    color: C.primary,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.tertiary,
  },
});
