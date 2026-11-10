import { useMemo, useRef } from "react";
import { Gesture } from "react-native-gesture-handler";

// A tap longer than this isn't a tap; a press held this long is a hold.
// Kept apart so a slow tap can't also count as a hold.
const TAP_MAX_MS = 250;
const HOLD_MIN_MS = 300;
// Gap allowed between the two taps of a double tap.
const DOUBLE_TAP_MAX_GAP_MS = 250;

type Handlers = {
  // One clear tap (videos: pause / play). Omit for photos.
  onTap?: () => void;
  // Two clear taps (like).
  onDoubleTap: () => void;
  // Finger down and held (videos: pause while held) / lifted again.
  onHoldStart?: () => void;
  onHoldEnd?: () => void;
};

// The post viewer's media gestures, as native gesture-handler recognizers so
// they're decided reliably inside the vertical pager (a JS Pressable there
// lost taps to the scroll view and to the native video surface).
//
// Exclusive, in priority order: hold, then double tap, then tap -- a single
// tap fires once a second tap is ruled out, so a double tap never also
// pauses. Callbacks run on the JS thread (runOnJS), so they're plain
// functions; the latest ones are read through a ref so the recognizers
// don't need rebuilding every render.
export function usePostMediaGestures(handlers: Handlers) {
  const ref = useRef(handlers);
  ref.current = handlers;
  const hasTap = handlers.onTap != null;
  const hasHold = handlers.onHoldStart != null;

  return useMemo(() => {
    const doubleTap = Gesture.Tap()
      .runOnJS(true)
      .numberOfTaps(2)
      .maxDuration(TAP_MAX_MS)
      .maxDelay(DOUBLE_TAP_MAX_GAP_MS)
      .onEnd((_e, success) => {
        if (success) ref.current.onDoubleTap();
      });

    const gestures = [];
    if (hasHold) {
      gestures.push(
        Gesture.LongPress()
          .runOnJS(true)
          .minDuration(HOLD_MIN_MS)
          // Lets the pager still scroll if the held finger starts moving.
          .maxDistance(12)
          .onStart(() => ref.current.onHoldStart?.())
          // Always, not just on a clean release: if the pager takes the
          // touch mid-hold the gesture is cancelled, and the video must
          // still resume. Harmless when the hold never started.
          .onFinalize(() => ref.current.onHoldEnd?.())
      );
    }
    gestures.push(doubleTap);
    if (hasTap) {
      gestures.push(
        Gesture.Tap()
          .runOnJS(true)
          .maxDuration(TAP_MAX_MS)
          .onEnd((_e, success) => {
            if (success) ref.current.onTap?.();
          })
      );
    }
    return Gesture.Exclusive(...gestures);
  }, [hasTap, hasHold]);
}
