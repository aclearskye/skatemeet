import { StyleSheet } from "react-native";
import { C } from "@/lib/theme";

export const styles = StyleSheet.create({
  // No avatar for an unavailable skater, so it can't hint at who it was.
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.surfaceHighest,
  },
});
