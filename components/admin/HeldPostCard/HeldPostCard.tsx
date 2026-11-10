import { useState } from "react";
import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useHeldMediaUrl } from "@/lib/admin/hooks/useHeldMediaUrl";
import { useHeldVideoPreview } from "@/lib/admin/hooks/useHeldVideoPreview";
import type { HeldPostItem, HeldPostMedia } from "@/lib/admin/types";
import { C } from "@/lib/theme";
import { PostVideo } from "@/components/posts/PostVideo";
import { styles } from "./HeldPostCard.styles";

type Props = {
  item: HeldPostItem;
  onApprove: (postId: string) => void;
  onRemove: (postId: string) => void;
  onSuspectedCsam: (postId: string) => void;
  isBusy: boolean;
};

const HOLD_REASON_LABELS: Record<string, string> = {
  nudity: "NUDITY DETECTED",
  gore: "GORE DETECTED",
  reports: "REPORTED BY USERS",
  reported_child_sexual_abuse: "REPORTED: CHILD SEXUAL ABUSE",
};

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// Blurred until the reviewer explicitly reveals it, to limit exposure
// (md/media_posts.md §8). Revealing one image doesn't reveal the others.
function HeldMediaTile({ media }: { media: HeldPostMedia }) {
  const [isRevealed, setIsRevealed] = useState(false);
  const { data: url, isLoading, isError } = useHeldMediaUrl(media);

  if (isLoading) {
    return (
      <View style={styles.mediaTile}>
        <ActivityIndicator color={C.primary} />
      </View>
    );
  }
  if (isError || !url) {
    return (
      <View style={styles.mediaTile}>
        <Text style={styles.mediaError}>MEDIA UNAVAILABLE</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.mediaTile}
      onPress={() => setIsRevealed((v) => !v)}
      activeOpacity={0.9}
      accessibilityLabel={isRevealed ? "Hide media" : "Reveal media"}
    >
      <Image source={{ uri: url }} style={styles.mediaImage} resizeMode="cover" blurRadius={isRevealed ? 0 : 60} />
      {!isRevealed && (
        <View style={styles.revealOverlay}>
          <Ionicons name="eye-off-outline" size={18} color={C.text} />
          <Text style={styles.revealText}>TAP TO REVEAL</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// A held video: blurred signed thumbnail until revealed, then it plays
// (muted to start -- tap the speaker for sound).
function HeldVideoTile({ postId }: { postId: string }) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const { data: preview, isLoading, isError } = useHeldVideoPreview(postId);

  if (isLoading) {
    return (
      <View style={styles.videoTile}>
        <ActivityIndicator color={C.primary} />
      </View>
    );
  }
  if (isError || !preview) {
    return (
      <View style={styles.videoTile}>
        <Text style={styles.mediaError}>VIDEO UNAVAILABLE</Text>
      </View>
    );
  }

  if (!isRevealed) {
    return (
      <TouchableOpacity
        style={styles.videoTile}
        onPress={() => setIsRevealed(true)}
        activeOpacity={0.9}
        accessibilityLabel="Reveal video"
      >
        <Image source={{ uri: preview.thumbnailUrl }} style={styles.mediaImage} resizeMode="cover" blurRadius={60} />
        <View style={styles.revealOverlay}>
          <Ionicons name="eye-off-outline" size={18} color={C.text} />
          <Text style={styles.revealText}>TAP TO REVEAL</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.videoTile}>
      <PostVideo uri={preview.hlsUrl} isActive isMuted={isMuted} />
      <View style={styles.videoControls}>
        <TouchableOpacity onPress={() => setIsMuted((m) => !m)} hitSlop={8} accessibilityLabel={isMuted ? "Sound on" : "Sound off"}>
          <Ionicons name={isMuted ? "volume-mute" : "volume-high"} size={18} color={C.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setIsRevealed(false)} hitSlop={8} accessibilityLabel="Hide video">
          <Ionicons name="eye-off-outline" size={18} color={C.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function HeldPostCard({ item, onApprove, onRemove, onSuspectedCsam, isBusy }: Props) {
  const reasonLabel = item.holdReason ? HOLD_REASON_LABELS[item.holdReason] ?? item.holdReason.toUpperCase() : "HELD";

  return (
    <View style={[styles.card, item.isUrgent && styles.cardUrgent]}>
      <View style={styles.headerRow}>
        {item.isUrgent && (
          <View style={styles.urgentBadge}>
            <Text style={styles.urgentText}>URGENT</Text>
          </View>
        )}
        <Text style={styles.reason}>{reasonLabel}</Text>
      </View>

      {item.mediaType === "video" ? (
        <HeldVideoTile postId={item.postId} />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaRow}>
          {item.media.map((m) => (
            <HeldMediaTile key={m.mediaId} media={m} />
          ))}
        </ScrollView>
      )}

      <View style={styles.textColumn}>
        <Text style={styles.meta}>@{item.username.toUpperCase()} · {formatDate(item.createdAt)}</Text>
        {item.reportCount > 0 && (
          <Text style={styles.meta}>
            {item.reportCount} REPORT{item.reportCount === 1 ? "" : "S"} · {item.reportReasons.join(", ").toUpperCase()}
          </Text>
        )}
        {item.caption ? <Text style={styles.caption}>{item.caption}</Text> : null}
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.approveBtn} onPress={() => onApprove(item.postId)} disabled={isBusy} activeOpacity={0.85}>
          <Text style={styles.approveText}>APPROVE</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.removeBtn} onPress={() => onRemove(item.postId)} disabled={isBusy} activeOpacity={0.85}>
          <Text style={styles.removeText}>REMOVE</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.csamBtn} onPress={() => onSuspectedCsam(item.postId)} disabled={isBusy} activeOpacity={0.85}>
        <Ionicons name="warning-outline" size={14} color={C.onTapeRed} />
        <Text style={styles.csamText}>SUSPECTED CSAM</Text>
      </TouchableOpacity>
    </View>
  );
}
