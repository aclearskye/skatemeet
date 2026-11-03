import { DuctTapeLabel } from "@/components/common/DuctTapeLabel";
import { C } from "@/lib/theme";
import { ScrollView, Text } from "react-native";
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
        <DuctTapeLabel color={C.secondary} style={styles.badge}>
          <Text style={[styles.label, { color: C.onSecondary }]}>
            {skillLevel.toUpperCase()}
          </Text>
        </DuctTapeLabel>
      )}
      {disciplines?.map((d) => (
        <DuctTapeLabel key={d} color={C.primary} style={styles.badge}>
          <Text style={[styles.label, { color: C.onPrimary }]}>{d.toUpperCase()}</Text>
        </DuctTapeLabel>
      ))}
      {pronouns && (
        <DuctTapeLabel color={C.tertiary} style={styles.badge}>
          <Text style={[styles.label, { color: C.onTertiary }]}>
            {pronouns.toUpperCase()}
          </Text>
        </DuctTapeLabel>
      )}
    </ScrollView>
  );
}
