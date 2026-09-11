import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useProfileSearch } from "@/lib/admin/hooks/useProfileSearch";
import { useBanUser } from "@/lib/admin/hooks/useBanUser";
import { useUnbanUser } from "@/lib/admin/hooks/useUnbanUser";
import { AdminError } from "@/lib/admin/mutations";
import type { ProfileSearchResult } from "@/lib/admin/types";
import { C, F } from "@/lib/theme";
import { UserSearchResultCard } from "@/components/admin/UserSearchResultCard";
import { BanUserSheet } from "@/components/admin/BanUserSheet";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

export default function AdminUsersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [banTarget, setBanTarget] = useState<ProfileSearchResult | null>(null);
  const [unbanTarget, setUnbanTarget] = useState<ProfileSearchResult | null>(null);
  const [busyProfileId, setBusyProfileId] = useState<string | null>(null);

  const { results, search, isSearching } = useProfileSearch();
  const banMutation = useBanUser();
  const unbanMutation = useUnbanUser();

  function handleError(error: unknown) {
    setErrorMessage(error instanceof AdminError ? error.message : "Something went wrong — try again.");
  }

  function handleSearch() {
    const trimmed = query.trim();
    if (!trimmed) return;
    setErrorMessage(null);
    search(trimmed);
  }

  async function handleBanSubmit(reason: string) {
    if (!banTarget) return;
    setErrorMessage(null);
    setBusyProfileId(banTarget.profileId);
    try {
      await banMutation.mutateAsync({ profileId: banTarget.profileId, reason });
      search(query.trim());
    } finally {
      setBusyProfileId(null);
    }
  }

  function handleConfirmUnban() {
    if (!unbanTarget) return;
    setErrorMessage(null);
    setBusyProfileId(unbanTarget.profileId);
    unbanMutation.mutate(unbanTarget.profileId, {
      onError: handleError,
      onSuccess: () => search(query.trim()),
      onSettled: () => {
        setBusyProfileId(null);
        setUnbanTarget(null);
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
          <Text style={styles.heading}>USERS</Text>
          <Text style={styles.subheading} numberOfLines={1}>
            {"// search, ban, unban"}
          </Text>
        </View>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by username…"
          placeholderTextColor={C.muted}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} activeOpacity={0.85}>
          <Ionicons name="search" size={18} color={C.onPrimary} />
        </TouchableOpacity>
      </View>

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {isSearching ? (
        <View style={styles.centeredMsg}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : results.length === 0 ? (
        <View style={styles.centeredMsg}>
          <Ionicons name="person-outline" size={32} color={C.muted} />
          <Text style={styles.emptyLabel}>SEARCH FOR A USERNAME</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {results.map((result) => (
            <UserSearchResultCard
              key={result.profileId}
              result={result}
              onBan={setBanTarget}
              onUnban={setUnbanTarget}
              isBusy={busyProfileId === result.profileId}
            />
          ))}
        </ScrollView>
      )}

      <BanUserSheet
        visible={banTarget != null}
        username={banTarget?.username ?? ""}
        onClose={() => setBanTarget(null)}
        onSubmit={handleBanSubmit}
      />

      <ConfirmDialog
        visible={unbanTarget != null}
        title={`Unban @${unbanTarget?.username ?? ""}?`}
        message="They'll be able to sign in again immediately."
        confirmLabel="UNBAN"
        onConfirm={handleConfirmUnban}
        onCancel={() => setUnbanTarget(null)}
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
  searchRow: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
    paddingBottom: 0,
  },
  searchInput: {
    flex: 1,
    backgroundColor: C.surface,
    borderWidth: 2,
    borderColor: C.border,
    color: C.text,
    fontFamily: F.body,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchBtn: {
    width: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.primary,
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
