import { StyleSheet } from "react-native";
import { C } from "@/lib/theme";

export const styles = StyleSheet.create({
  btn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: {
    backgroundColor: C.surfaceHigh,
  },
});
