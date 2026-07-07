import { C, F } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export type ReviewableCard = {
  card_id: string;
  heading: string;
  is_verified: boolean;
  upvote_count: number;
  rating: number | null;
  comment: string;
  created_at: string;
  profiles: { username: string; display_name: string | null };
};

type Props = {
  card: ReviewableCard;
  isVoted: boolean;
  accent: string;
  onUpvote: (cardId: string) => void;
};

export function ReviewCard({ card, isVoted, accent, onUpvote }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.heading}>{card.heading}</Text>
        {!card.is_verified && (
          <View style={styles.needsVotesBadge}>
            <Text style={styles.needsVotesText}>NEEDS VOTES {card.upvote_count}/3</Text>
          </View>
        )}
      </View>

      {card.rating != null && (
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Ionicons
              key={i}
              name={i <= Math.round(card.rating!) ? "star" : "star-outline"}
              size={14}
              color={i <= Math.round(card.rating!) ? accent : C.border}
            />
          ))}
        </View>
      )}

      <Text style={styles.comment}>{card.comment}</Text>

      <View style={styles.metaRow}>
        <Text style={styles.author}>
          {card.profiles.display_name ?? card.profiles.username}
        </Text>
        <View style={styles.metaRight}>
          <Text style={styles.date}>
            {new Date(card.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </Text>
          <TouchableOpacity
            onPress={() => onUpvote(card.card_id)}
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
              {card.upvote_count}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    gap: 8,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  heading: {
    fontFamily: F.heading,
    fontSize: 16,
    color: C.text,
    letterSpacing: 0.3,
    flex: 1,
  },
  needsVotesBadge: {
    backgroundColor: C.surfaceHigh,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  needsVotesText: {
    fontFamily: F.mono,
    fontSize: 9,
    color: C.muted,
    letterSpacing: 1,
  },
  starsRow: { flexDirection: "row", gap: 3 },
  comment: {
    fontFamily: F.body,
    fontSize: 14,
    color: C.textVariant,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  metaRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  author: {
    fontFamily: F.monoRegular,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 0.5,
  },
  date: { fontFamily: F.monoRegular, fontSize: 10, color: C.muted },
  upvoteBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  upvoteCount: { fontFamily: F.mono, fontSize: 11, color: C.muted },
});
