import { ReportReasonSheet } from "@/components/common/ReportReasonSheet";
import { EntityPhoto, PhotoReportReason } from "@/lib/shared/types";
import { C } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { styles } from "./EntityPhotoViewerModal.styles";

type Props = {
  visible: boolean;
  onClose: () => void;
  photos: EntityPhoto[];
  isLoadingPhotos: boolean;
  currentUserId: string | null;
  voteStatuses: Record<string, 1 | -1>;
  reportStatuses: Record<string, boolean>;
  onVote: (photoId: string, voteValue: 1 | -1) => void;
  onReport: (photoId: string, reason: PhotoReportReason) => void;
  isReporting: boolean;
  onDelete: (photoId: string) => void;
  isDeleting: boolean;
  accent: string;
};

export function EntityPhotoViewerModal({
  visible,
  onClose,
  photos,
  isLoadingPhotos,
  currentUserId,
  voteStatuses,
  reportStatuses,
  onVote,
  onReport,
  isReporting,
  onDelete,
  isDeleting,
  accent,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [showReportReasons, setShowReportReasons] = useState(false);

  useEffect(() => {
    if (visible) {
      setIndex(0);
      setShowReportReasons(false);
    }
  }, [visible]);

  useEffect(() => {
    // Only auto-close once we know for sure there are no photos — while the
    // first fetch is still in flight, photos is [] too, but that's not the
    // same thing as "this entity has no photos".
    if (visible && !isLoadingPhotos && photos.length === 0) onClose();
  }, [visible, isLoadingPhotos, photos.length, onClose]);

  if (photos.length === 0) {
    if (!isLoadingPhotos) return null;
    return (
      <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
        <View style={[styles.root, styles.centered]}>
          <ActivityIndicator color={C.text} />
        </View>
      </Modal>
    );
  }
  const photo = photos[Math.min(index, photos.length - 1)];
  const vote = voteStatuses[photo.photo_id];
  const hasReported = reportStatuses[photo.photo_id] ?? false;
  const isOwner = currentUserId != null && photo.profile_id === currentUserId;

  function handleScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const nextIndex = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(nextIndex);
  }

  function handleReportPress() {
    if (hasReported) return;
    setShowReportReasons(true);
  }

  function handleSelectReportReason(reason: PhotoReportReason) {
    setShowReportReasons(false);
    onReport(photo.photo_id, reason);
  }

  function handleDeletePress() {
    Alert.alert("Delete this photo?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => onDelete(photo.photo_id) },
    ]);
  }

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <FlatList
          data={photos}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(p) => p.photo_id}
          onMomentumScrollEnd={handleScrollEnd}
          renderItem={({ item }) => (
            <View style={[styles.page, { width }]}>
              <Image source={{ uri: item.media_url }} style={styles.image} contentFit="contain" />
            </View>
          )}
        />

        <TouchableOpacity
          style={[styles.closeBtn, { top: insets.top + 12 }]}
          onPress={onClose}
          hitSlop={12}
        >
          <Ionicons name="close" size={22} color={C.text} />
        </TouchableOpacity>

        {photos.length > 1 && (
          <View style={[styles.counter, { top: insets.top + 16 }]}>
            <Text style={styles.counterText}>
              {index + 1} / {photos.length}
            </Text>
          </View>
        )}

        <View style={[styles.actionBar, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onVote(photo.photo_id, 1)}
            hitSlop={8}
          >
            <Ionicons
              name={vote === 1 ? "arrow-up-circle" : "arrow-up-circle-outline"}
              size={26}
              color={vote === 1 ? accent : C.text}
            />
            <Text style={styles.actionCount}>{photo.upvote_count}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onVote(photo.photo_id, -1)}
            hitSlop={8}
          >
            <Ionicons
              name={vote === -1 ? "arrow-down-circle" : "arrow-down-circle-outline"}
              size={26}
              color={vote === -1 ? C.error : C.text}
            />
            <Text style={styles.actionCount}>{photo.downvote_count}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleReportPress}
            disabled={hasReported || isReporting}
            hitSlop={8}
          >
            <Ionicons
              name={hasReported ? "flag" : "flag-outline"}
              size={22}
              color={hasReported ? C.muted : C.text}
            />
            <Text style={[styles.actionLabel, hasReported && { color: C.muted }]}>
              {hasReported ? "REPORTED" : "REPORT"}
            </Text>
          </TouchableOpacity>

          {isOwner && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleDeletePress}
              disabled={isDeleting}
              hitSlop={8}
            >
              <Ionicons name="trash-outline" size={22} color={C.error} />
              <Text style={[styles.actionLabel, { color: C.error }]}>DELETE</Text>
            </TouchableOpacity>
          )}
        </View>

        {showReportReasons && (
          <ReportReasonSheet
            onSelect={handleSelectReportReason}
            onCancel={() => setShowReportReasons(false)}
          />
        )}
      </View>
    </Modal>
  );
}
