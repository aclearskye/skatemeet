import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.borderVariant,
  },
  identity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  names: {
    flex: 1,
  },
  username: {
    fontFamily: F.mono,
    fontSize: 13,
    color: C.text,
  },
  displayName: {
    fontFamily: F.body,
    fontSize: 13,
    color: C.muted,
  },
  removeBtn: {
    borderWidth: 2,
    borderColor: C.borderVariant,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  removeText: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    letterSpacing: 1,
  },
});
