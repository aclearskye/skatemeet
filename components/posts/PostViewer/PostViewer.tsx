import { useRef, useState, type ReactElement } from "react";
import { FlatList, RefreshControl, View, type LayoutChangeEvent, type ViewToken } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { useToast } from "@/lib/context/toast-context";
import { useVideoSound } from "@/lib/context/video-sound-context";
import { usePostInteractions } from "@/lib/posts/hooks/usePostInteractions";
import type { PostWithPeople } from "@/lib/posts/listQueries";
import { reportPost } from "@/lib/posts/mutations";
import type { PostReportReason } from "@/lib/posts/types";
import { C } from "@/lib/theme";
import { PostSlide } from "@/components/posts/PostSlide";
import { styles } from "./PostViewer.styles";

const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 60 };

type Props = {
  posts: PostWithPeople[];
  initialIndex?: number;
  onEndReached?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  ListEmptyComponent?: ReactElement;
};

// TikTok-style vertical pager, shared by the Feed tab, profile grids and
// spot/store grids (md/media_posts.md §7). Each page fills the viewer's
// measured height.
export function PostViewer({ posts, initialIndex = 0, onEndReached, onRefresh, isRefreshing = false, ListEmptyComponent }: Props) {
  const [height, setHeight] = useState(0);
  const { showToast } = useToast();
  const { session } = useAuthContext();
  const viewerId = session?.user.id ?? null;
  const { isSignedIn, liked, saved, likeCount, toggleLike, toggleSave } = usePostInteractions(posts.map((p) => p.postId));
  // Only the post on screen plays, and nothing plays once the screen is left
  // (another tab, a pushed screen). Sound is one choice for the whole viewer,
  // like TikTok: unmute once and the next video keeps it.
  const isFocused = useIsFocused();
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  // App-wide (lib/context/video-sound-context.tsx): muted on every app
  // start, turned on by the mute button or a hardware volume press.
  const { isMuted, toggleMute } = useVideoSound();
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems.find((v) => v.isViewable && v.index != null);
    if (first?.index != null) setActiveIndex(first.index);
  }).current;

  function handleReport(postId: string, reason: string) {
    reportPost(postId, reason as PostReportReason)
      .then(() => showToast({ message: "THANKS — WE'LL TAKE A LOOK", variant: "info" }))
      .catch(() => showToast({ message: "COULDN'T SEND REPORT — TRY AGAIN", variant: "danger" }));
  }

  return (
    <View style={styles.root} onLayout={(e: LayoutChangeEvent) => setHeight(e.nativeEvent.layout.height)}>
      {height > 0 && (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.postId}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          initialScrollIndex={initialIndex < posts.length ? initialIndex : 0}
          getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
          onEndReached={onEndReached}
          onEndReachedThreshold={2}
          windowSize={3}
          maxToRenderPerBatch={2}
          viewabilityConfig={VIEWABILITY_CONFIG}
          onViewableItemsChanged={onViewableItemsChanged}
          ListEmptyComponent={ListEmptyComponent}
          refreshControl={
            onRefresh ? <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={C.primary} /> : undefined
          }
          renderItem={({ item, index }) => (
            <PostSlide
              post={item}
              height={height}
              isActive={isFocused && index === activeIndex}
              isMuted={isMuted}
              onToggleMute={toggleMute}
              isSignedIn={isSignedIn}
              isOwnPost={viewerId != null && item.profileId === viewerId}
              isLiked={liked.has(item.postId)}
              likeCount={likeCount(item.postId, item.likeCount)}
              isSaved={saved.has(item.postId)}
              onToggleLike={() => toggleLike(item.postId, item.likeCount)}
              onToggleSave={() => toggleSave(item.postId)}
              onReport={(reason) => handleReport(item.postId, reason)}
            />
          )}
        />
      )}
    </View>
  );
}
