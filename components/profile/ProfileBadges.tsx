import { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { TAPE_LABEL_COLORS, type TapeLabel } from "@/lib/shared/tapeLabels";
import { C } from "@/lib/theme";
import { TapeChip } from "@/components/common/TapeChip";
import { styles } from "./ProfileBadges.styles";

const SKILL_COLORS = { bg: C.secondary, fg: C.onSecondary };
const DISCIPLINE_COLORS = { bg: C.primary, fg: C.onPrimary };
const PRONOUN_COLORS = { bg: C.tertiary, fg: C.onTertiary };

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
        <TapeChip
          text={skillLevel}
          colors={SKILL_COLORS}
          size="lg"
          accessibilityLabel={`Skill level: ${skillLevel}`}
        />
      )}
      {disciplines?.map((d) => (
        <TapeChip
          key={d}
          text={d}
          colors={DISCIPLINE_COLORS}
          size="lg"
          accessibilityLabel={`Discipline: ${d}`}
        />
      ))}
      {pronouns && (
        <TapeChip
          text={pronouns}
          colors={PRONOUN_COLORS}
          size="lg"
          accessibilityLabel={`Pronouns: ${pronouns}`}
        />
      )}
      {labels.map((label, index) => (
        <TapeChip
          key={label.text}
          text={label.text}
          colors={TAPE_LABEL_COLORS[label.color]}
          size="lg"
          removable={!!onRemoveLabel}
          onPress={onRemoveLabel ? () => onRemoveLabel(index) : undefined}
          accessibilityLabel={`Label: ${label.text}`}
          accessibilityHint={onRemoveLabel ? "Double-tap to remove" : undefined}
        />
      ))}
    </>
  );

  if (wrap) return <View style={[styles.row, styles.rowWrap]}>{tapes}</View>;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {tapes}
    </ScrollView>
  );
}
