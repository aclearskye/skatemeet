import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bg,
    borderWidth: 2,
    borderColor: C.border,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    color: C.text,
    fontFamily: F.body,
    fontSize: 14,
    padding: 0,
  },
});
