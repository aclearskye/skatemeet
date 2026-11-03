import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

const backdropColor = `${C.bgLowest}cc`;

export const styles = StyleSheet.create({
  lockBtn: {
    padding: 4,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: backdropColor,
  },
  sheet: {
    backgroundColor: C.bg,
    borderTopWidth: 2,
    borderTopColor: C.border,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    gap: 6,
  },
  iconBadge: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.secondary,
    marginBottom: 8,
  },
  title: {
    fontFamily: F.heading,
    fontSize: 17,
    color: C.text,
    letterSpacing: 0.3,
  },
  message: {
    fontFamily: F.body,
    fontSize: 14,
    color: C.muted,
    marginBottom: 18,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  keepBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: C.border,
    paddingVertical: 14,
    alignItems: "center",
  },
  keepText: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.muted,
    letterSpacing: 1,
  },
  publicBtn: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    backgroundColor: C.primary,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  publicText: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.onPrimary,
    letterSpacing: 1,
  },
});
