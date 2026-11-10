import { useEffect, useRef } from "react";
import { View } from "react-native";
import type HlsInstance from "hls.js";
import type { PostVideoProps } from "./PostVideo.types";
import { styles } from "./PostVideo.styles";

// Web player. Safari (and Chrome 142+) play HLS natively; elsewhere hls.js
// is loaded on demand, capped to the player's size so a phone-sized viewer
// never pulls a 1080p rendition (the web "data saver", md/media_posts.md §11).
export function PostVideo({ uri, isActive, isMuted, isPaused = false, contentFit = "contain", style }: PostVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let hls: HlsInstance | null = null;
    let cancelled = false;

    const isHls = uri.includes(".m3u8");
    if (!isHls || video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = uri;
    } else {
      import("hls.js").then(({ default: HlsLib }) => {
        if (cancelled) return;
        if (HlsLib.isSupported()) {
          hls = new HlsLib({ capLevelToPlayerSize: true });
          hls.loadSource(uri);
          hls.attachMedia(video);
        } else {
          video.src = uri;
        }
      });
    }

    return () => {
      cancelled = true;
      hls?.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [uri]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted;
  }, [isMuted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // Muted autoplay is allowed by browsers; play() can still reject (e.g.
    // a hidden tab), which is fine -- the next activation retries.
    if (isActive && !isPaused) video.play().catch(() => {});
    else video.pause();
  }, [isActive, isPaused]);

  return (
    <View style={[styles.video, style]}>
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        preload={isActive ? "auto" : "metadata"}
        style={{ width: "100%", height: "100%", objectFit: contentFit }}
      />
    </View>
  );
}
