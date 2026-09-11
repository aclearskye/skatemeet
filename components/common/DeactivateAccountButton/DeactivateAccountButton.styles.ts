import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 8,
  },
  btn: {
    borderWidth: 2,
    borderColor: C.errorBorder,
    backgroundColor: C.errorContainer,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnText: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.error,
    letterSpacing: 1,
  },
  errorText: {
    fontFamily: F.monoRegular,
    fontSize: 12,
    color: C.error,
    textAlign: "center",
  },
});
