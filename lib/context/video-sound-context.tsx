import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { NativeModules, Platform } from "react-native";

type VideoSoundContextType = {
  isMuted: boolean;
  toggleMute: () => void;
};

const VideoSoundContext = createContext<VideoSoundContextType>({
  isMuted: true,
  toggleMute: () => {},
});

// One sound setting for every video in the app (feed, profile grids, spot
// grids, a shared post). Deliberately not persisted: each app start begins
// muted. Pressing the hardware volume up/down button turns sound on, like
// TikTok/Instagram -- the mute button turns it back off.
export function VideoSoundProvider({ children }: { children: ReactNode }) {
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    // The library throws as soon as it's imported if its native module isn't
    // in the build (e.g. a dev client built before it was added), so it's
    // only loaded once the module is known to be there. Without it the mute
    // button still works; volume presses just don't unmute.
    if (Platform.OS === "web" || !NativeModules.VolumeManager) return;
    let subscription: { remove: () => void } | null = null;
    let cancelled = false;
    import("react-native-volume-manager")
      .then(({ VolumeManager }) => {
        if (cancelled) return;
        subscription = VolumeManager.addVolumeListener(() => setIsMuted(false));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  const toggleMute = useCallback(() => setIsMuted((m) => !m), []);

  return <VideoSoundContext.Provider value={{ isMuted, toggleMute }}>{children}</VideoSoundContext.Provider>;
}

export const useVideoSound = () => useContext(VideoSoundContext);
