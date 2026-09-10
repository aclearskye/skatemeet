import { C } from "@/lib/theme";
import { ScrollView, Text, View } from "react-native";
import { styles } from "./ProfileBadges.styles";

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
        <View style={[styles.badge, styles.badgeSkill]}>
          <Text style={[styles.label, { color: C.onSecondary }]}>
            {skillLevel.toUpperCase()}
          </Text>
        </View>
      )}
      {disciplines?.map((d) => (
        <View key={d} style={[styles.badge, styles.badgeDiscipline]}>
          <Text style={[styles.label, { color: C.onPrimary }]}>{d.toUpperCase()}</Text>
        </View>
      ))}
      {pronouns && (
        <View style={[styles.badge, styles.badgePronouns]}>
          <Text style={[styles.label, { color: C.onTertiary }]}>
            {pronouns.toUpperCase()}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
