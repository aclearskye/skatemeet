import { Text, View } from "react-native";
import { Image } from "expo-image";
import { styles } from "./SpotChatAvatar.styles";

type Props = {
  name: string;
  avatarUrl: string | null;
  size: number;
};

// Not ProfileAvatar: that one links to the profile, and spot chat members
// mustn't be able to reach each other's profiles (or @usernames).
export function SpotChatAvatar({ name, avatarUrl, size }: Props) {
  const frame = { width: size, height: size, borderRadius: size / 2 };

  if (avatarUrl) {
    return <Image source={{ uri: avatarUrl }} style={[styles.image, frame]} contentFit="cover" accessibilityIgnoresInvertColors />;
  }

  return (
    <View style={[styles.placeholder, frame]}>
      <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{name.trim().charAt(0).toUpperCase() || "?"}</Text>
    </View>
  );
}
