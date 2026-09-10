import { TriStateToggle } from "@/components/common/TriStateToggle";
import { C, TAPE } from "@/lib/theme";
import { Text, TouchableOpacity, View } from "react-native";
import { FacilitiesSelect } from "./FacilitiesSelect";
import { OpeningHoursInput } from "./OpeningHoursInput";
import { ParkingSelect } from "./ParkingSelect";
import { styles } from "./EntityMetadataStep.styles";
import { MetadataFormState } from "./metadataFormState";

type Props = {
  value: MetadataFormState;
  onChange: (value: MetadataFormState) => void;
  accent: string;
  onSkip?: () => void;
};

export function EntityMetadataStep({ value, onChange, accent, onSkip }: Props) {
  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.fieldLabel}>OPENING HOURS</Text>
        {onSkip && (
          <TouchableOpacity onPress={onSkip} hitSlop={8}>
            <Text style={[styles.skipLink, { color: accent }]}>Skip for now</Text>
          </TouchableOpacity>
        )}
      </View>
      <OpeningHoursInput
        value={value.openingHours}
        onChange={(openingHours) => onChange({ ...value, openingHours })}
      />

      <Text style={[styles.fieldLabel, styles.spaced]}>FACILITIES</Text>
      <FacilitiesSelect
        value={value.facilities}
        onChange={(facilities) => onChange({ ...value, facilities })}
        accent={C.primary}
        onAccent={C.onPrimary}
        rotate={TAPE.rotatePrimary}
      />

      <Text style={[styles.fieldLabel, styles.spaced]}>PARKING</Text>
      <ParkingSelect
        value={value.parking}
        onChange={(parking) => onChange({ ...value, parking })}
        accent={C.tertiary}
        onAccent={C.onTertiary}
        rotate={TAPE.rotateTertiary}
      />

      <View style={styles.toggles}>
        <TriStateToggle
          label="PET FRIENDLY"
          value={value.petFriendly}
          onChange={(petFriendly) => onChange({ ...value, petFriendly })}
          accent={C.secondary}
          onAccent={C.onSecondary}
        />
        <TriStateToggle
          label="PAID"
          value={value.paid}
          onChange={(paid) => onChange({ ...value, paid })}
          accent={C.secondary}
          onAccent={C.onSecondary}
        />
        <TriStateToggle
          label="WELL LIT"
          value={value.wellLit}
          onChange={(wellLit) => onChange({ ...value, wellLit })}
          accent={C.secondary}
          onAccent={C.onSecondary}
        />
      </View>
    </View>
  );
}
