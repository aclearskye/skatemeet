import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  image: {
    backgroundColor: C.surfaceHigh,
  },
  placeholder: {
    backgroundColor: C.surfaceHighest,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    fontFamily: F.heading,
    color: C.text,
  },
});
