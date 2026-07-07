import { C } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

type Props = { isDiy?: boolean; selected?: boolean };

export function SpotMarker({ isDiy = false, selected = false }: Props) {
  const accent = isDiy ? C.tertiary : C.primary;
  const onAccent = isDiy ? C.onTertiary : C.onPrimary;
  return (
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
  );
}

const styles = StyleSheet.create({
  square: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
});
