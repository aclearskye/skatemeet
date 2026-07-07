import { C, F } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from "react-native";

type Props = {
  count: number;
  hasVoted: boolean;
  accent: string;
  onAccent: string;
  onPress: () => void;
  isLoading: boolean;
  variant: "full" | "pill";
};

export function VoteButton({ count, hasVoted, accent, onAccent, onPress, isLoading, variant }: Props) {
  if (variant === "pill") {
    return (
      <TouchableOpacity
        style={[
          styles.pill,
          hasVoted
            ? { backgroundColor: accent }
            : { borderWidth: 1, borderColor: accent },
        ]}
        onPress={onPress}
        activeOpacity={0.7}
        hitSlop={8}
      >
        <Ionicons name="arrow-up" size={11} color={hasVoted ? onAccent : accent} />
        <Text style={[styles.pillText, { color: hasVoted ? onAccent : accent }]}>
          {count}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.full,
        hasVoted && { backgroundColor: accent, borderColor: accent },
      ]}
      onPress={onPress}
      disabled={isLoading}
      activeOpacity={0.75}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={hasVoted ? onAccent : C.muted} />
      ) : (
        <>
          <Ionicons
            name={hasVoted ? "arrow-up-circle" : "arrow-up-circle-outline"}
            size={20}
            color={hasVoted ? onAccent : C.muted}
          />
          <Text style={[styles.fullText, hasVoted && { color: onAccent }]}>
            {count} {hasVoted ? "VOTED" : "UPVOTE"}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  full: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 2,
    borderColor: C.border,
    paddingVertical: 13,
  },
  fullText: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.muted,
    letterSpacing: 1,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: "auto",
  },
  pillText: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 0.5,
  },
});
