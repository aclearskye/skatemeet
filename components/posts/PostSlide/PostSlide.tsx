import { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { GestureDetector } from "react-native-gesture-handler";
import { entityTagToMapFocus } from "@/lib/posts/entityTagOptions";
import { useEntityTagLabel } from "@/lib/posts/hooks/useEntityTagLabel";
import type { PostWithPeople } from "@/lib/posts/listQueries";
import { POST_REPORT_REASONS } from "@/lib/posts/types";
import { usePostMediaGestures } from "@/lib/posts/hooks/usePostMediaGestures";
import { C } from "@/lib/theme";
import { ReportReasonSheet } from "@/components/common/ReportReasonSheet";
import { LikeBurst } from "@/components/posts/LikeBurst";
import { PostOwnerMenu } from "@/components/posts/PostOwnerMenu";
import { PostRailButton } from "@/components/posts/PostRailButton";
import { PostVideo } from "@/components/posts/PostVideo";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import { INFO_BOTTOM, RAIL_FALLBACK_BOTTOM, styles } from "./PostSlide.styles";

type Props = {
  post: PostWithPeople;
  height: number;
  // On screen and the screen is focused: a video plays only then.
  isActive: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  isSignedIn: boolean;
  isOwnPost: boolean;
  isLiked: boolean;
  likeCount: number;
  isSaved: boolean;
  onToggleLike: () => void;
  onToggleSave: () => void;
  onReport: (reason: string) => void;
};

// A public web link opens anywhere (logged-out web viewing is allowed). On
// web that's the current origin; native needs EXPO_PUBLIC_WEB_ORIGIN set to
// the deployed web app, and falls back to the skatemeet:// deep link.
function postShareUrl(postId: string): string {
  if (Platform.OS === "web" && typeof window !== "undefined") return `${window.location.origin}/post/${postId}`;
  const origin = process.env.EXPO_PUBLIC_WEB_ORIGIN;
  return origin ? `${origin}/post/${postId}` : Linking.createURL(`/post/${postId}`);
}

// One full-screen post in the vertical viewer (md/media_posts.md §7).
// Photo posts swipe horizontally; a video autoplays muted on loop while on
// screen. One tap pauses / plays a video, holding it pauses until you let
// go, and two taps like any post (never unlike -- the heart button does
// that). Sound is the mute button (or a hardware volume press).
export function PostSlide({ post, height, isActive, isMuted, onToggleMute, isSignedIn, isOwnPost, isLiked, likeCount, isSaved, onToggleLike, onToggleSave, onReport }: Props) {
  const router = useRouter();
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const [isReporting, setIsReporting] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isHeld, setIsHeld] = useState(false);
  // Where the author's avatar sits inside the info block, so the rail's
  // last button can line up with its bottom edge (see railBottom).
  const [infoHeight, setInfoHeight] = useState(0);
  const [avatarBottom, setAvatarBottom] = useState(0);
  // Bumped on each double tap to replay the heart burst.
  const [likeBurst, setLikeBurst] = useState(0);
  const { data: entityLabel } = useEntityTagLabel(post.entityTag);

  // Scrolling away and back always resumes playback.
  useEffect(() => {
    if (!isActive) {
      setIsPaused(false);
      setIsHeld(false);
    }
  }, [isActive]);

  // Logged-out web viewers can look, but interacting means signing in.
  function requireAuth(action: () => void) {
    if (isSignedIn) action();
    else router.push("/Login");
  }

  function handleShare() {
    const url = postShareUrl(post.postId);
    Share.share(Platform.OS === "ios" ? { url } : { message: url });
  }

  const photos = post.media.filter((m) => m.mediaType === "photo" && m.mediaUrl);
  const video = post.mediaType === "video" ? post.media.find((m) => m.mediaUrl) : undefined;

  const hasVideo = video?.mediaUrl != null;
  const mediaGesture = usePostMediaGestures({
    onTap: hasVideo ? () => setIsPaused((p) => !p) : undefined,
    onDoubleTap: () =>
      requireAuth(() => {
        if (!isLiked) onToggleLike();
        setLikeBurst((n) => n + 1);
      }),
    onHoldStart: hasVideo ? () => setIsHeld(true) : undefined,
    onHoldEnd: hasVideo ? () => setIsHeld(false) : undefined,
  });

  // The info block is anchored INFO_BOTTOM from the slide's bottom, so the
  // avatar's bottom edge sits this far up -- whatever the caption length.
  const railBottom =
    post.author && infoHeight > 0 ? INFO_BOTTOM + infoHeight - avatarBottom : RAIL_FALLBACK_BOTTOM;

  return (
    <View style={[styles.slide, { height }]} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      {post.mediaType === "video" ? (
        video?.mediaUrl ? (
          <View style={styles.videoArea}>
            {/* The thumbnail shows until playback starts (and while paused
                off-screen), so the feed never flashes black. */}
            {video.thumbnailUrl && !isActive ? (
              <Image source={{ uri: video.thumbnailUrl }} style={StyleSheet.absoluteFill} resizeMode="contain" />
            ) : null}
            {/* The native video surface never sees touches -- it used to
                swallow some of them, which made tapping unreliable. */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              {isActive && (
                <PostVideo uri={video.mediaUrl} isActive={isActive} isMuted={isMuted} isPaused={isPaused || isHeld} />
              )}
            </View>
            {/* Touch layer on top of the video for tap / double tap / hold. */}
            <GestureDetector gesture={mediaGesture}>
              <View
                style={StyleSheet.absoluteFill}
                collapsable={false}
                accessible
                accessibilityRole="button"
                accessibilityLabel={isPaused ? "Play video" : "Pause video"}
                accessibilityActions={[{ name: "activate" }, { name: "like", label: "Like" }]}
                onAccessibilityAction={(e) => {
                  if (e.nativeEvent.actionName === "activate") setIsPaused((p) => !p);
                  else if (e.nativeEvent.actionName === "like" && !isLiked) requireAuth(onToggleLike);
                }}
              />
            </GestureDetector>
            {isActive && isPaused && (
              <View style={styles.pausedBadge} pointerEvents="none">
                <Ionicons name="play" size={30} color={C.onPrimary} />
              </View>
            )}
          </View>
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="videocam-outline" size={32} color={C.muted} />
            <Text style={styles.placeholderText}>VIDEO UNAVAILABLE</Text>
          </View>
        )
      ) : width > 0 ? (
        // One detector around the whole carousel (a gesture can only be
        // attached once); taps don't interfere with the horizontal swipe.
        <GestureDetector gesture={mediaGesture}>
          <View collapsable={false}>
            <FlatList
              data={photos}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(m) => m.mediaId}
              onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
              renderItem={({ item }) => (
                <Image source={{ uri: item.mediaUrl! }} style={{ width, height }} resizeMode="contain" />
              )}
            />
          </View>
        </GestureDetector>
      ) : null}

      <LikeBurst trigger={likeBurst} />

      {photos.length > 1 && (
        <View style={styles.dots}>
          {photos.map((m, i) => (
            <View key={m.mediaId} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
        </View>
      )}

      <View style={[styles.rail, { bottom: railBottom }]}>
        {/* Top of the rail, clear of every screen's back arrow / header. */}
        {video?.mediaUrl ? (
          <TouchableOpacity
            style={[styles.muteBtn, !isMuted && styles.muteBtnOn]}
            onPress={onToggleMute}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityState={{ checked: !isMuted }}
            accessibilityLabel={isMuted ? "Turn sound on" : "Turn sound off"}
          >
            <Ionicons name={isMuted ? "volume-mute" : "volume-high"} size={20} color={isMuted ? C.primary : C.onPrimary} />
          </TouchableOpacity>
        ) : null}
        <PostRailButton
          icon="heart-outline"
          activeIcon="heart"
          isActive={isLiked}
          accent={C.secondary}
          onAccent={C.onSecondary}
          count={likeCount}
          onPress={() => requireAuth(onToggleLike)}
          accessibilityLabel={isLiked ? `Unlike, ${likeCount} likes` : `Like, ${likeCount} likes`}
        />
        <PostRailButton
          icon="bookmark-outline"
          activeIcon="bookmark"
          isActive={isSaved}
          accent={C.gold}
          onAccent={C.onGold}
          onPress={() => requireAuth(onToggleSave)}
          accessibilityLabel={isSaved ? "Unsave" : "Save"}
        />
        <PostRailButton icon="paper-plane-outline" tint={C.tertiary} onPress={handleShare} accessibilityLabel="Share" />
        {post.entityTag && (
          <PostRailButton
            icon="map-outline"
            tint={C.primary}
            onPress={() => router.push({ pathname: "/(tabs)/map", params: { focus: entityTagToMapFocus(post.entityTag!) } } as never)}
            accessibilityLabel="Go to spot"
          />
        )}
        {isOwnPost ? (
          <PostRailButton icon="ellipsis-horizontal" onPress={() => setIsMenuOpen(true)} accessibilityLabel="Post options" />
        ) : (
          <PostRailButton icon="flag-outline" onPress={() => requireAuth(() => setIsReporting(true))} accessibilityLabel="Report" />
        )}
      </View>

      <View
        style={styles.info}
        pointerEvents="box-none"
        onLayout={(e: LayoutChangeEvent) => setInfoHeight(e.nativeEvent.layout.height)}
      >
        {post.author && (
          <TouchableOpacity
            style={styles.authorRow}
            onLayout={(e: LayoutChangeEvent) => {
              const { y, height: rowHeight } = e.nativeEvent.layout;
              setAvatarBottom(y + rowHeight);
            }}
            onPress={() => router.push(`/user/${post.author!.profileId}` as never)}
            activeOpacity={0.8}
          >
            <ProfileAvatar
              profileId={post.author.profileId}
              username={post.author.username}
              displayName={post.author.displayName}
              avatarUrl={post.author.avatarUrl}
              isOwnProfile={false}
              size={36}
            />
            <Text style={styles.username}>@{post.author.username}</Text>
          </TouchableOpacity>
        )}
        {entityLabel && (
          <Text style={styles.entity} numberOfLines={1}>
            {entityLabel.kindLabel} · {entityLabel.name.toUpperCase()}
          </Text>
        )}
        {post.caption ? (
          <Text style={styles.caption} numberOfLines={3}>
            {post.caption}
          </Text>
        ) : null}
        {post.taggedSkaters.length > 0 && (
          <Text style={styles.tags} numberOfLines={1}>
            WITH {post.taggedSkaters.map((s) => `@${s.username}`).join(" ")}
          </Text>
        )}
      </View>

      {isOwnPost && isMenuOpen && <PostOwnerMenu post={post} visible onClose={() => setIsMenuOpen(false)} />}

      {isReporting && (
        <ReportReasonSheet
          title="WHY ARE YOU REPORTING THIS POST?"
          reasons={POST_REPORT_REASONS}
          onSelect={(reason) => {
            setIsReporting(false);
            onReport(reason);
          }}
          onCancel={() => setIsReporting(false)}
        />
      )}
    </View>
  );
}
