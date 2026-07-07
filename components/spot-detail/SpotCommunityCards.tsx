import { ReviewCard } from "@/components/common/ReviewCard";
import { SpotCardWithProfile } from "@/lib/spots/skateSpots";
import { C, F } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  cards: SpotCardWithProfile[];
  isLoading: boolean;
  cardVotes: Record<string, boolean>;
  accent: string;
  onAccent: string;
  onUpvote: (cardId: string) => void;
  onAddCard: () => void;
};

export function SpotCommunityCards({
  cards,
  isLoading,
  cardVotes,
  accent,
  onAccent,
  onUpvote,
  onAddCard,
}: Props) {
  return (
    <View style={styles.cardsSection}>
      <View style={styles.cardsSectionHeader}>
        <Text style={styles.sectionLabel}>COMMUNITY CARDS</Text>
        <Text style={styles.cardsCount}>{cards.length}</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={accent} style={{ marginVertical: 20 }} />
      ) : cards.length === 0 ? (
        <Text style={styles.emptyText}>No cards yet. Add one to share what you know.</Text>
      ) : (
        cards.map((card) => (
          <ReviewCard
            key={card.card_id}
            card={card}
            isVoted={!!cardVotes[card.card_id]}
            accent={accent}
            onUpvote={onUpvote}
          />
        ))
      )}

      <TouchableOpacity
        style={[styles.addCardBtn, { backgroundColor: accent }]}
        onPress={onAddCard}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={16} color={onAccent} />
        <Text style={[styles.addCardBtnText, { color: onAccent }]}>ADD CARD</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  cardsSection: { paddingTop: 14, borderTopWidth: 1, borderTopColor: C.border, gap: 10 },
  cardsSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionLabel: { fontFamily: F.mono, fontSize: 10, color: C.muted, letterSpacing: 2 },
  cardsCount: { fontFamily: F.mono, fontSize: 14, color: C.muted },
  emptyText: {
    fontFamily: F.body,
    fontSize: 14,
    color: C.muted,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 16,
  },
  addCardBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    marginTop: 4,
  },
  addCardBtnText: { fontFamily: F.mono, fontSize: 12, letterSpacing: 1 },
});
