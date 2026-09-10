import { useEffect, useState } from "react";
import { LayoutChangeEvent, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { G, Rect } from "react-native-svg";
import { useReducedMotion } from "@/lib/shared/hooks/useReducedMotion";
import { C } from "@/lib/theme";
import { styles } from "./ExpBar.styles";

type Props = {
  currentLevel: number;
  levelTitle: string;
  xpIntoLevel: number;
  xpForNextLevel: number;
  isMaxLevel: boolean;
  // True for exactly one render right after a level-up transition — triggers
  // the fill animation. False/undefined renders at rest with no animation.
  didLevelUp?: boolean;
};

// Track height (22) minus its 2px top/bottom borders (ExpBar.styles.ts).
const FILL_HEIGHT = 18;
const STRIPE_WIDTH = 12;
const STRIPE_PERIOD = 24;

// react-native-svg's <Pattern patternTransform="rotate(-45)"> doesn't tile
// cleanly on iOS (renders as jagged wedges instead of parallel stripes), so
// the design system's hazard-stripe fill (repeating-linear-gradient(-45deg,
// chartreuse 0-12px, chartreuse-dark 12-24px)) is drawn directly instead: a
// dark background rect plus a rotated group of light bars, both generously
// overscanned so rotation never leaves a gap at the edges.
function HazardStripeFill({ width }: { width: number }) {
  const overscan = width + FILL_HEIGHT;
  const bars = [];
  for (let x = -overscan; x < width + overscan; x += STRIPE_PERIOD) {
    bars.push(
      <Rect
        key={x}
        x={x}
        y={-overscan}
        width={STRIPE_WIDTH}
        height={FILL_HEIGHT + overscan * 2}
        fill={C.primary}
      />
    );
  }

  return (
    <Svg width={width} height={FILL_HEIGHT}>
      <Rect x={0} y={0} width={width} height={FILL_HEIGHT} fill={C.onPrimaryContainer} />
      <G rotation={-45} origin={`${width / 2}, ${FILL_HEIGHT / 2}`}>
        {bars}
      </G>
    </Svg>
  );
}

export function ExpBar({
  currentLevel,
  levelTitle,
  xpIntoLevel,
  xpForNextLevel,
  isMaxLevel,
  didLevelUp,
}: Props) {
  const [trackWidth, setTrackWidth] = useState(0);
  const reducedMotion = useReducedMotion();

  const percent = isMaxLevel ? 100 : Math.min(100, (xpIntoLevel / xpForNextLevel) * 100);
  const fillPercent = useSharedValue(percent);

  useEffect(() => {
    const animate = didLevelUp && !reducedMotion;
    fillPercent.value = withTiming(percent, {
      duration: animate ? 320 : 0,
      easing: Easing.bezier(0.2, 0, 0, 1),
    });
  }, [percent, didLevelUp, reducedMotion, fillPercent]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fillPercent.value}%`,
  }));

  function handleTrackLayout(event: LayoutChangeEvent) {
    setTrackWidth(event.nativeEvent.layout.width);
  }

  return (
    <View style={styles.container}>
      <View style={styles.captionRow}>
        <Text style={styles.captionLeft}>
          LV {currentLevel} · {levelTitle}
        </Text>
        <Text style={styles.captionRight}>
          {isMaxLevel ? "MAX" : `XP ${xpIntoLevel.toLocaleString()} / ${xpForNextLevel.toLocaleString()}`}
        </Text>
      </View>

      <View style={styles.track} onLayout={handleTrackLayout}>
        {trackWidth > 0 && (
          <Animated.View style={[styles.fill, fillStyle]}>
            <HazardStripeFill width={trackWidth} />
          </Animated.View>
        )}
      </View>
    </View>
  );
}
