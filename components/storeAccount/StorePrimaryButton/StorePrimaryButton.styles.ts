import { StyleSheet } from "react-native";
import { C, F, R } from "@/lib/theme";

export const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: R,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  secondary: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: C.borderVariant,
  },
  inactive: { opacity: 0.55 },
  label: {
    fontFamily: F.mono,
    fontSize: 14,
    letterSpacing: 2,
    color: C.onPrimary,
  },
  secondaryLabel: { color: C.text },
});
