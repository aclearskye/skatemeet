import { Text, View } from "react-native";
import { formatClockTime, type StoreCheckin } from "@/lib/tickets/scanTypes";
import { C } from "@/lib/theme";
import { TapeChip } from "@/components/common/TapeChip";
import { SpotChatAvatar } from "@/components/spotChat/SpotChatAvatar";
import { styles } from "./CheckinRow.styles";

type Props = {
  checkin: StoreCheckin;
  // The All tab spans days, so it shows the date too.
  showDate: boolean;
};

// One skater's entry in the store's check-in list.
export function CheckinRow({ checkin, showDate }: Props) {
  const { skater } = checkin;
  const when = showDate
    ? `${new Date(checkin.checkedInAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })} · ${formatClockTime(checkin.checkedInAt)}`
    : formatClockTime(checkin.checkedInAt);

  return (
    <View style={styles.row}>
      <SpotChatAvatar name={skater.displayName} avatarUrl={skater.avatarUrl} size={40} />
      <View style={styles.text}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {skater.displayName}
          </Text>
          {skater.under18 ? <TapeChip text="U18" colors={{ bg: C.tapeOrange, fg: C.onTapeOrange }} size="sm" /> : null}
        </View>
        <Text style={styles.detail} numberOfLines={1}>
          {skater.username ? `@${skater.username} · ` : ""}
          {checkin.ticketName}
        </Text>
      </View>
      <Text style={styles.time}>{when}</Text>
    </View>
  );
}
