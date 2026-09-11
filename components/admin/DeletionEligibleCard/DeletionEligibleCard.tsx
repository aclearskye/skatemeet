import { Text, TouchableOpacity, View } from "react-native";
import type { DeletionEligibleItem } from "@/lib/admin/types";
import { styles } from "./DeletionEligibleCard.styles";

type Props = {
  item: DeletionEligibleItem;
  onDelete: (item: DeletionEligibleItem) => void;
  isBusy: boolean;
};

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DeletionEligibleCard({ item, onDelete, isBusy }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.textColumn}>
        <Text style={styles.username}>@{item.username}</Text>
        {item.displayName && <Text style={styles.displayName}>{item.displayName}</Text>}
        <Text style={styles.meta}>
          BANNED {formatDate(item.bannedAt)} · {item.banReason.toUpperCase()}
        </Text>
        {item.eligibleSince !== item.bannedAt && (
          <Text style={styles.meta}>APPEAL DENIED {formatDate(item.eligibleSince)}</Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => onDelete(item)}
        activeOpacity={0.85}
        disabled={isBusy}
      >
        <Text style={styles.deleteText}>DELETE ALL DATA</Text>
      </TouchableOpacity>
    </View>
  );
}
