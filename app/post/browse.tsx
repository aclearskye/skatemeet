import { ActivityIndicator, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { usePostList, type PostListSource } from "@/lib/posts/hooks/usePostList";
import { C } from "@/lib/theme";
import { PostViewer } from "@/components/posts/PostViewer";

// Full-screen viewer over any post grid (profile tabs, archive, spot grid),
// opened at the tapped post. Reads the same cache entry the grid filled.
//
// Opens by post id, not grid position: the list can change between the tap
// and this render (a refetch after a post is deleted, or a pinned copy that
// sits ahead of the timeline), and a position would then land on the wrong
// post.
export default function BrowsePostsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { source, postId, index } = useLocalSearchParams<{ source: string; postId?: string; index?: string }>();
  const { data: posts = [], isLoading } = usePostList((source as PostListSource) ?? null);

  const byId = postId ? posts.findIndex((p) => p.postId === postId) : -1;
  const initialIndex = byId >= 0 ? byId : Math.min(Number(index ?? 0), Math.max(posts.length - 1, 0));

  return (
    <View style={{ flex: 1, backgroundColor: C.bgLowest }}>
      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : (
        // Keyed so the pager remounts at the right page once the list is in
        // (initialScrollIndex is only read on mount).
        <PostViewer key={postId ?? "start"} posts={posts} initialIndex={initialIndex} />
      )}
      <TouchableOpacity
        onPress={() => router.back()}
        hitSlop={12}
        style={{ position: "absolute", top: insets.top + 12, left: 16 }}
        accessibilityLabel="Back"
      >
        <Ionicons name="arrow-back" size={24} color={C.text} />
      </TouchableOpacity>
    </View>
  );
}
