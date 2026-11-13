import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  actions: { flexDirection: "row" },
  action: {
    width: 84,
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
