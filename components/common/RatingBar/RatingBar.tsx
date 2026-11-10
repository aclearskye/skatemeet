import { useEffect, useRef } from "react";
import { Animated, StyleProp, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import { styles } from "./RatingBar.styles";

type Props = {
  // 0–5, fractional for averages. null = no rating yet (all empty).
  value: number | null;
  accent: string;
  // Header above the bar, e.g. "DIFFICULTY". Omit for a bare bar.
  label?: string;
  // Number of ratings behind an average; shown in the header.
  count?: number;
  // sm: thin bar inside a review card. md: the default.
  size?: "sm" | "md";
  // Makes it an input: each segment sets that value (tap it again to clear).
  onChange?: (value: number | null) => void;
  // Community mode: the bar fills to `value` (the average) while taps set
  // this, the viewer's own rating, which gets an outline on its segment.
  // Leave undefined for a plain input where the fill is the selection.
  userValue?: number | null;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const SEGMENTS = [0, 1, 2, 3, 4];

// The 5-segment rating bar used for every rating (difficulty, store
// ratings, reviews) in place of stars. Averages fill a partial segment, and
// the fill animates whenever the shared average changes under it.
export function RatingBar({
  value,
  accent,
  label,
  count,
  size = "md",
  onChange,
  userValue,
  disabled,
  style,
}: Props) {
  const fill = useRef(new Animated.Value(value ?? 0)).current;

  useEffect(() => {
    Animated.timing(fill, {
      toValue: value ?? 0,
      duration: 350,
      useNativeDriver: false,
    }).start();
  }, [fill, value]);

  const segmentStyle = [
    styles.segment,
    size === "sm" ? styles.segmentSm : onChange ? styles.segmentInput : styles.segmentMd,
  ];
  const showHeader = label != null || count != null;
  const isCommunity = userValue !== undefined;
  const selected = isCommunity ? userValue : value;

  return (
    <View style={[styles.container, style]}>
      {showHeader && (
        <View style={styles.header}>
          {label != null && <Text style={styles.label}>{label}</Text>}
          {value != null ? (
            <Text style={styles.value}>
              <Text style={{ color: accent }}>{value.toFixed(1)}</Text>
              {" / 5"}
              {count != null ? ` · ${count} ${count === 1 ? "RATING" : "RATINGS"}` : ""}
            </Text>
          ) : count != null ? (
            <Text style={styles.value}>NOT RATED YET</Text>
          ) : null}
        </View>
      )}

      <View
        style={[styles.track, size === "sm" && styles.trackSm]}
        accessible={!onChange}
        accessibilityRole={onChange ? undefined : "progressbar"}
        accessibilityLabel={label}
        accessibilityValue={{ min: 0, max: 5, now: value ?? 0 }}
      >
        {SEGMENTS.map((i) => {
          const width = fill.interpolate({
            inputRange: [i, i + 1],
            outputRange: ["0%", "100%"],
            extrapolate: "clamp",
          });
          const inner = <Animated.View style={[styles.fill, { width, backgroundColor: accent }]} />;
          if (!onChange) {
            return (
              <View key={i} style={segmentStyle}>
                {inner}
              </View>
            );
          }
          const rating = i + 1;
          const isMine = isCommunity && selected === rating;
          return (
            <TouchableOpacity
              key={i}
              style={[segmentStyle, isMine && styles.segmentMine]}
              onPress={() => onChange(selected === rating ? null : rating)}
              disabled={disabled}
              activeOpacity={0.75}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected === rating, disabled: !!disabled }}
              accessibilityLabel={`Rate ${rating} of 5`}
            >
              {inner}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
