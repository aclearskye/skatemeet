import { Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { ProfileCard } from "@/lib/profiles/queries";
import { C } from "@/lib/theme";
import { AddFriendButton } from "@/components/profile/AddFriendButton";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import { AVATAR_SIZE, styles } from "./PrivateProfileView.styles";

type Props = {
  card: ProfileCard;
};

// What a non-friend sees of a private profile: who it is, and a way to
// send a friend request -- nothing else.
export function PrivateProfileView({ card }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={[styles.breadcrumb, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.breadcrumbTitle} numberOfLines={1}>
          @{card.username}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.body}>
        <ProfileAvatar
          profileId={card.profileId}
          username={card.username}
          displayName={card.displayName}
          avatarUrl={card.avatarUrl}
          isOwnProfile={false}
          size={AVATAR_SIZE}
        />
        <View style={styles.nameRow}>
          <Text style={styles.displayName} numberOfLines={1}>
            {(card.displayName || card.username).toUpperCase()}
          </Text>
          <AddFriendButton profileId={card.profileId} username={card.username} />
        </View>
        <Text style={styles.username}>@{card.username}</Text>

        <View style={styles.lockBadge}>
          <Ionicons name="lock-closed" size={14} color={C.secondary} />
          <Text style={styles.lockText}>THIS PROFILE IS PRIVATE</Text>
        </View>
        <Text style={styles.hint}>Become friends to see their profile and chat.</Text>
      </View>
    </View>
  );
}
