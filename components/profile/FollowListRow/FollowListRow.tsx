import { Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import type { FollowListItem } from "@/lib/follows/types";
import { FollowButton } from "@/components/profile/FollowButton";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import { styles } from "./FollowListRow.styles";

type Props = {
  item: FollowListItem;
  isViewer: boolean;
  // Only on your own Followers list.
  onRemove?: (profileId: string) => void;
};

export function FollowListRow({ item, isViewer, onRemove }: Props) {
  const router = useRouter();
  return (
    <View style={styles.row}>
      <TouchableOpacity style={styles.identity} onPress={() => router.push(`/user/${item.profileId}` as never)} activeOpacity={0.8}>
        <ProfileAvatar
          profileId={item.profileId}
          username={item.username}
          displayName={item.displayName}
          avatarUrl={item.avatarUrl}
          isOwnProfile={false}
          size={40}
        />
        <View style={styles.names}>
          <Text style={styles.username}>@{item.username}</Text>
          {item.displayName ? <Text style={styles.displayName}>{item.displayName}</Text> : null}
        </View>
      </TouchableOpacity>
      {onRemove ? (
        <TouchableOpacity style={styles.removeBtn} onPress={() => onRemove(item.profileId)} activeOpacity={0.8}>
          <Text style={styles.removeText}>REMOVE</Text>
        </TouchableOpacity>
      ) : !isViewer && !item.isPrivate ? (
        <FollowButton profileId={item.profileId} username={item.username} />
      ) : null}
    </View>
  );
}
