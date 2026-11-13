import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

const ACTION_WIDTH = 84;

export const styles = StyleSheet.create({
  card: { backgroundColor: C.bg },
  // Fixed width: the swipe opens exactly this far.
  actions: { flexDirection: "row", width: ACTION_WIDTH * 2 },
  action: {
    width: ACTION_WIDTH,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  // Bone tape for the reversible action, red tape for the destructive one.
  mute: { backgroundColor: C.tape },
  delete: { backgroundColor: C.tapeRed },
  actionText: { fontFamily: F.mono, fontSize: 10, letterSpacing: 1 },
  muteText: { color: C.onTape },
  deleteText: { color: C.onTapeRed },
});
