import { StyleSheet } from "react-native";
import { C } from "@/lib/theme";

export const styles = StyleSheet.create({
  btn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  // Waiting on the other person stays flat instead of reading as duct
  // tape, so the tape look keeps meaning "a primary action." It's still
  // tappable, to withdraw the request.
  btnPending: {
    backgroundColor: C.surfaceHigh,
  },
  respondRow: {
    flexDirection: "row",
    gap: 6,
  },
});
