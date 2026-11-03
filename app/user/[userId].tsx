import ProfileView from "@/components/profile/ProfileView";
import { PrivateProfileView } from "@/components/profile/PrivateProfileView";
import { useProfileCard } from "@/lib/profiles/hooks/useProfileCard";
import { useUserProfile } from "@/lib/profiles/hooks/useUserProfile";
import { C, F } from "@/lib/theme";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { data: profile, isLoading, isError } = useUserProfile(userId ?? null);

  // RLS hides a private non-friend's or a blocked pair's full row; the card
  // then tells the two apart (no card = blocked or deleted, deliberately
  // indistinguishable).
  const isHidden = !isLoading && !isError && profile === null;
  const { data: card, isLoading: cardLoading } = useProfileCard(userId ?? null, isHidden);

  if (isLoading || (isHidden && cardLoading)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={C.primary} />
      </View>
    );
  }

  if (profile) return <ProfileView profile={profile} isOwnProfile={false} />;

  if (isHidden && card) return <PrivateProfileView card={card} />;

  return (
    <View style={styles.center}>
      <Text style={styles.errorText}>{isError ? "Something went wrong." : "This skater isn't available."}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontFamily: F.monoRegular,
    fontSize: 13,
    color: C.muted,
  },
});
