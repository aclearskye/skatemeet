import { Text, View } from "react-native";
import type { TapeColors, TapeLabel } from "@/lib/shared/tapeLabels";
import { EntityTapeLabels } from "@/components/common/EntityTapeLabels";
import { TapeLabelInput } from "@/components/common/TapeLabelInput";
import { styles } from "./SpotLabelsInput.styles";

type Props = {
  value: TapeLabel[];
  onChange: (labels: TapeLabel[]) => void;
  typeLabel: string;
  typeColors: TapeColors;
  difficulty: number | null;
};

// The spot creation flow's labels section: the shared label input, then a
// preview row that always leads with the spot's type and difficulty tapes,
// exactly as the labels will appear on the map card and detail screen.
export function SpotLabelsInput({ value, onChange, typeLabel, typeColors, difficulty }: Props) {
  return (
    <View style={styles.container}>
      <TapeLabelInput value={value} onChange={onChange} />
      <EntityTapeLabels
        typeLabel={typeLabel}
        typeColors={typeColors}
        difficulty={difficulty}
        labels={value}
        onRemoveLabel={(index) => onChange(value.filter((_, i) => i !== index))}
        style={styles.preview}
      />
      {value.length > 0 && <Text style={styles.hint}>TAP A LABEL TO REMOVE IT</Text>}
    </View>
  );
}
