import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  btn: {
    backgroundColor: C.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignSelf: "flex-start",
  },
  btnFollowing: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: C.borderVariant,
    paddingVertical: 5,
  },
  text: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.onPrimary,
    letterSpacing: 1,
  },
  textFollowing: {
    color: C.muted,
  },
});
