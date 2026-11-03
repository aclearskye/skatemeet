import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const AVATAR_SIZE = 44;

export const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: C.bgLow,
    borderWidth: 2,
    borderColor: C.border,
  },
  info: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  name: {
    fontFamily: F.heading,
    fontSize: 15,
    color: C.text,
    letterSpacing: 0.3,
  },
  username: {
    fontFamily: F.monoRegular,
    fontSize: 11,
    color: C.muted,
  },
  unblockBtn: {
    borderWidth: 2,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  unblockText: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.text,
    letterSpacing: 1,
  },
});
