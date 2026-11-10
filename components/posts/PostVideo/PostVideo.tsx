import { useEffect } from "react";
import { useVideoPlayer, VideoView } from "expo-video";
import type { PostVideoProps } from "./PostVideo.types";
import { styles } from "./PostVideo.styles";

// Native player (expo-video plays Stream's HLS directly). Autoplays muted
// on loop while active (md/media_posts.md §7); the web build resolves
// PostVideo.web.tsx instead.
export function PostVideo({ uri, isActive, isMuted, isPaused = false, contentFit = "contain", style }: PostVideoProps) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
  });

  useEffect(() => {
    player.muted = isMuted;
  }, [player, isMuted]);

  useEffect(() => {
    if (isActive && !isPaused) player.play();
    else player.pause();
  }, [player, isActive, isPaused]);

  return (
    <VideoView
      player={player}
      style={[styles.video, style]}
      contentFit={contentFit}
      nativeControls={false}
      allowsPictureInPicture={false}
    />
  );
}
