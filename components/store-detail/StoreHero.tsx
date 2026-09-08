import { C } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { StyleSheet, TouchableOpacity, View } from "react-native";

type Props = { photoUrl: string | null; onPress?: () => void };

export function StoreHero({ photoUrl, onPress }: Props) {
  if (photoUrl) {
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} disabled={!onPress}>
        <Image source={{ uri: photoUrl }} style={styles.hero} contentFit="cover" />
      </TouchableOpacity>
    );
  }
  return (
    <View style={[styles.hero, styles.heroPlaceholder]}>
      <Ionicons name="storefront-outline" size={52} color={C.muted} style={{ opacity: 0.4 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { width: "100%", aspectRatio: 16 / 9 },
  heroPlaceholder: {
    backgroundColor: C.surfaceHigh,
    alignItems: "center",
    justifyContent: "center",
  },
});
