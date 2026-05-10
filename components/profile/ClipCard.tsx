import { type Clip } from "@/lib/clips/clips";
import { C, F } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const GAP = 2;
const COLS = 3;
const CELL_SIZE = (Dimensions.get("window").width - GAP * (COLS - 1)) / COLS;

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type Props = {
  clip: Clip;
  onPress?: (clip: Clip) => void;
};

export default function ClipCard({ clip, onPress }: Props) {
  const thumbUri = clip.thumbnail_url ?? clip.media_url;

  return (
    <TouchableOpacity
      onPress={() => onPress?.(clip)}
      activeOpacity={0.85}
      style={styles.cell}
    >
      <Image source={{ uri: thumbUri }} style={styles.image} resizeMode="cover" />

      {clip.media_type === "video" && (
        <View style={styles.videoIcon}>
          <Ionicons name="videocam" size={12} color={C.text} />
        </View>
      )}

      {clip.media_type === "video" && clip.duration_seconds != null && (
        <View style={styles.duration}>
          <Text style={styles.durationText}>
            {formatDuration(clip.duration_seconds)} ▶
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export { CELL_SIZE, GAP, COLS };

const styles = StyleSheet.create({
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    backgroundColor: C.surfaceLow,
  },
  image: {
    width: CELL_SIZE,
    height: CELL_SIZE,
  },
  videoIcon: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "rgba(0,0,0,0.55)",
    padding: 3,
  },
  duration: {
    position: "absolute",
    bottom: 5,
    left: 5,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  durationText: {
    fontFamily: F.monoRegular,
    fontSize: 10,
    color: C.text,
  },
});
