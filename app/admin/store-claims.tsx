import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useReviewStoreClaim } from "@/lib/admin/hooks/useReviewStoreClaim";
import { useStoreClaimsQueue } from "@/lib/admin/hooks/useStoreClaimsQueue";
import { AdminError } from "@/lib/admin/mutations";
import { C, F } from "@/lib/theme";
import { StoreClaimCard } from "@/components/admin/StoreClaimCard";

// Pending Store ownership claims and disputes. Email-domain matches are
// listed first, but an admin always makes the decision.
export default function AdminStoreClaimsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingClaimId, setPendingClaimId] = useState<string | null>(null);

  const { data: claims = [], isLoading, isError } = useStoreClaimsQueue();
  const review = useReviewStoreClaim();

  const handleDecide = (claimId: string, approve: boolean, notes: string) => {
    const claim = claims.find((c) => c.claimId === claimId);
    if (!claim) return;
    setErrorMessage(null);
    setPendingClaimId(claimId);
    review.mutate(
      { claimId, profileId: claim.profileId, approve, notes },
      {
        onError: (error) =>
          setErrorMessage(error instanceof AdminError ? error.message : "Something went wrong — try again."),
        onSettled: () => setPendingClaimId(null),
      }
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.heading}>STORE CLAIMS</Text>
          <Text style={styles.subheading} numberOfLines={1}>
            {"// businesses claiming stores"}
          </Text>
        </View>
      </View>

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.centeredMsg}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : isError ? (
        <View style={styles.centeredMsg}>
          <Ionicons name="alert-circle-outline" size={32} color={C.error} />
          <Text style={styles.emptyLabel}>FAILED TO LOAD THE QUEUE</Text>
        </View>
      ) : claims.length === 0 ? (
        <View style={styles.centeredMsg}>
          <Ionicons name="storefront-outline" size={32} color={C.muted} />
          <Text style={styles.emptyLabel}>NO PENDING CLAIMS</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {claims.map((item) => (
            <StoreClaimCard
              key={item.claimId}
              item={item}
              onDecide={handleDecide}
              isBusy={pendingClaimId === item.claimId}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: C.border,
  },
  backBtn: { paddingVertical: 2 },
  headerText: { flex: 1, flexDirection: "row", alignItems: "baseline", gap: 10 },
  heading: { fontFamily: F.heading, fontSize: 20, color: C.text, letterSpacing: 2 },
  subheading: { flexShrink: 1, fontFamily: F.monoRegular, fontSize: 13, color: C.muted, letterSpacing: 0.5 },
  errorBanner: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: C.errorContainer,
    borderBottomWidth: 1,
    borderBottomColor: C.errorBorder,
  },
  errorText: { fontFamily: F.monoRegular, fontSize: 12, color: C.error },
  list: { padding: 16, gap: 10 },
  centeredMsg: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  emptyLabel: { fontFamily: F.mono, fontSize: 11, color: C.muted, letterSpacing: 2 },
});
