import { EntityPreviewCard } from "@/components/common/EntityPreviewCard";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { fetchProfileFavorites } from "@/lib/favorites/queries";
import { C, F } from "@/lib/theme";
import { entityDetailRoute } from "@/utils/entityNavigation";
import { queryKeys } from "@/utils/queryKeys";
import { previewItemId } from "@/utils/typeGuards";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function FavouritesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuthContext();
  const userId = session?.user.id ?? null;

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: queryKeys.profileFavorites(userId ?? ""),
    queryFn: () => fetchProfileFavorites(userId!),
    enabled: !!userId,
  });

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.heading}>FAVOURITES</Text>
        <Text style={styles.subheading} numberOfLines={1}>
          {"// these are your favourite places"}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.centeredMsg}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : favorites.length === 0 ? (
        <View style={styles.centeredMsg}>
          <Ionicons name="heart-outline" size={32} color={C.muted} />
          <Text style={styles.emptyLabel}>NO FAVOURITES YET</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {favorites.map((item) => (
            <EntityPreviewCard
              key={previewItemId(item)}
              item={item}
              onPress={() => router.push(entityDetailRoute(item) as any)}
              initialHasVoted={null}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: C.border,
  },
  heading: {
    fontFamily: F.heading,
    fontSize: 20,
    color: C.text,
    letterSpacing: 2,
  },
  subheading: {
    flexShrink: 1,
    fontFamily: F.monoRegular,
    fontSize: 13,
    color: C.muted,
    letterSpacing: 0.5,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  centeredMsg: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  emptyLabel: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    letterSpacing: 2,
  },
});
