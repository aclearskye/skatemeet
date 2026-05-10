import { supabase } from "@/lib/supabaseClient";
import { uploadAvatar } from "@/lib/clips/clips";
import { avatarColor, C, F } from "@/lib/theme";
import * as ImagePicker from "expo-image-picker";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

function initials(displayName: string | null, username: string): string {
  const src = displayName?.trim() || username;
  const parts = src.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

type Props = {
  profileId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isOwnProfile: boolean;
  onAvatarUpdated?: (url: string) => void;
  size?: number;
};

export default function ProfileAvatar({
  profileId,
  username,
  displayName,
  avatarUrl,
  isOwnProfile,
  onAvatarUpdated,
  size = 96,
}: Props) {
  const [bg, fg] = avatarColor(username);

  async function handlePress() {
    if (!isOwnProfile) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const mime = asset.mimeType ?? "image/jpeg";
    const url = await uploadAvatar(profileId, asset.uri, mime);
    await supabase.from("profiles").update({ avatar_url: url }).eq("profile_id", profileId);
    onAvatarUpdated?.(url);
  }

  const containerStyle = [styles.container, { width: size, height: size, backgroundColor: bg }];

  const inner = avatarUrl ? (
    <Image source={{ uri: avatarUrl }} style={{ width: size, height: size }} resizeMode="cover" />
  ) : (
    <Text style={[styles.initials, { color: fg, fontSize: size * 0.35 }]}>
      {initials(displayName, username)}
    </Text>
  );

  if (isOwnProfile) {
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.8} style={containerStyle}>
        {inner}
      </TouchableOpacity>
    );
  }

  return <View style={containerStyle}>{inner}</View>;
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  initials: {
    fontFamily: F.heading,
    letterSpacing: 1,
  },
});
