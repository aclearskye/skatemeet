import { C } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

type Props = { isDiy?: boolean; selected?: boolean; liveCount?: number };

export function SpotMarker({ isDiy = false, selected = false, liveCount }: Props) {
  const accent = isDiy ? C.tertiary : C.primary;
  const onAccent = isDiy ? C.onTertiary : C.onPrimary;
  return (
    <View>
      <View
        style={[
          styles.square,
          selected
            ? { backgroundColor: accent }
            : { backgroundColor: C.surfaceHigh, borderWidth: 2, borderColor: accent },
        ]}
      >
        <Ionicons
          name={isDiy ? "construct-sharp" : "location-sharp"}
          size={18}
          color={selected ? onAccent : accent}
        />
      </View>
      {!!liveCount && liveCount > 0 && <View style={styles.liveDot} />}
    </View>
  );
}

const styles = StyleSheet.create({
  square: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  liveDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.error,
    borderWidth: 1.5,
    borderColor: C.bg,
  },
});
