import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ReportReasonSheet } from "@/components/common/ReportReasonSheet";
import { REVIEW_REPORT_REASONS, ReviewReportReason } from "@/lib/shared/types";
import { C } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import { styles } from "./ReviewCard.styles";

export type ReviewableCard = {
  review_id: string;
  profile_id: string;
  heading: string;
  is_verified: boolean;
  upvote_count: number;
  rating: number | null;
  comment: string;
  created_at: string;
  profiles: { username: string; display_name: string | null };
};

type Props = {
  review: ReviewableCard;
  isVoted: boolean;
  accent: string;
  onUpvote: (reviewId: string) => void;
  currentUserId: string | null;
  hasReported: boolean;
  onReport: (reviewId: string, reason: ReviewReportReason) => void;
  onDelete: (reviewId: string) => void;
};

export function ReviewCard({
  review,
  isVoted,
  accent,
  onUpvote,
  currentUserId,
  hasReported,
  onReport,
  onDelete,
}: Props) {
  const [showReportReasons, setShowReportReasons] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isOwner = currentUserId != null && review.profile_id === currentUserId;

  function handleSelectReportReason(reason: string) {
    setShowReportReasons(false);
    onReport(review.review_id, reason as ReviewReportReason);
  }

  function handleConfirmDelete() {
    setShowDeleteConfirm(false);
    onDelete(review.review_id);
  }

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.heading}>{review.heading}</Text>
        {!review.is_verified && (
          <View style={styles.needsVotesBadge}>
            <Text style={styles.needsVotesText}>NEEDS VOTES {review.upvote_count}/3</Text>
          </View>
        )}
      </View>

      {review.rating != null && (
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Ionicons
              key={i}
              name={i <= Math.round(review.rating!) ? "star" : "star-outline"}
              size={14}
              color={i <= Math.round(review.rating!) ? accent : C.borderVariant}
            />
          ))}
        </View>
      )}

      <Text style={styles.comment}>{review.comment}</Text>

      <View style={styles.metaRow}>
        <Text style={styles.author}>
          {review.profiles.display_name ?? review.profiles.username}
        </Text>
        <View style={styles.metaRight}>
          <Text style={styles.date}>
            {new Date(review.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </Text>

          {isOwner ? (
            <TouchableOpacity onPress={() => setShowDeleteConfirm(true)} style={styles.iconBtn} hitSlop={8}>
              <Ionicons name="trash-outline" size={15} color={C.error} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => !hasReported && setShowReportReasons(true)}
              disabled={hasReported}
              style={styles.iconBtn}
              hitSlop={8}
            >
              <Ionicons
                name={hasReported ? "flag" : "flag-outline"}
                size={15}
                color={hasReported ? C.muted : C.textVariant}
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => onUpvote(review.review_id)}
            style={styles.upvoteBtn}
            hitSlop={8}
            activeOpacity={0.75}
          >
            <Ionicons
              name={isVoted ? "arrow-up-circle" : "arrow-up-circle-outline"}
              size={18}
              color={isVoted ? accent : C.muted}
            />
            <Text style={[styles.upvoteCount, isVoted && { color: accent }]}>
              {review.upvote_count}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={showReportReasons}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReportReasons(false)}
      >
        <ReportReasonSheet
          title="WHY ARE YOU REPORTING THIS REVIEW?"
          reasons={REVIEW_REPORT_REASONS}
          onSelect={handleSelectReportReason}
          onCancel={() => setShowReportReasons(false)}
        />
      </Modal>

      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Delete this review?"
        message="This can't be undone."
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </View>
  );
}
