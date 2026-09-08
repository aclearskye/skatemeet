import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

const overlay = `${C.bgLowest}cc`;

export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bgLowest },
  centered: { alignItems: "center", justifyContent: "center" },
  page: { flex: 1, justifyContent: "center" },
  image: { flex: 1 },
  closeBtn: {
    position: "absolute",
    right: 12,
    zIndex: 10,
    padding: 8,
    backgroundColor: overlay,
  },
  counter: {
    position: "absolute",
    alignSelf: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: overlay,
  },
  counterText: { fontFamily: F.mono, fontSize: 11, color: C.text, letterSpacing: 1 },
  actionBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingTop: 14,
    backgroundColor: C.bgLowest,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  actionBtn: { alignItems: "center", gap: 4, minWidth: 56 },
  actionCount: { fontFamily: F.mono, fontSize: 12, color: C.text },
  actionLabel: { fontFamily: F.mono, fontSize: 9, color: C.text, letterSpacing: 1 },
});
