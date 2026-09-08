import { useDrawer } from "@/lib/context/drawer-context";
import { C } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet, TouchableOpacity, View } from "react-native";

export default function BurgerButton() {
  const { openDrawer } = useDrawer();
  // Web has no drawer at all — nav and account actions live permanently in
  // the pinned WebSidebar/WebAccountSidebar instead.
  if (Platform.OS === "web") return null;
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
