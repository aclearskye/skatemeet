import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { useMyTickets } from "@/lib/tickets/hooks/useMyTickets";
import { C, F } from "@/lib/theme";
import { BackButton } from "@/components/common/BackButton";
import { TicketCard } from "@/components/tickets/TicketCard";

// The skater's bought entry tickets, each with the QR code staff scan at
// the till. Reached from the Stores page, or from a store page after buying.
export default function TicketsScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuthContext();
  const { data: tickets = [], isLoading, isError, isRefetching, refetch } = useMyTickets();
  const isStore = profile?.account_type === "store";

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <BackButton />
        <View style={styles.headerText}>
          <Text style={styles.heading}>MY TICKETS</Text>
          <Text style={styles.subheading}>{"// show the QR code at the till"}</Text>
        </View>
      </View>

      {isStore ? (
        <View style={styles.centered}>
          <Text style={styles.muted}>STORE ACCOUNTS CAN&apos;T BUY TICKETS</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Text style={styles.muted}>COULDN&apos;T LOAD YOUR TICKETS</Text>
        </View>
      ) : tickets.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.muted}>NO TICKETS YET</Text>
          <Text style={styles.hint}>Buy entry from a store or skatepark&apos;s page.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.primary} />}
        >
          {tickets.map((ticket) => (
            <TicketCard key={ticket.ticketId} ticket={ticket} />
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
  headerText: { flex: 1, gap: 2 },
  heading: { fontFamily: F.heading, fontSize: 20, color: C.text, letterSpacing: 2 },
  subheading: { fontFamily: F.monoRegular, fontSize: 13, color: C.muted, letterSpacing: 0.5 },
  list: { padding: 16, gap: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8, paddingHorizontal: 24 },
  muted: { fontFamily: F.mono, fontSize: 11, color: C.muted, letterSpacing: 2, textAlign: "center" },
  hint: { fontFamily: F.body, fontSize: 13, color: C.muted },
});
