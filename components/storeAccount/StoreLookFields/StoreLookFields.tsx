import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { accentColors, STORE_KIND_LABEL, STORE_KINDS, type StorePageStyle } from "@/lib/storeAccounts/pageStyle";
import { TAPE_LABEL_COLOR_KEYS, TAPE_LABEL_COLORS } from "@/lib/shared/tapeLabels";
import { EntityTapeLabels } from "@/components/common/EntityTapeLabels";
import { TapeChip } from "@/components/common/TapeChip";
import { TapeLabelInput } from "@/components/common/TapeLabelInput";
import { styles } from "./StoreLookFields.styles";

type Props = {
  style: StorePageStyle;
  onChange: (patch: Partial<StorePageStyle>) => void;
};

// What kind of place it is, the duct-tape labels on the page's hero, and
// the page's accent colour, with a live preview of the hero tape.
export function StoreLookFields({ style, onChange }: Props) {
  const accent = accentColors(style.accent);

  return (
    <View style={styles.container}>
      <View style={styles.preview}>
        <Text style={styles.label}>PREVIEW</Text>
        <EntityTapeLabels
          typeLabel={STORE_KIND_LABEL[style.storeKind]}
          typeColors={accent}
          labels={style.tapeLabels}
          onRemoveLabel={(index) => onChange({ tapeLabels: style.tapeLabels.filter((_, i) => i !== index) })}
        />
        {style.tapeLabels.length > 0 ? <Text style={styles.hint}>Tap a label to remove it.</Text> : null}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>WHAT YOU ARE</Text>
        <View style={styles.chips} accessibilityRole="radiogroup">
          {STORE_KINDS.map((kind) => (
            <TapeChip
              key={kind}
              text={STORE_KIND_LABEL[kind]}
              colors={accent}
              active={style.storeKind === kind}
              onPress={() => onChange({ storeKind: kind })}
              accessibilityRole="radio"
              accessibilityState={{ checked: style.storeKind === kind }}
            />
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>YOUR TAPE LABELS</Text>
        <Text style={styles.hint}>Up to 5 one-word labels, e.g. indoor, bowl, est-2012. Only you can set these.</Text>
        <TapeLabelInput value={style.tapeLabels} onChange={(tapeLabels) => onChange({ tapeLabels })} />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>PAGE COLOUR</Text>
        <Text style={styles.hint}>Used for your type tape, buttons and links.</Text>
        <View style={styles.swatches} accessibilityRole="radiogroup" accessibilityLabel="Page colour">
          {TAPE_LABEL_COLOR_KEYS.map((key) => {
            const selected = style.accent === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.swatch, { backgroundColor: TAPE_LABEL_COLORS[key].bg }, selected && styles.swatchSelected]}
                onPress={() => onChange({ accent: key })}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={TAPE_LABEL_COLORS[key].name}
              >
                {selected ? <Ionicons name="checkmark" size={18} color={TAPE_LABEL_COLORS[key].fg} /> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}
