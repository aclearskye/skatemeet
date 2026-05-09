import Header from "@/components/ui/Header";
import { C, F } from "@/lib/theme";
import { StyleSheet, Text, View } from "react-native";

export default function Index() {
  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Header />
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
    paddingTop: 60,
    borderBottomWidth: 2,
    borderBottomColor: C.border,
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
