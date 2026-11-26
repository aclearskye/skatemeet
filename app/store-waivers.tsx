import { useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDebouncedValue } from "@/lib/shared/hooks/useDebouncedValue";
import { useMyStorePage } from "@/lib/storeAccounts/hooks/useMyStorePage";
import { useStoreWaivers } from "@/lib/tickets/hooks/useStoreWaivers";
import { useWaiverExport } from "@/lib/tickets/hooks/useWaiverExport";
import { TicketsError } from "@/lib/tickets/types";
import type { StoreWaiverRecord } from "@/lib/tickets/waiverExport";
import { C, F, R } from "@/lib/theme";
import { BackButton } from "@/components/common/BackButton";
import { TapeChip } from "@/components/common/TapeChip";
import { StorePrimaryButton } from "@/components/storeAccount/StorePrimaryButton";

const SEARCH_DELAY_MS = 300;

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toLocaleDateString("en-CA");
}

// Every signed waiver SkateMeet still holds for the store. The store owns
// them and keeps its own copies: a CSV of many, or one as a printable page.
export default function StoreWaiversScreen() {
  const insets = useSafeAreaInsets();
  const { data: page } = useMyStorePage();
  const [search, setSearch] = useState("");
  const query = useDebouncedValue(search.trim(), SEARCH_DELAY_MS);
  const waivers = useStoreWaivers(query);
  const exporter = useWaiverExport();
  const [error, setError] = useState<string | null>(null);
  const rows = waivers.data?.pages.flat() ?? [];
  // Which export is running. Optional chaining throughout: React Compiler
  // reads these during render, before any guard would run.
  const running = exporter.isPending ? exporter.variables : undefined;
  const csvRecentBusy = running?.kind === "csv" && running?.from != null;
  const csvAllBusy = running?.kind === "csv" && running?.from == null;
  const printingId = running?.kind === "print" ? running?.ticketId : null;

  const run = (vars: Parameters<typeof exporter.mutate>[0]) => {
    setError(null);
    exporter.mutate(vars, {
      onError: (err) => setError(err instanceof TicketsError ? err.message : "Couldn't export. Try again."),
    });
  };

  const header = (
    <View style={styles.top}>
      <Text style={styles.hint}>
        You own these. SkateMeet deletes each waiver 30 days after its ticket is used, refunded or ends, so export
        regularly and keep your own copies.
      </Text>
      <View style={styles.buttons}>
        <View style={styles.button}>
          <StorePrimaryButton
            label="CSV: LAST 30 DAYS"
            variant="secondary"
            onPress={() => run({ kind: "csv", from: daysAgo(30), to: null })}
            isBusy={csvRecentBusy}
          />
        </View>
        <View style={styles.button}>
          <StorePrimaryButton
            label="CSV: EVERYTHING"
            variant="secondary"
            onPress={() => run({ kind: "csv", from: null, to: null })}
            isBusy={csvAllBusy}
          />
        </View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.search}>
        <Ionicons name="search-outline" size={16} color={C.muted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name"
          placeholderTextColor={C.muted}
          autoCorrect={false}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <BackButton />
        <View style={styles.headerText}>
          <Text style={styles.heading}>SIGNED WAIVERS</Text>
          <Text style={styles.subheading}>{"// tap one to print or save it"}</Text>
        </View>
      </View>

      {waivers.isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.ticketId}
          ListHeaderComponent={header}
          renderItem={({ item }) => (
            <WaiverRow
              waiver={item}
              isBusy={printingId === item.ticketId}
              onPress={() => run({ kind: "print", ticketId: item.ticketId, storeName: page?.name ?? "Store" })}
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          onEndReached={() => {
            if (waivers.hasNextPage && !waivers.isFetchingNextPage) waivers.fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {waivers.isError ? "COULDN'T LOAD WAIVERS" : query ? "NO ONE BY THAT NAME" : "NO SIGNED WAIVERS YET"}
            </Text>
          }
          ListFooterComponent={waivers.isFetchingNextPage ? <ActivityIndicator color={C.primary} style={styles.more} /> : null}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

function WaiverRow({ waiver, isBusy, onPress }: { waiver: StoreWaiverRecord; isBusy: boolean; onPress: () => void }) {
  const signed = new Date(waiver.signedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} disabled={isBusy} activeOpacity={0.7}>
      <View style={styles.rowText}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {waiver.fullName}
          </Text>
          {waiver.under18 ? <TapeChip text="U18" colors={{ bg: C.tapeOrange, fg: C.onTapeOrange }} size="sm" /> : null}
        </View>
        <Text style={styles.detail} numberOfLines={1}>
          {waiver.ticketName} · signed {signed} · v{waiver.waiverVersion}
        </Text>
      </View>
      {isBusy ? <ActivityIndicator color={C.primary} /> : <Ionicons name="print-outline" size={18} color={C.muted} />}
    </TouchableOpacity>
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
  headerText: { flex: 1, gap: 2 },
  heading: { fontFamily: F.heading, fontSize: 20, color: C.text, letterSpacing: 2 },
  subheading: { fontFamily: F.monoRegular, fontSize: 13, color: C.muted, letterSpacing: 0.5 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { paddingHorizontal: 16 },
  top: { gap: 12, paddingTop: 16, paddingBottom: 8 },
  hint: { fontFamily: F.body, fontSize: 13, lineHeight: 19, color: C.muted },
  buttons: { flexDirection: "row", gap: 10 },
  button: { flex: 1 },
  error: { fontFamily: F.body, fontSize: 13, color: C.error },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: C.borderVariant,
    borderRadius: R,
  },
  searchInput: { flex: 1, height: 40, fontFamily: F.body, fontSize: 14, color: C.text },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.borderVariant,
  },
  rowText: { flex: 1, gap: 3 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { flexShrink: 1, fontFamily: F.bodyBold, fontSize: 15, color: C.text },
  detail: { fontFamily: F.body, fontSize: 13, color: C.muted },
  empty: { fontFamily: F.mono, fontSize: 11, color: C.muted, letterSpacing: 2, textAlign: "center", paddingTop: 32 },
  more: { paddingVertical: 16 },
});
