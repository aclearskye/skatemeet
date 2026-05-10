import BurgerButton from "@/components/ui/BurgerButton";
import { C, F } from "@/lib/theme";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Index() {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
      <View style={[styles.headerContainer, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.heading}>FEED</Text>
        <BurgerButton />
      </View>
      <View style={styles.body}>
        <Text style={styles.placeholder}>YOUR FEED WILL APPEAR HERE.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  headerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: C.border,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  heading: {
    fontFamily: F.heading,
    fontSize: 20,
    color: C.text,
    letterSpacing: 2,
  },
  body: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholder: {
    color: C.muted,
    fontFamily: F.mono,
    fontSize: 11,
    letterSpacing: 2,
  },
});
