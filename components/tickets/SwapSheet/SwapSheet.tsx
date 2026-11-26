import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSwapOptions } from "@/lib/tickets/hooks/useSwapOptions";
import { formatTicketPrice, ticketValidityLabel, type MyTicket, type TicketType } from "@/lib/tickets/types";
import { C } from "@/lib/theme";
import { StorePrimaryButton } from "@/components/storeAccount/StorePrimaryButton";
import { styles } from "./SwapSheet.styles";

type Props = {
  // Null hides the sheet.
  ticket: MyTicket | null;
  onPick: (option: TicketType) => void;
  onClose: () => void;
};

// The tickets an unused one can be swapped for at the same store: on sale
// at exactly the same price.
export function SwapSheet({ ticket, onPick, onClose }: Props) {
  const options = useSwapOptions(ticket?.ticketId ?? null);
  const items = options.data ?? [];

  return (
    <Modal visible={ticket != null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close">
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>SWAP FOR</Text>
          <Text style={styles.hint}>
            Pick another ticket at {ticket?.storeName ?? "this store"} at the same price. The store approves the swap.
          </Text>
          {options.isLoading ? (
            <ActivityIndicator color={C.primary} style={styles.loading} />
          ) : items.length === 0 ? (
            <Text style={styles.hint}>Nothing to swap to right now.</Text>
          ) : (
            <ScrollView style={styles.list}>
              {items.map((option) => (
                <TouchableOpacity
                  key={option.ticketTypeId}
                  style={styles.option}
                  onPress={() => onPick(option)}
                  activeOpacity={0.8}
                >
                  <View style={styles.optionText}>
                    <Text style={styles.name}>{option.name}</Text>
                    <Text style={styles.hint}>{ticketValidityLabel(option)}</Text>
                  </View>
                  <Text style={styles.price}>{formatTicketPrice(option.priceMinor, option.currency)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          <StorePrimaryButton label="CANCEL" variant="secondary" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
