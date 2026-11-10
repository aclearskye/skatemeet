import { StyleSheet } from "react-native";
import { C } from "@/lib/theme";

// Flat hard-edged square, no shadow.
export const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  // Locked until checked in: dark square, muted outline.
  btnDisabled: {
    backgroundColor: `${C.bg}cc`,
    borderColor: C.muted,
  },
});
