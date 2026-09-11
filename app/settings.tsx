import { C, F } from "@/lib/theme";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DeactivateAccountButton } from "@/components/common/DeactivateAccountButton";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.heading}>SETTINGS</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.placeholder}>PROFILE SETTINGS WILL APPEAR HERE.</Text>
      </View>

      <View style={styles.dangerZone}>
        <Text style={styles.dangerLabel}>DANGER ZONE</Text>
        <DeactivateAccountButton />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: C.border,
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
  dangerZone: {
    padding: 16,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: C.borderVariant,
  },
  dangerLabel: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    letterSpacing: 1,
  },
});
