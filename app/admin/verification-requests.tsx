import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useApproveVerificationRequest } from "@/lib/admin/hooks/useApproveVerificationRequest";
import { useRejectVerificationRequest } from "@/lib/admin/hooks/useRejectVerificationRequest";
import { useVerificationQueue } from "@/lib/admin/hooks/useVerificationQueue";
import { AdminError } from "@/lib/admin/mutations";
import { C, F } from "@/lib/theme";
import { VerificationRequestCard } from "@/components/admin/VerificationRequestCard";

export default function AdminVerificationQueueScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);

  const { data: requests = [], isLoading, isError } = useVerificationQueue();
  const approveMutation = useApproveVerificationRequest();
  const rejectMutation = useRejectVerificationRequest();

  const handleError = (error: unknown) => {
    setErrorMessage(error instanceof AdminError ? error.message : "Something went wrong — try again.");
  };

  const handleApprove = (requestId: string) => {
    setErrorMessage(null);
    setPendingRequestId(requestId);
    approveMutation.mutate(requestId, {
      onError: handleError,
      onSettled: () => setPendingRequestId(null),
    });
  };

  const handleReject = (requestId: string) => {
    setErrorMessage(null);
    setPendingRequestId(requestId);
    rejectMutation.mutate(requestId, {
      onError: handleError,
      onSettled: () => setPendingRequestId(null),
    });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.heading}>VERIFICATION QUEUE</Text>
          <Text style={styles.subheading} numberOfLines={1}>
            {"// spots awaiting review"}
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
      ) : requests.length === 0 ? (
        <View style={styles.centeredMsg}>
          <Ionicons name="shield-checkmark-outline" size={32} color={C.muted} />
          <Text style={styles.emptyLabel}>NO PENDING REQUESTS</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {requests.map((item) => (
            <VerificationRequestCard
              key={item.requestId}
              item={item}
              onApprove={handleApprove}
              onReject={handleReject}
              isBusy={pendingRequestId === item.requestId}
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
  headerText: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
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
  errorBanner: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: C.errorContainer,
    borderBottomWidth: 1,
    borderBottomColor: C.errorBorder,
  },
  errorText: {
    fontFamily: F.monoRegular,
    fontSize: 12,
    color: C.error,
  },
  list: {
    padding: 16,
    gap: 10,
  },
  centeredMsg: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  emptyLabel: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    letterSpacing: 2,
  },
});
