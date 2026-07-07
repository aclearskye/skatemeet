import { VoteButton } from "@/components/common/VoteButton";
import { C, F } from "@/lib/theme";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  count: number;
  hasVoted: boolean;
  onPress: () => void;
  isLoading: boolean;
};

export function StoreVoteSection({ count, hasVoted, onPress, isLoading }: Props) {
  return (
    <View style={styles.voteSection}>
      <Text style={styles.voteLabel}>COMMUNITY VOTES</Text>
      <VoteButton
        count={count}
        hasVoted={hasVoted}
        accent={C.secondary}
        onAccent={C.onSecondary}
        onPress={onPress}
        isLoading={isLoading}
        variant="full"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  voteSection: { gap: 10, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.border },
  voteLabel: { fontFamily: F.mono, fontSize: 10, color: C.muted, letterSpacing: 2 },
});
