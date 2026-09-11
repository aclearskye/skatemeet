import { useEffect, useState } from "react";

// Android's Marker renderer snapshots a custom marker view into a bitmap the
// moment tracksViewChanges flips to false — if that happens before the view
// has actually painted (e.g. right on mount), the marker is frozen blank
// forever since nothing ever re-triggers another snapshot. Staying `true`
// for a short window after mount/selection-change lets the real paint land
// before tracking turns off again.
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
