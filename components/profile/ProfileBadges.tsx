import { Ionicons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import { TAPE_LABEL_COLORS, type TapeLabel } from "@/lib/shared/tapeLabels";
import { C } from "@/lib/theme";
import { DuctTapeLabel } from "@/components/common/DuctTapeLabel";
import { styles } from "./ProfileBadges.styles";

type Props = {
  skillLevel: string | null;
  disciplines: string[] | null;
  pronouns: string | null;
  // Custom one-word labels, always after the badges above.
  labels?: TapeLabel[];
  // Editor preview: custom labels become tap-to-remove.
  onRemoveLabel?: (index: number) => void;
  // Wrap onto more lines instead of scrolling sideways (editor preview).
  wrap?: boolean;
};

// The duct-tape row on a profile: skill level, disciplines, pronouns, then
// the skater's own labels.
export default function ProfileBadges({
  skillLevel,
  disciplines,
  pronouns,
  labels = [],
  onRemoveLabel,
  wrap = false,
}: Props) {
  const hasBadges =
    skillLevel || (disciplines && disciplines.length > 0) || pronouns || labels.length > 0;
  if (!hasBadges) return null;

  const tapes: ReactNode = (
    <>
      {skillLevel && (
        <DuctTapeLabel color={C.secondary} style={styles.badge} accessibilityLabel={`Skill level: ${skillLevel}`}>
          <Text style={[styles.label, { color: C.onSecondary }]}>
            {skillLevel.toUpperCase()}
          </Text>
        </DuctTapeLabel>
      )}
      {disciplines?.map((d) => (
        <DuctTapeLabel key={d} color={C.primary} style={styles.badge} accessibilityLabel={`Discipline: ${d}`}>
          <Text style={[styles.label, { color: C.onPrimary }]}>{d.toUpperCase()}</Text>
        </DuctTapeLabel>
      ))}
      {pronouns && (
        <DuctTapeLabel color={C.tertiary} style={styles.badge} accessibilityLabel={`Pronouns: ${pronouns}`}>
          <Text style={[styles.label, { color: C.onTertiary }]}>
            {pronouns.toUpperCase()}
          </Text>
        </DuctTapeLabel>
      )}
      {labels.map((label, index) => {
        const colors = TAPE_LABEL_COLORS[label.color];
        return (
          <DuctTapeLabel
            key={label.text}
            color={colors.bg}
            style={[styles.badge, styles.badgeRow]}
            onPress={onRemoveLabel ? () => onRemoveLabel(index) : undefined}
            accessibilityLabel={`Label: ${label.text}`}
            accessibilityHint={onRemoveLabel ? "Double-tap to remove" : undefined}
          >
            <Text style={[styles.label, { color: colors.fg }]}>{label.text.toUpperCase()}</Text>
            {onRemoveLabel && <Ionicons name="close" size={12} color={colors.fg} />}
          </DuctTapeLabel>
        );
      })}
    </>
  );

  if (wrap) return <View style={[styles.row, styles.rowWrap]}>{tapes}</View>;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {tapes}
    </ScrollView>
  );
}
