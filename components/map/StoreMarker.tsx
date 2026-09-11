import { C } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

type Props = { selected?: boolean; liveCount?: number };

export function StoreMarker({ selected = false, liveCount }: Props) {
  return (
    <View>
      <View
        style={[
          styles.square,
          selected
            ? { backgroundColor: C.secondary }
            : { backgroundColor: C.surfaceHigh, borderWidth: 2, borderColor: C.secondary },
        ]}
      >
        <Ionicons name="home-sharp" size={18} color={selected ? C.onSecondary : C.secondary} />
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
