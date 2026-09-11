import { StyleSheet } from "react-native";
import { C, F, R } from "@/lib/theme";

export const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: R,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    gap: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  entityBadge: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.secondary,
    letterSpacing: 1,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  rating: {
    fontFamily: F.monoRegular,
    fontSize: 12,
    color: C.text,
  },
  heading: {
    fontFamily: F.bodyBold,
    fontSize: 15,
    color: C.text,
  },
  comment: {
    fontFamily: F.body,
    fontSize: 13,
    color: C.textVariant,
  },
  meta: {
    fontFamily: F.monoRegular,
    fontSize: 11,
    color: C.muted,
    letterSpacing: 0.5,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  dismissBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: C.border,
    paddingVertical: 12,
    alignItems: "center",
  },
  dismissText: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.muted,
    letterSpacing: 1,
  },
  removeBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: C.errorBorder,
    backgroundColor: C.errorContainer,
    paddingVertical: 12,
    alignItems: "center",
  },
  removeText: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.error,
    letterSpacing: 1,
  },
});
