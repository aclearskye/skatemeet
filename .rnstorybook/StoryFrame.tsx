import type { ReactNode } from "react";
import { View } from "react-native";

import { styles } from "./StoryFrame.styles";

// How a story sits in the phone-sized preview, set per story with
// `parameters: { frame: "..." }`:
// - inline: natural size, top-left (labels, buttons, avatars, markers)
// - block:  full phone width inside the app's gutter (cards, rows, forms)
// - edge:   full phone width, no gutter (headers, tab bars, heroes, grids)
// - screen: a whole phone screen (overlays, full screens, map UI)
export type StoryFrameKind = "inline" | "block" | "edge" | "screen";

type Props = {
  kind: StoryFrameKind;
  children: ReactNode;
};

export function StoryFrame({ kind, children }: Props) {
  return (
    <View style={styles.canvas}>
      <View
        style={[
          styles.phone,
          kind === "screen" && styles.screen,
          (kind === "block" || kind === "inline") && styles.gutter,
          kind === "inline" && styles.inline,
        ]}
      >
        {children}
      </View>
    </View>
  );
}
