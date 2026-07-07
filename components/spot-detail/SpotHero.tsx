import { C } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

type Props = { photoUrl: string | null };

export function SpotHero({ photoUrl }: Props) {
  if (photoUrl) {
    return <Image source={{ uri: photoUrl }} style={styles.photo} contentFit="cover" />;
  }
  return (
    <View style={styles.photoPlaceholder}>
      <Ionicons name="location-sharp" size={48} color={C.muted} />
    </View>
  );
}

const styles = StyleSheet.create({
  photo: { width: "100%", aspectRatio: 16 / 9 },
  photoPlaceholder: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: C.surfaceHigh,
    alignItems: "center",
    justifyContent: "center",
  },
});
