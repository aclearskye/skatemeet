import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: C.border,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: -2,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: C.primary,
  },
  tabText: {
    fontFamily: F.mono,
    fontSize: 11,
    letterSpacing: 1.5,
    color: C.muted,
  },
  tabTextActive: {
    color: C.primary,
  },
});
