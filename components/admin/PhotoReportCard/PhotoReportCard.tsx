import { useState } from "react";
import { Image, Modal, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { PhotoReportItem, ReportResolution } from "@/lib/admin/types";
import { C } from "@/lib/theme";
import { styles } from "./PhotoReportCard.styles";

type Props = {
  item: PhotoReportItem;
  onResolve: (photoId: string, resolution: ReportResolution) => void;
  isBusy: boolean;
};

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PhotoReportCard({ item, onResolve, isBusy }: Props) {
  const insets = useSafeAreaInsets();
  const [isEnlarged, setIsEnlarged] = useState(false);

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={() => setIsEnlarged(true)} activeOpacity={0.9} style={styles.photoWrap}>
        <Image source={{ uri: item.mediaUrl }} style={styles.photo} resizeMode="cover" />
        <View style={styles.enlargeHint}>
          <Ionicons name="expand-outline" size={14} color={C.text} />
          <Text style={styles.enlargeHintText}>TAP TO ENLARGE</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.textColumn}>
        <Text style={styles.entityBadge}>{item.entityKind.toUpperCase()} PHOTO</Text>
        <Text style={styles.meta}>
          {item.reportCount} REPORT{item.reportCount === 1 ? "" : "S"} · {item.reasons.join(", ").toUpperCase()}
        </Text>
        <Text style={styles.meta}>SINCE {formatDate(item.oldestReportAt)}</Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.dismissBtn}
          onPress={() => onResolve(item.photoId, "dismissed")}
          activeOpacity={0.75}
          disabled={isBusy}
        >
          <Text style={styles.dismissText}>DISMISS</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={() => onResolve(item.photoId, "content_removed")}
          activeOpacity={0.85}
          disabled={isBusy}
        >
          <Text style={styles.removeText}>REMOVE PHOTO</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={isEnlarged} animationType="fade" onRequestClose={() => setIsEnlarged(false)}>
        <View style={styles.lightboxRoot}>
          <Image source={{ uri: item.mediaUrl }} style={styles.lightboxImage} resizeMode="contain" />
          <TouchableOpacity
            style={[styles.lightboxCloseBtn, { top: insets.top + 12 }]}
            onPress={() => setIsEnlarged(false)}
            hitSlop={12}
          >
            <Ionicons name="close" size={24} color={C.text} />
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}
