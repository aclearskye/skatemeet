import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  container: {
    borderTopWidth: 2,
    borderTopColor: C.border,
    backgroundColor: C.bgLow,
    paddingHorizontal: 20,
    paddingTop: 18,
    gap: 14,
  },
  heading: {
    fontFamily: F.heading,
    fontSize: 20,
    color: C.text,
    letterSpacing: 1,
  },
  rules: {
    gap: 8,
  },
  ruleRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  ruleText: {
    flex: 1,
    fontFamily: F.body,
    fontSize: 14,
    lineHeight: 20,
    color: C.textVariant,
  },
  joinBtn: {
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  joinText: {
    fontFamily: F.mono,
    fontSize: 14,
    letterSpacing: 1.5,
  },
  ineligible: {
    fontFamily: F.monoRegular,
    fontSize: 12,
    color: C.muted,
    textAlign: "center",
  },
});
