import { Modal, Pressable, Text, TouchableOpacity } from "react-native";
import type { MyTicket } from "@/lib/tickets/types";
import { TicketCard } from "@/components/tickets/TicketCard";
import { styles } from "./TicketQrModal.styles";

type Props = {
  // Null hides the modal.
  ticket: MyTicket | null;
  onClose: () => void;
};

// A bought ticket's QR code over the store page, so a skater at the till
// doesn't have to go to My tickets.
export function TicketQrModal({ ticket, onClose }: Props) {
  return (
    <Modal visible={ticket != null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close">
        {/* Taps on the card itself don't close it. */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          {ticket ? <TicketCard ticket={ticket} /> : null}
          <TouchableOpacity style={styles.close} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.closeText}>CLOSE</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
