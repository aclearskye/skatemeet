import { ReviewableCard, ReviewCard } from "@/components/common/ReviewCard";
import { ReviewInteractions } from "@/lib/shared/types";
import { C } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { styles } from "./ReviewsModal.styles";

type Props = {
  visible: boolean;
  onClose: () => void;
  reviews: ReviewableCard[];
  isLoading: boolean;
  interactions: ReviewInteractions;
  accent: string;
};

export function ReviewsModal({ visible, onClose, reviews, isLoading, interactions, accent }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.title}>REVIEWS</Text>
          <Text style={styles.count}>{reviews.length}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={12}>
            <Ionicons name="close" size={22} color={C.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={[styles.bodyContent, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <ActivityIndicator color={accent} style={{ marginVertical: 24 }} />
          ) : reviews.length === 0 ? (
            <Text style={styles.emptyText}>No reviews yet.</Text>
          ) : (
            reviews.map((review) => (
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
        </ScrollView>
      </View>
    </Modal>
  );
}
