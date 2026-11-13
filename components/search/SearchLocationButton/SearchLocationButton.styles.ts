import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    maxWidth: "100%",
    gap: 6,
    paddingHorizontal: 10,
    height: 32,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.bgLow,
  },
  label: {
    flexShrink: 1,
    fontFamily: F.mono,
    fontSize: 11,
    letterSpacing: 0.5,
    color: C.text,
  },
});
