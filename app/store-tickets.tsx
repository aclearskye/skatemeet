import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "@/lib/shared/keyboard";
import { useMyStorePage } from "@/lib/storeAccounts/hooks/useMyStorePage";
import { useMyTicketTypes } from "@/lib/tickets/hooks/useMyTicketTypes";
import { useMyTicketing } from "@/lib/tickets/hooks/useMyTicketing";
import { useSetTicketTypeActive } from "@/lib/tickets/hooks/useSetTicketTypeActive";
import type { OwnTicketType } from "@/lib/tickets/types";
import { C, F } from "@/lib/theme";
import { BackButton } from "@/components/common/BackButton";
import { StorePrimaryButton } from "@/components/storeAccount/StorePrimaryButton";
import { TicketTypeForm } from "@/components/tickets/TicketTypeForm";
import { TicketTypeRow } from "@/components/tickets/TicketTypeRow";

// "new" opens an empty form; a ticket opens it to edit that ticket.
type Editing = OwnTicketType | "new" | null;

// A store's entry tickets (sessions and passes), from the page editor's
// Tickets card. Ticket types are taken off sale, never deleted.
export default function StoreTicketsScreen() {
  const insets = useSafeAreaInsets();
  const { data: page } = useMyStorePage();
  const { data: ticketing } = useMyTicketing();
  const { data: types = [], isLoading, isError, refetch } = useMyTicketTypes();
  const setActive = useSetTicketTypeActive();
  const [editing, setEditing] = useState<Editing>(null);

  const canEdit = (page?.canEdit ?? false) && (ticketing?.chargesEnabled ?? false);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <BackButton />
        <View style={styles.headerText}>
          <Text style={styles.heading}>TICKETS</Text>
          <Text style={styles.subheading}>{"// sessions and passes"}</Text>
        </View>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        {!canEdit ? (
          <Text style={styles.error}>
            {ticketing?.chargesEnabled
              ? "Ticket editing is paused until your subscription is paid."
              : "Finish setting up Stripe on your store page before adding tickets."}
          </Text>
        ) : null}

        {editing ? (
          <TicketTypeForm
            key={editing === "new" ? "new" : editing.ticketTypeId}
            ticketType={editing === "new" ? null : editing}
            onDone={() => setEditing(null)}
          />
        ) : (
          <StorePrimaryButton label="ADD A TICKET" onPress={() => setEditing("new")} disabled={!canEdit} />
        )}

        {isLoading ? (
          <ActivityIndicator color={C.primary} style={styles.loading} />
        ) : isError ? (
          <View style={styles.centered}>
            <Text style={styles.muted}>COULDN&apos;T LOAD YOUR TICKETS</Text>
            <StorePrimaryButton label="TRY AGAIN" variant="secondary" onPress={() => refetch()} />
          </View>
        ) : types.length === 0 ? (
          <Text style={styles.hint}>No tickets yet. Add a session (e.g. Saturday free skate) or a pass.</Text>
        ) : (
          types.map((type) => (
            <TicketTypeRow
              key={type.ticketTypeId}
              ticketType={type}
              disabled={!canEdit}
              onEdit={() => setEditing(type)}
              onToggleActive={(active) => setActive.mutate({ ticketTypeId: type.ticketTypeId, active })}
            />
          ))
        )}
        {setActive.isError ? <Text style={styles.error}>Couldn&apos;t change that ticket. Try again.</Text> : null}
      </KeyboardAwareScrollView>
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
  list: { padding: 16, gap: 12 },
  loading: { paddingVertical: 24 },
  centered: { alignItems: "center", gap: 8, paddingVertical: 24 },
  muted: { fontFamily: F.mono, fontSize: 11, color: C.muted, letterSpacing: 2, textAlign: "center" },
  hint: { fontFamily: F.body, fontSize: 13, color: C.muted },
  error: { fontFamily: F.body, fontSize: 13, color: C.error },
});
