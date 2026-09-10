import { ReviewCard } from "@/components/common/ReviewCard";
import { SpotReviewWithProfile } from "@/lib/spots/types";
import { ReviewInteractions } from "@/lib/shared/types";
import { C, F } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  reviews: SpotReviewWithProfile[];
  isLoading: boolean;
  interactions: ReviewInteractions;
  accent: string;
  onAccent: string;
  onAddReview: () => void;
  onSeeMore: () => void;
};

export function SpotReviews({
  reviews,
  isLoading,
  interactions,
  accent,
  onAccent,
  onAddReview,
  onSeeMore,
}: Props) {
  const topReviews = reviews.slice(0, 3);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>REVIEWS</Text>
        {reviews.length > 3 && (
          <TouchableOpacity onPress={onSeeMore} hitSlop={8}>
            <Text style={[styles.seeMore, { color: accent }]}>{"// see more..."}</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator color={accent} style={{ marginVertical: 20 }} />
      ) : topReviews.length === 0 ? (
        <Text style={styles.emptyText}>No reviews yet. Add one to share what you know.</Text>
      ) : (
        topReviews.map((review) => (
          <ReviewCard
            key={review.review_id}
            review={review}
            isVoted={!!interactions.reviewVotes[review.review_id]}
            accent={accent}
            onUpvote={interactions.onUpvote}
            currentUserId={interactions.currentUserId}
            hasReported={!!interactions.reportStatuses[review.review_id]}
            onReport={interactions.onReport}
            onDelete={interactions.onDelete}
          />
        ))
      )}

      <TouchableOpacity
        style={[styles.addReviewBtn, { backgroundColor: accent }]}
        onPress={onAddReview}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={16} color={onAccent} />
        <Text style={[styles.addReviewBtnText, { color: onAccent }]}>ADD REVIEW</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingTop: 14, borderTopWidth: 1, borderTopColor: C.borderVariant, gap: 10 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionLabel: { fontFamily: F.mono, fontSize: 10, color: C.muted, letterSpacing: 2 },
  seeMore: { fontFamily: F.mono, fontSize: 11, letterSpacing: 0.5 },
  emptyText: {
    fontFamily: F.body,
    fontSize: 14,
    color: C.muted,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 16,
  },
  addReviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    marginTop: 4,
  },
  addReviewBtnText: { fontFamily: F.mono, fontSize: 12, letterSpacing: 1 },
});
