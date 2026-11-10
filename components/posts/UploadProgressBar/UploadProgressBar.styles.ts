import { StyleSheet } from "react-native";
import { C, F, R } from "@/lib/theme";

// Mirrors components/ui/ToastHost's card so an upload reads as the same
// notification that later replaces it.
export const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 8,
    zIndex: 50,
  },
  card: {
    width: "100%",
    maxWidth: 480,
    marginHorizontal: 16,
    backgroundColor: C.surface,
    borderRadius: R,
    borderLeftWidth: 6,
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
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  textColumn: {
    flex: 1,
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
  hint: {
    fontFamily: F.body,
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
  },
  track: {
    height: 3,
    marginTop: 10,
    backgroundColor: C.surfaceHighest,
  },
  fill: {
    height: 3,
  },
  actions: {
    flexDirection: "row",
    gap: 16,
    marginTop: 10,
  },
  action: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.primary,
    letterSpacing: 1,
  },
  actionMuted: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    letterSpacing: 1,
  },
});
