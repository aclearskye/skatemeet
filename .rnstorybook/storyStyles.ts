import { StyleSheet } from "react-native";

import { C, F, SP } from "@/lib/theme";

// Layout helpers for stories whose component needs a sized parent.
export const storyStyles = StyleSheet.create({
  root: { flex: 1 },
  tall: { height: 600 },
  trigger: {
    alignSelf: "flex-start",
    backgroundColor: C.primary,
    paddingHorizontal: SP.gutter,
    paddingVertical: SP.stackSm,
  },
  triggerText: { fontFamily: F.bodyBold, color: C.onPrimary },
  triggerRow: { flexDirection: "row", flexWrap: "wrap", gap: SP.stackSm, padding: SP.gutter },
  bodyText: { fontFamily: F.body, fontSize: 14, color: C.text },
  // DuctTapeLabel's children, as EntityTapeLabels sizes them (md).
  tapeChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 4 },
  tapeText: { fontFamily: F.mono, fontSize: 10, letterSpacing: 1 },
});

export const SAMPLE_REGION = {
  latitude: 51.5069,
  longitude: -0.1167,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};
