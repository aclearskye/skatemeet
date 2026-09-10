import { StyleSheet } from "react-native";
import { C, F, R } from "@/lib/theme";

export const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 480,
    marginHorizontal: 16,
    backgroundColor: C.surface,
    borderRadius: R,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: C.border,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.55,
    shadowRadius: 0,
    elevation: 6,
  },
  label: {
    fontFamily: F.mono,
    fontSize: 11,
    letterSpacing: 1,
    color: C.muted,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  message: {
    fontFamily: F.body,
    fontSize: 15,
    color: C.text,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  textColumn: {
    flex: 1,
  },
});
