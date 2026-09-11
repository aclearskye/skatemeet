import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useDeleteUserData } from "@/lib/admin/hooks/useDeleteUserData";
import { useDeletionEligibleQueue } from "@/lib/admin/hooks/useDeletionEligibleQueue";
import { AdminError } from "@/lib/admin/mutations";
import type { DeletionEligibleItem } from "@/lib/admin/types";
import { C, F } from "@/lib/theme";
import { DeletionEligibleCard } from "@/components/admin/DeletionEligibleCard";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

export default function AdminDataDeletionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeletionEligibleItem | null>(null);
  const [busyProfileId, setBusyProfileId] = useState<string | null>(null);

  const { data: items = [], isLoading, isError } = useDeletionEligibleQueue();
  const deleteMutation = useDeleteUserData();

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    setErrorMessage(null);
    setBusyProfileId(deleteTarget.profileId);
    deleteMutation.mutate(deleteTarget.profileId, {
      onError: (error) => {
        setErrorMessage(error instanceof AdminError ? error.message : "Something went wrong — try again.");
      },
      onSettled: () => {
        setBusyProfileId(null);
        setDeleteTarget(null);
      },
    });
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.heading}>DATA DELETION</Text>
          <Text style={styles.subheading} numberOfLines={1}>
            {"// banned 30+ days, no pending appeal"}
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
          <Text style={styles.emptyLabel}>FAILED TO LOAD</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centeredMsg}>
          <Ionicons name="checkmark-circle-outline" size={32} color={C.muted} />
          <Text style={styles.emptyLabel}>NOTHING ELIGIBLE RIGHT NOW</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {items.map((item) => (
            <DeletionEligibleCard
              key={item.profileId}
              item={item}
              onDelete={setDeleteTarget}
              isBusy={busyProfileId === item.profileId}
            />
          ))}
        </ScrollView>
      )}

      <ConfirmDialog
        visible={deleteTarget != null}
        title={`Permanently delete @${deleteTarget?.username ?? ""}?`}
        message="This erases their account and everything tied to it — reviews, photos, check-ins, XP. This cannot be undone."
        confirmLabel="DELETE"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
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
    margin: 16,
    marginBottom: 0,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: C.errorContainer,
    borderWidth: 1,
    borderColor: C.errorBorder,
  },
  errorText: {
    fontFamily: F.monoRegular,
    fontSize: 12,
    color: C.error,
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
  list: {
    padding: 16,
    gap: 10,
  },
});
