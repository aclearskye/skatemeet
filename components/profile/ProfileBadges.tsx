import { C, F } from "@/lib/theme";
import { ScrollView, StyleSheet, Text, View } from "react-native";

type Props = {
  skillLevel: string | null;
  disciplines: string[] | null;
  pronouns: string | null;
};

export default function ProfileBadges({ skillLevel, disciplines, pronouns }: Props) {
  const hasBadges = skillLevel || (disciplines && disciplines.length > 0) || pronouns;
  if (!hasBadges) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {skillLevel && (
        <View style={[styles.badge, styles.badgeOutlinedOrange]}>
          <Text style={[styles.label, { color: C.secondary }]}>
            {skillLevel.toUpperCase()}
          </Text>
        </View>
      )}
      {disciplines?.map((d) => (
        <View key={d} style={[styles.badge, styles.badgeOutlinedMuted]}>
          <Text style={[styles.label, { color: C.text }]}>{d.toUpperCase()}</Text>
        </View>
      ))}
      {pronouns && (
        <View style={[styles.badge, styles.badgeFilledOrange]}>
          <Text style={[styles.label, { color: C.onSecondary }]}>
            {pronouns.toUpperCase()}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 6,
    paddingVertical: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1.5,
  },
  badgeOutlinedOrange: {
    borderColor: C.secondary,
    backgroundColor: "transparent",
  },
  badgeOutlinedMuted: {
    borderColor: C.muted,
    backgroundColor: "transparent",
  },
  badgeFilledOrange: {
    borderColor: C.secondary,
    backgroundColor: C.secondary,
  },
  label: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 1,
  },
});
