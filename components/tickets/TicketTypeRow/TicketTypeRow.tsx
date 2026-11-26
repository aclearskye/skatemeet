import { Switch, Text, TouchableOpacity, View } from "react-native";
import { formatTicketPrice, isTicketExpired, ticketValidityLabel, type OwnTicketType } from "@/lib/tickets/types";
import { C } from "@/lib/theme";
import { styles } from "./TicketTypeRow.styles";

type Props = {
  ticketType: OwnTicketType;
  onEdit: () => void;
  onToggleActive: (active: boolean) => void;
  disabled: boolean;
};

// One of the store's ticket types, with its on-sale switch.
export function TicketTypeRow({ ticketType, onEdit, onToggleActive, disabled }: Props) {
  const expired = isTicketExpired(ticketType);
  const sold = `${ticketType.soldCount} sold`;

  return (
    <View style={[styles.row, !ticketType.isActive && styles.inactive]}>
      <TouchableOpacity style={styles.text} onPress={onEdit} disabled={disabled} activeOpacity={0.7}>
        <Text style={styles.name}>{ticketType.name}</Text>
        <Text style={styles.detail}>{ticketValidityLabel(ticketType)}</Text>
        <Text style={styles.price}>
          {formatTicketPrice(ticketType.priceMinor, ticketType.currency)} · {sold}
          {expired ? " · ENDED" : ""}
        </Text>
        <Text style={styles.edit}>EDIT</Text>
      </TouchableOpacity>
      <View style={styles.toggle}>
        <Switch
          value={ticketType.isActive}
          onValueChange={onToggleActive}
          disabled={disabled}
          trackColor={{ true: C.primary, false: C.borderVariant }}
          accessibilityLabel={ticketType.isActive ? "On sale" : "Off sale"}
        />
        <Text style={styles.toggleLabel}>{ticketType.isActive ? "ON SALE" : "OFF SALE"}</Text>
      </View>
    </View>
  );
}
