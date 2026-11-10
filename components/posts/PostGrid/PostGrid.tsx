import { ActivityIndicator, Image, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { usePostList, type PostListSource } from "@/lib/posts/hooks/usePostList";
import type { PostWithPeople } from "@/lib/posts/listQueries";
import { C } from "@/lib/theme";
import { styles } from "./PostGrid.styles";

type Props = {
  source: PostListSource;
  emptyIcon: keyof typeof Ionicons.glyphMap;
  emptyLabel: string;
  // Own profile only: a "new post" square fixed in the top-left cell, ahead
  // of pinned posts. With no posts yet it's the "share your first post" card.
  onCreatePost?: () => void;
};

type GridCell = { post: PostWithPeople; isPinnedCopy: boolean };

function CreatePostCell({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <View style={styles.cellSlot}>
      <TouchableOpacity
        style={[styles.cell, styles.createCell]}
        activeOpacity={0.8}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <View>
          <Ionicons name="camera-outline" size={28} color={C.primary} />
          <View style={styles.createPlus}>
            <Ionicons name="add" size={12} color={C.bg} />
          </View>
        </View>
        <Text style={styles.createLabel}>{label}</Text>
      </TouchableOpacity>
    </View>
  );
}

// A profile's own grid leads with a copy of each pinned post (oldest pin
// first); the original stays in its place in the timeline, and both open
// the same post.
function buildCells(source: PostListSource, posts: PostWithPeople[]): GridCell[] {
  const all = posts.map((post) => ({ post, isPinnedCopy: false }));
  if (!source.startsWith("posts:")) return all;
  const pinned = posts
    .filter((p) => p.pinnedAt != null)
    .sort((a, b) => (a.pinnedAt ?? "").localeCompare(b.pinnedAt ?? ""))
    .map((post) => ({ post, isPinnedCopy: true }));
  return [...pinned, ...all];
}

// 3-column grid filled left to right; tapping a cell opens the vertical
// viewer at that post.
export function PostGrid({ source, emptyIcon, emptyLabel, onCreatePost }: Props) {
  const router = useRouter();
  const { data: posts = [], isLoading, isError } = usePostList(source);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={C.primary} />
      </View>
    );
  }
  if (onCreatePost && !isError && posts.length === 0) {
    return (
      <View style={styles.grid}>
        <CreatePostCell label="SHARE YOUR FIRST POST" onPress={onCreatePost} />
      </View>
    );
  }
  if (isError || posts.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name={isError ? "alert-circle-outline" : emptyIcon} size={32} color={C.muted} />
        <Text style={styles.emptyLabel}>{isError ? "COULDN'T LOAD POSTS" : emptyLabel}</Text>
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {onCreatePost && <CreatePostCell label="NEW POST" onPress={onCreatePost} />}
      {buildCells(source, posts).map(({ post, isPinnedCopy }) => {
        const cover = post.media[0];
        const uri = cover?.thumbnailUrl ?? cover?.mediaUrl;
        const typeIcon: keyof typeof Ionicons.glyphMap | null =
          post.mediaType === "video" ? "videocam" : post.media.length > 1 ? "copy-outline" : null;
        return (
          <View key={isPinnedCopy ? `pinned-${post.postId}` : post.postId} style={styles.cellSlot}>
            <TouchableOpacity
              style={styles.cell}
              activeOpacity={0.85}
              onPress={() =>
                router.push({ pathname: "/post/browse", params: { source, postId: post.postId } } as never)
              }
              accessibilityRole="button"
              accessibilityLabel={isPinnedCopy ? "Pinned post" : post.mediaType === "video" ? "Video post" : "Photo post"}
            >
              {uri ? <Image source={{ uri }} style={styles.image} resizeMode="cover" /> : null}
              {(isPinnedCopy || typeIcon) && (
                <View style={styles.badgeRow}>
                  {typeIcon && (
                    <View style={styles.badge}>
                      <Ionicons name={typeIcon} size={11} color={C.text} />
                    </View>
                  )}
                  {isPinnedCopy && (
                    <View style={styles.badge}>
                      <Ionicons name="pin" size={11} color={C.text} />
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}
