import { useDrawer } from "@/lib/context/drawer-context";
import { C } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity, View } from "react-native";

export default function BurgerButton() {
  const { openDrawer } = useDrawer();
  return (
    <TouchableOpacity onPress={openDrawer} activeOpacity={0.7} hitSlop={8}>
      <View style={styles.marker}>
        <Ionicons name="menu-sharp" size={20} color={C.text} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  marker: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.surfaceHigh,
    borderWidth: 2,
    borderColor: C.text,
  },
});
