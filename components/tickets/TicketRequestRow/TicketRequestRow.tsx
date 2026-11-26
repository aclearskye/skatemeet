import { Text, View } from "react-native";
import type { StoreTicketRequest } from "@/lib/tickets/requestTypes";
import { formatTicketPrice } from "@/lib/tickets/types";
import { C } from "@/lib/theme";
import { TapeChip } from "@/components/common/TapeChip";
import { SpotChatAvatar } from "@/components/spotChat/SpotChatAvatar";
import { StorePrimaryButton } from "@/components/storeAccount/StorePrimaryButton";
import { styles } from "./TicketRequestRow.styles";

type Props = {
  request: StoreTicketRequest;
  onApprove: () => void;
  onDecline: () => void;
  isBusy: boolean;
};

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

// One open refund or swap request on the store's Requests screen.
export function TicketRequestRow({ request, onApprove, onDecline, isBusy }: Props) {
  const price = formatTicketPrice(request.priceMinor, request.currency);
  const ask =
    request.kind === "refund"
      ? `Wants a refund of ${price} for ${request.ticketName}.`
      : `Wants to swap ${request.ticketName} (${price}) for ${request.swapName} (${formatTicketPrice(request.swapPriceMinor ?? 0, request.currency)}).`;

  return (
    <View style={styles.card}>
      <View style={styles.skater}>
        <SpotChatAvatar name={request.skater.displayName} avatarUrl={request.skater.avatarUrl} size={40} />
        <View style={styles.skaterText}>
          <Text style={styles.name} numberOfLines={1}>
            {request.skater.displayName}
          </Text>
          {request.skater.username ? <Text style={styles.muted}>@{request.skater.username}</Text> : null}
        </View>
        {request.skater.under18 ? <TapeChip text="U18" colors={{ bg: C.tapeOrange, fg: C.onTapeOrange }} size="sm" /> : null}
      </View>
      <Text style={styles.ask}>{ask}</Text>
      <Text style={styles.muted}>
        Bought {shortDate(request.paidAt)}, never used. Asked {shortDate(request.createdAt)}.
      </Text>
      {request.kind === "refund" ? (
        <Text style={styles.muted}>Refunds go back to their card from your Stripe account. Stripe keeps its fee.</Text>
      ) : null}
      <View style={styles.buttons}>
        <View style={styles.button}>
          <StorePrimaryButton label="DECLINE" variant="secondary" onPress={onDecline} disabled={isBusy} />
        </View>
        <View style={styles.button}>
          <StorePrimaryButton
            label={request.kind === "refund" ? "REFUND" : "SWAP"}
            onPress={onApprove}
            isBusy={isBusy}
          />
        </View>
      </View>
    </View>
  );
}
