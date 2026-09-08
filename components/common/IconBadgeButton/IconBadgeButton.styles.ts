import { C } from "@/lib/theme";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  btn: {
    padding: 4,
    flexShrink: 0,
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.tertiary,
    borderWidth: 1.5,
    borderColor: C.bgLow,
  },
});
