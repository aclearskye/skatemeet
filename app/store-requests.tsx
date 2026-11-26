import { useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useResolveTicketRequest } from "@/lib/tickets/hooks/useResolveTicketRequest";
import { useStoreTicketRequests } from "@/lib/tickets/hooks/useStoreTicketRequests";
import type { ResolveRequestAction, StoreTicketRequest } from "@/lib/tickets/requestTypes";
import { TicketsError } from "@/lib/tickets/types";
import { C, F } from "@/lib/theme";
import { BackButton } from "@/components/common/BackButton";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { TicketRequestRow } from "@/components/tickets/TicketRequestRow";

type Pending = { request: StoreTicketRequest; action: ResolveRequestAction };

const CONFIRM: Record<ResolveRequestAction, { title: string; label: string }> = {
  refund: { title: "Refund this ticket?", label: "REFUND" },
  swap: { title: "Swap this ticket?", label: "SWAP" },
  decline: { title: "Decline this request?", label: "DECLINE" },
};

function confirmMessage({ request, action }: Pending): string {
  if (action === "refund") return "The payment goes back to their card from your Stripe account, and the ticket stops working.";
  if (action === "swap") return `Their ${request.ticketName} ticket is replaced with ${request.swapName}, with a new QR code.`;
  return "They keep their ticket and can ask again later.";
}

// Skaters asking to refund or swap a ticket they haven't used 30 days after
// buying it. The store decides each one.
export default function StoreRequestsScreen() {
  const insets = useSafeAreaInsets();
  const { data: requests = [], isLoading, isError, refetch, isRefetching } = useStoreTicketRequests();
  const resolve = useResolveTicketRequest();
  const [confirming, setConfirming] = useState<Pending | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = ({ request, action }: Pending) => {
    setConfirming(null);
    setError(null);
    setBusyId(request.requestId);
    resolve.mutate(
      { requestId: request.requestId, action },
      {
        onError: (err) => setError(err instanceof TicketsError ? err.message : "Couldn't do that. Try again."),
        onSettled: () => setBusyId(null),
      }
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <BackButton />
        <View style={styles.headerText}>
          <Text style={styles.heading}>REQUESTS</Text>
          <Text style={styles.subheading}>{"// refunds and swaps on unused tickets"}</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.requestId}
          renderItem={({ item }) => (
            <TicketRequestRow
              request={item}
              isBusy={busyId === item.requestId}
              onApprove={() => setConfirming({ request: item, action: item.kind })}
              onDecline={() => setConfirming({ request: item, action: "decline" })}
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          ListHeaderComponent={error ? <Text style={styles.error}>{error}</Text> : null}
          ListEmptyComponent={
            <Text style={styles.empty}>{isError ? "COULDN'T LOAD REQUESTS" : "NO REQUESTS RIGHT NOW"}</Text>
          }
          onRefresh={() => refetch()}
          refreshing={isRefetching}
        />
      )}

      <ConfirmDialog
        visible={confirming != null}
        title={confirming ? CONFIRM[confirming.action].title : ""}
        message={confirming ? confirmMessage(confirming) : ""}
        confirmLabel={confirming ? CONFIRM[confirming.action].label : ""}
        onConfirm={() => confirming && run(confirming)}
        onCancel={() => setConfirming(null)}
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
  headerText: { flex: 1, gap: 2 },
  heading: { fontFamily: F.heading, fontSize: 20, color: C.text, letterSpacing: 2 },
  subheading: { fontFamily: F.monoRegular, fontSize: 13, color: C.muted, letterSpacing: 0.5 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 16, gap: 12 },
  empty: { fontFamily: F.mono, fontSize: 11, color: C.muted, letterSpacing: 2, textAlign: "center", paddingTop: 32 },
  error: { fontFamily: F.body, fontSize: 13, color: C.error, marginBottom: 8 },
});
