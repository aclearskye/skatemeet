import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useBanAppealsQueue } from "@/lib/admin/hooks/useBanAppealsQueue";
import { useDeletionEligibleQueue } from "@/lib/admin/hooks/useDeletionEligibleQueue";
import { usePhotoReportsQueue } from "@/lib/admin/hooks/usePhotoReportsQueue";
import { useProfileReportsQueue } from "@/lib/admin/hooks/useProfileReportsQueue";
import { useReviewReportsQueue } from "@/lib/admin/hooks/useReviewReportsQueue";
import { useVerificationQueue } from "@/lib/admin/hooks/useVerificationQueue";
import { C, F } from "@/lib/theme";

export default function AdminDashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: verificationRequests } = useVerificationQueue();
  const { data: photoReports } = usePhotoReportsQueue();
  const { data: reviewReports } = useReviewReportsQueue();
  const { data: profileReports } = useProfileReportsQueue();
  const { data: banAppeals } = useBanAppealsQueue();
  const { data: deletionEligible } = useDeletionEligibleQueue();

  const reportsCount =
    (photoReports?.length ?? 0) +
    (reviewReports?.length ?? 0) +
    (profileReports?.length ?? 0) +
    (banAppeals?.length ?? 0);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.heading}>ADMIN PANEL</Text>
        <Text style={styles.subheading} numberOfLines={1}>
          {"// moderation queues"}
        </Text>
      </View>

      <View style={styles.tiles}>
        <TouchableOpacity
          style={styles.tile}
          onPress={() => router.push("/admin/verification-requests")}
          activeOpacity={0.75}
        >
          <Ionicons name="shield-checkmark-outline" size={22} color={C.primary} />
          <View style={styles.tileText}>
            <Text style={styles.tileLabel}>VERIFICATION REQUESTS</Text>
            <Text style={styles.tileCount}>{verificationRequests?.length ?? 0} PENDING</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tile}
          onPress={() => router.push("/admin/reports")}
          activeOpacity={0.75}
        >
          <Ionicons name="flag-outline" size={22} color={C.primary} />
          <View style={styles.tileText}>
            <Text style={styles.tileLabel}>REPORTS</Text>
            <Text style={styles.tileCount}>{reportsCount} PENDING</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tile}
          onPress={() => router.push("/admin/users")}
          activeOpacity={0.75}
        >
          <Ionicons name="person-remove-outline" size={22} color={C.primary} />
          <View style={styles.tileText}>
            <Text style={styles.tileLabel}>USERS</Text>
            <Text style={styles.tileCount}>SEARCH · BAN · UNBAN</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tile}
          onPress={() => router.push("/admin/data-deletion")}
          activeOpacity={0.75}
        >
          <Ionicons name="trash-outline" size={22} color={C.primary} />
          <View style={styles.tileText}>
            <Text style={styles.tileLabel}>DATA DELETION</Text>
            <Text style={styles.tileCount}>{deletionEligible?.length ?? 0} ELIGIBLE</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.muted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
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
  subheading: {
    flexShrink: 1,
    fontFamily: F.monoRegular,
    fontSize: 13,
    color: C.muted,
    letterSpacing: 0.5,
  },
  tiles: {
    padding: 16,
    gap: 10,
  },
  tile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
  },
  tileText: {
    flex: 1,
    gap: 2,
  },
  tileLabel: {
    fontFamily: F.bodyBold,
    fontSize: 15,
    color: C.text,
  },
  tileCount: {
    fontFamily: F.monoRegular,
    fontSize: 12,
    color: C.muted,
    letterSpacing: 0.5,
  },
});
