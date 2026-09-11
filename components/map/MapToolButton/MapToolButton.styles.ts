import { C } from "@/lib/theme";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  btn: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.surfaceHigh,
    borderWidth: 2,
    borderColor: C.border,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
