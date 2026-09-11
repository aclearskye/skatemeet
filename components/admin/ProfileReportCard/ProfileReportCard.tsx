import { Text, TouchableOpacity, View } from "react-native";
import type { ProfileReportItem } from "@/lib/admin/types";
import { styles } from "./ProfileReportCard.styles";

type Props = {
  item: ProfileReportItem;
  onDismiss: (profileId: string) => void;
  onBan: (item: ProfileReportItem) => void;
  isBusy: boolean;
};

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ProfileReportCard({ item, onDismiss, onBan, isBusy }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.textColumn}>
        <Text style={styles.username}>@{item.username}</Text>
        {item.displayName && <Text style={styles.displayName}>{item.displayName}</Text>}
        <Text style={styles.meta}>
          {item.reportCount} REPORT{item.reportCount === 1 ? "" : "S"} · {item.reasons.join(", ").toUpperCase()}
        </Text>
        <Text style={styles.meta}>SINCE {formatDate(item.oldestReportAt)}</Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.dismissBtn}
          onPress={() => onDismiss(item.profileId)}
          activeOpacity={0.75}
          disabled={isBusy}
        >
          <Text style={styles.dismissText}>DISMISS</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.banBtn}
          onPress={() => onBan(item)}
          activeOpacity={0.85}
          disabled={isBusy}
        >
          <Text style={styles.banText}>BAN USER</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
