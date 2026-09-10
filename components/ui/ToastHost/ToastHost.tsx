import { useCallback, useEffect } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useReducedMotion } from "@/lib/shared/hooks/useReducedMotion";
import { VARIANT_COLOR, VARIANT_ICON } from "@/lib/shared/notificationVariant";
import { useToast } from "@/lib/context/toast-context";
import { styles } from "./ToastHost.styles";

const AUTO_DISMISS_MS = 4000;
const ANIMATION_MS = 320;
const EASING = Easing.bezier(0.2, 0, 0, 1);

export function ToastHost() {
  const { queue, dismissFront } = useToast();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);

  const current = queue[0];

  const dismiss = useCallback(() => {
    if (reducedMotion) {
      dismissFront();
      return;
    }
    progress.value = withTiming(0, { duration: ANIMATION_MS, easing: EASING }, (finished) => {
      if (finished) runOnJS(dismissFront)();
    });
  }, [reducedMotion, dismissFront, progress]);

  useEffect(() => {
    if (!current) return;
    progress.value = reducedMotion ? 1 : withTiming(1, { duration: ANIMATION_MS, easing: EASING });

    const timeout = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timeout);
  }, [current, reducedMotion, progress, dismiss]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * -40 }],
  }));

  if (!current) return null;

  return (
    <View style={[styles.overlay, { top: insets.top + 12 }]} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.card,
          { borderLeftWidth: 6, borderLeftColor: VARIANT_COLOR[current.variant] },
          animatedStyle,
        ]}
      >
        <TouchableOpacity activeOpacity={0.85} onPress={dismiss}>
          <View style={styles.row}>
            <Ionicons name={VARIANT_ICON[current.variant]} size={20} color={VARIANT_COLOR[current.variant]} />
            <View style={styles.textColumn}>
              {current.label ? <Text style={styles.label}>{current.label}</Text> : null}
              <Text style={styles.message}>{current.message}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}
