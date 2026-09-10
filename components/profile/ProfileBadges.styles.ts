import { C, TAPE, TS } from "@/lib/theme";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  badgeSkill: {
    backgroundColor: C.secondary,
    transform: [{ rotate: TAPE.rotateSecondary }],
  },
  badgeDiscipline: {
    backgroundColor: C.primary,
    transform: [{ rotate: TAPE.rotatePrimary }],
  },
  badgePronouns: {
    backgroundColor: C.tertiary,
    transform: [{ rotate: TAPE.rotateTertiary }],
  },
  label: {
    ...TS.labelTape,
  },
});
