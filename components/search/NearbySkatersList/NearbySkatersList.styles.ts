import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  statusWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  statusText: {
    fontFamily: F.monoRegular,
    fontSize: 12,
    color: C.muted,
    textAlign: "center",
  },
  action: {
    paddingHorizontal: 14,
    height: 36,
    justifyContent: "center",
    backgroundColor: C.primary,
  },
  actionText: {
    fontFamily: F.mono,
    fontSize: 11,
    letterSpacing: 0.5,
    color: C.onPrimary,
  },
  heading: {
    fontFamily: F.mono,
    fontSize: 11,
    letterSpacing: 1,
    color: C.muted,
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  footer: {
    paddingVertical: 12,
  },
});
