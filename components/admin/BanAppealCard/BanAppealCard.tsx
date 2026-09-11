import { Text, TouchableOpacity, View } from "react-native";
import type { BanAppealItem } from "@/lib/admin/types";
import { styles } from "./BanAppealCard.styles";

type Props = {
  item: BanAppealItem;
  onDecision: (item: BanAppealItem, decision: "reinstated" | "denied") => void;
  isBusy: boolean;
};

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function BanAppealCard({ item, onDecision, isBusy }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.textColumn}>
        <Text style={styles.username}>@{item.username}</Text>
        <Text style={styles.meta}>
          BANNED {formatDate(item.bannedAt)} · {item.banReason.toUpperCase()}
        </Text>
        <Text style={styles.testimonyLabel}>APPEAL</Text>
        <Text style={styles.testimony}>{item.testimony}</Text>
        <Text style={styles.meta}>SUBMITTED {formatDate(item.submittedAt)}</Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.denyBtn}
          onPress={() => onDecision(item, "denied")}
          activeOpacity={0.75}
          disabled={isBusy}
        >
          <Text style={styles.denyText}>DENY</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.reinstateBtn}
          onPress={() => onDecision(item, "reinstated")}
          activeOpacity={0.85}
          disabled={isBusy}
        >
          <Text style={styles.reinstateText}>REINSTATE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
