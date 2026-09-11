import { Image, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { VerificationQueueItem } from "@/lib/admin/types";
import { C } from "@/lib/theme";
import { styles } from "./VerificationRequestCard.styles";

type Props = {
  item: VerificationQueueItem;
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
  isBusy: boolean;
};

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function VerificationRequestCard({ item, onApprove, onReject, isBusy }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {item.spotPhotoUrl ? (
          <Image source={{ uri: item.spotPhotoUrl }} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Ionicons name="image-outline" size={20} color={C.muted} />
          </View>
        )}
        <View style={styles.textColumn}>
          <Text style={styles.spotName} numberOfLines={1}>{item.spotName}</Text>
          <Text style={styles.meta}>
            REQUESTED BY @{item.requestedByUsername} · {formatDate(item.requestedAt)}
          </Text>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.rejectBtn}
          onPress={() => onReject(item.requestId)}
          activeOpacity={0.75}
          disabled={isBusy}
        >
          <Text style={styles.rejectText}>REJECT</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.approveBtn}
          onPress={() => onApprove(item.requestId)}
          activeOpacity={0.85}
          disabled={isBusy}
        >
          <Text style={styles.approveText}>APPROVE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
