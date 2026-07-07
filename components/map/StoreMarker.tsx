import { C } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

type Props = { selected?: boolean };

export function StoreMarker({ selected = false }: Props) {
  return (
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
  );
}

const styles = StyleSheet.create({
  square: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
});
