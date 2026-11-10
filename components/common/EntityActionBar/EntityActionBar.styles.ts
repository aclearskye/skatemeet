import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  container: { gap: 8 },
  meta: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  metaText: { fontFamily: F.monoRegular, fontSize: 11, color: C.muted, letterSpacing: 0.5 },
  row: { flexDirection: "row", gap: 8 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 46,
    paddingHorizontal: 6,
    borderWidth: 2,
  },
  // Widths step down in importance: directions > check in > upvote.
  directions: { flex: 5 },
  checkIn: { flex: 3 },
  // Upvote is always orange, whatever the page accent: solid until you've
  // voted, outline after.
  vote: { flex: 2, borderColor: C.secondary },
  voteFilled: { backgroundColor: C.secondary },
  btnText: { fontFamily: F.mono, fontSize: 11, letterSpacing: 1 },
  error: { fontFamily: F.monoRegular, fontSize: 11, color: C.error },
});
