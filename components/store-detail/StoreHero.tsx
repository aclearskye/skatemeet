import { C } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

type Props = { photoUrl: string | null };

export function StoreHero({ photoUrl }: Props) {
  if (photoUrl) {
    return <Image source={{ uri: photoUrl }} style={styles.hero} contentFit="cover" />;
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
