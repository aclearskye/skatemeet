import { ActivityIndicator, ScrollView, Switch, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useExportMyData } from "@/lib/profiles/hooks/useExportMyData";
import { useProfilePrivacy } from "@/lib/profiles/hooks/useProfilePrivacy";
import { C, F } from "@/lib/theme";
import { DeactivateAccountButton } from "@/components/common/DeactivateAccountButton";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isPrivate, setIsPrivate } = useProfilePrivacy();
  const { exportData, isExporting } = useExportMyData();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.heading}>SETTINGS</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>PROFILE SETTINGS</Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>PRIVATE ACCOUNT</Text>
            <Text style={styles.rowDescription}>
              Only friends can see your profile or find you in search.
            </Text>
          </View>
          <Switch
            value={isPrivate}
            onValueChange={setIsPrivate}
            trackColor={{ false: C.surfaceHigh, true: C.primary }}
            thumbColor={C.text}
          />
        </View>

        <TouchableOpacity style={styles.linkRow} onPress={() => router.push("/blocked" as any)} activeOpacity={0.7}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>BLOCKED SKATERS</Text>
            <Text style={styles.rowDescription}>{"See who you've blocked and unblock them."}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.muted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkRow} onPress={() => router.push("/archive" as never)} activeOpacity={0.7}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>ARCHIVE</Text>
            <Text style={styles.rowDescription}>{"Posts you've hidden from your profile. Only you can see them."}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.muted} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>YOUR DATA</Text>
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => exportData()}
          disabled={isExporting}
          activeOpacity={0.7}
        >
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>DOWNLOAD MY DATA</Text>
            <Text style={styles.rowDescription}>
              Everything SkateMeet holds about you, as a JSON file.
            </Text>
          </View>
          {isExporting ? (
            <ActivityIndicator color={C.primary} size="small" />
          ) : (
            <Ionicons name="download-outline" size={18} color={C.muted} />
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkRow} onPress={() => router.push("/privacy" as any)} activeOpacity={0.7}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>PRIVACY POLICY</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.muted} />
        </TouchableOpacity>
      </View>

      <View style={styles.dangerZone}>
        <Text style={styles.dangerLabel}>DANGER ZONE</Text>
        <DeactivateAccountButton />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scrollContent: { flexGrow: 1 },
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
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 4,
  },
  dangerZone: {
    marginTop: "auto",
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
