import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "@/lib/theme";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import { styles } from "./ChatAvatar.styles";

type Props = {
  profileId: string | null;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  size: number;
};

export function ChatAvatar({ profileId, username, displayName, avatarUrl, size }: Props) {
  if (!profileId || !username) {
    return (
      <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2 }]}>
        <Ionicons name="person" size={size * 0.45} color={C.muted} />
      </View>
    );
  }

  return (
    <ProfileAvatar
      profileId={profileId}
      username={username}
      displayName={displayName}
      avatarUrl={avatarUrl}
      isOwnProfile={false}
      size={size}
    />
  );
}
