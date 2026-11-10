import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { EntityRef } from "@/lib/checkins/types";
import { useCheckIn } from "@/lib/shared/hooks/useCheckIn";
import { C } from "@/lib/theme";
import { styles } from "./EntityActionBar.styles";

type Vote = {
  count: number;
  hasVoted: boolean;
  isLoading: boolean;
  onPress: () => void;
};

type Props = {
  entityRef: EntityRef;
  accent: string;
  onAccent: string;
  onDirections: () => void;
  vote: Vote;
  // Unverified user spots: votes still needed to verify. null hides it.
  votesToVerify?: number | null;
};

function liveCountLabel(count: number | null): string | null {
  if (count == null) return null;
  if (count === 0) return "NOBODY HERE YET";
  return count === 1 ? "1 SKATING NOW" : `${count} SKATING NOW`;
}

// The detail page's one row of CTAs, widest first: directions, check in,
// upvote. Live count and the verify hint sit on a thin line above it.
export function EntityActionBar({ entityRef, accent, onAccent, onDirections, vote, votesToVerify }: Props) {
  const { liveCount, isCheckedInHere, isLoadingStatus, errorMessage, isSubmitting, toggle } =
    useCheckIn(entityRef);
  const liveLabel = liveCountLabel(liveCount);
  const verifyLabel =
    votesToVerify != null && votesToVerify > 0
      ? `${votesToVerify} MORE ${votesToVerify === 1 ? "VOTE" : "VOTES"} TO VERIFY`
      : null;

  // Both are solid until used, then drop to an outline: check in reads as
  // the call to action, check out as the quieter undo.
  const checkInFg = isCheckedInHere ? accent : onAccent;
  const voteFg = vote.hasVoted ? C.secondary : C.onSecondary;

  return (
    <View style={styles.container}>
      {(liveLabel || verifyLabel) && (
        <View style={styles.meta}>
          <Text style={[styles.metaText, { color: accent }]}>{liveLabel}</Text>
          <Text style={styles.metaText}>{verifyLabel}</Text>
        </View>
      )}

      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.btn, styles.directions, { backgroundColor: accent, borderColor: accent }]}
          onPress={onDirections}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Get directions"
        >
          <Ionicons name="navigate-outline" size={15} color={onAccent} />
          <Text style={[styles.btnText, { color: onAccent }]} numberOfLines={1}>
            GET DIRECTIONS
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.btn,
            styles.checkIn,
            { borderColor: accent },
            !isCheckedInHere && { backgroundColor: accent },
          ]}
          onPress={toggle}
          disabled={isLoadingStatus || isSubmitting}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityState={{ busy: isSubmitting }}
          accessibilityLabel={isCheckedInHere ? "Check out" : "Check in"}
          accessibilityHint={isCheckedInHere ? "You're checked in here" : undefined}
        >
          {isSubmitting ? (
            <ActivityIndicator color={checkInFg} size="small" />
          ) : (
            <Text style={[styles.btnText, { color: checkInFg }]} numberOfLines={1}>
              {isCheckedInHere ? "CHECK OUT" : "CHECK IN"}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.btn,
            styles.vote,
            !vote.hasVoted && styles.voteFilled,
          ]}
          onPress={vote.onPress}
          disabled={vote.isLoading}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityState={{ selected: vote.hasVoted, busy: vote.isLoading }}
          accessibilityLabel={`${vote.hasVoted ? "Upvoted" : "Upvote"}, ${vote.count} votes`}
        >
          {vote.isLoading ? (
            <ActivityIndicator color={voteFg} size="small" />
          ) : (
            <>
              <Ionicons name="arrow-up" size={15} color={voteFg} />
              <Text style={[styles.btnText, { color: voteFg }]} numberOfLines={1}>
                {vote.count}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {errorMessage != null && <Text style={styles.error}>{errorMessage}</Text>}
    </View>
  );
}
