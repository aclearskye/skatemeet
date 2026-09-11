import { useEffect, useState } from "react";

// Android's Marker renderer snapshots a custom marker view into a bitmap the
// moment tracksViewChanges flips to false — if that happens before the view
// has actually painted (e.g. right on mount), the marker is frozen blank
// forever since nothing ever re-triggers another snapshot. Staying `true`
// for a short window after mount/selection-change lets the real paint land
// before tracking turns off again.
//
// This only fires on mount and on a `selected` change deliberately, not on
// every prop change to the marker's own content (e.g. the live-count dot) —
// toggling tracksViewChanges back to `true` on an *already-mounted* marker
// is a known react-native-maps iOS quirk that can leave the marker blank
// instead of repainting it. Content that needs to force a real repaint
// (MapMarkers.tsx's liveCount-driven dot) does it by changing the marker's
// `key` instead, going through this same mount-time settle logic via a
// clean remount rather than fighting an existing one.
const SETTLE_MS = 500;

export function useTracksViewChanges(selected: boolean) {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  useEffect(() => {
    setTracksViewChanges(true);
    if (selected) return;

    const timeout = setTimeout(() => setTracksViewChanges(false), SETTLE_MS);
    return () => clearTimeout(timeout);
  }, [selected]);

  return tracksViewChanges;
}
