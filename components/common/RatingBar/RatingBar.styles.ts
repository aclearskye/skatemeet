import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  container: { gap: 10 },
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
  },
  label: { fontFamily: F.mono, fontSize: 10, color: C.muted, letterSpacing: 2 },
  value: { fontFamily: F.monoRegular, fontSize: 11, color: C.muted, letterSpacing: 0.5 },
  // A sunken dark frame with the segments set into it.
  track: {
    flexDirection: "row",
    gap: 3,
    padding: 3,
    borderWidth: 2,
    borderColor: C.surfaceHighest,
    backgroundColor: C.bgLowest,
  },
  trackSm: { gap: 2, padding: 2, borderWidth: 1, alignSelf: "flex-start", width: 90 },
  segment: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: C.surfaceHighest,
  },
  segmentSm: { height: 5 },
  segmentMd: { height: 16 },
  segmentInput: { height: 28 },
  // The viewer's own rating in community mode: an ink outline drawn over
  // the fill, so it shows whatever the average is.
  segmentMine: { borderWidth: 2, borderColor: C.text },
  fill: { position: "absolute", left: 0, top: 0, bottom: 0 },
});
