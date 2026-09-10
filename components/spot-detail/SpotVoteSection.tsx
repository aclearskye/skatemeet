import { VoteButton } from "@/components/common/VoteButton";
import { C, F } from "@/lib/theme";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  count: number;
  hasVoted: boolean;
  accent: string;
  onAccent: string;
  onPress: () => void;
  isLoading: boolean;
  showVerifyHint: boolean;
};

export function SpotVoteSection({
  count,
  hasVoted,
  accent,
  onAccent,
  onPress,
  isLoading,
  showVerifyHint,
}: Props) {
  return (
    <View style={styles.voteSection}>
      <View style={styles.voteMeta}>
        <Text style={styles.voteLabel}>COMMUNITY VOTES</Text>
        {showVerifyHint && (
          <Text style={styles.voteHint}>{Math.max(0, 3 - count)} more to verify</Text>
        )}
      </View>
      <VoteButton
        count={count}
        hasVoted={hasVoted}
        accent={accent}
        onAccent={onAccent}
        onPress={onPress}
        isLoading={isLoading}
        variant="full"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  voteSection: { gap: 10, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.borderVariant },
  voteMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  voteLabel: { fontFamily: F.mono, fontSize: 10, color: C.muted, letterSpacing: 2 },
  voteHint: { fontFamily: F.monoRegular, fontSize: 11, color: C.muted, letterSpacing: 0.5 },
});
