import type { StyleProp, ViewStyle } from "react-native";

export type PostVideoProps = {
  // HLS manifest (published / signed admin preview) or a local file (composer).
  uri: string;
  // Only the on-screen video plays; others stay paused and don't buffer.
  isActive: boolean;
  isMuted: boolean;
  // Paused by the viewer (tap to pause). Only meaningful while active.
  isPaused?: boolean;
  contentFit?: "contain" | "cover";
  style?: StyleProp<ViewStyle>;
};
