import { Switch, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useProfilePrivacy } from "@/lib/profiles/hooks/useProfilePrivacy";
import { C, F } from "@/lib/theme";
import { DeactivateAccountButton } from "@/components/common/DeactivateAccountButton";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { isPrivate, setIsPrivate } = useProfilePrivacy();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.heading}>SETTINGS</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>PROFILE SETTINGS</Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>PRIVATE ACCOUNT</Text>
            <Text style={styles.rowDescription}>
              Only friends can message you when this is on.
            </Text>
          </View>
          <Switch
            value={isPrivate}
            onValueChange={setIsPrivate}
            trackColor={{ false: C.surfaceHigh, true: C.primary }}
            thumbColor={C.text}
          />
        </View>
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
  section: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  sectionLabel: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    letterSpacing: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontFamily: F.bodyBold,
    fontSize: 14,
    color: C.text,
  },
  rowDescription: {
    fontFamily: F.body,
    fontSize: 12,
    color: C.muted,
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
