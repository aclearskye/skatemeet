import { useEffect, useRef } from "react";
import { Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "@/lib/theme";
import { styles } from "./LikeBurst.styles";

type Props = {
  // Bump to play the burst again (each double tap).
  trigger: number;
};

// The heart that pops in the middle of a post on double-tap-to-like: a
// sticker-style filled heart on an orange square that punches in, holds,
// then fades. Never intercepts touches.
export function LikeBurst({ trigger }: Props) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (trigger === 0) return;
    scale.setValue(0.4);
    opacity.setValue(1);
    Animated.sequence([
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 180, useNativeDriver: true }),
      Animated.delay(250),
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [trigger, scale, opacity]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.burst, { opacity, transform: [{ scale }, { rotate: "-6deg" }] }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Ionicons name="heart" size={48} color={C.onSecondary} />
    </Animated.View>
  );
}
