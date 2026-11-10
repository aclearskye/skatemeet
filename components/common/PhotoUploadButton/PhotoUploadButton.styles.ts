import { StyleSheet } from "react-native";
import { C } from "@/lib/theme";

// Same hard-edged square as the post viewer's rail buttons.
export const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    shadowColor: C.bgLowest,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.6,
    shadowRadius: 0,
    elevation: 4,
  },
  // Locked until checked in: dark square, muted outline.
  btnDisabled: {
    backgroundColor: `${C.bg}cc`,
    borderColor: C.muted,
  },
});
