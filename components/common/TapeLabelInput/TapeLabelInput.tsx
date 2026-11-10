import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  finalizeLabelText,
  isValidLabelText,
  MAX_TAPE_LABELS,
  MAX_TAPE_LABEL_LENGTH,
  sanitizeLabelInput,
  TAPE_LABEL_COLOR_KEYS,
  TAPE_LABEL_COLORS,
  TapeLabel,
  TapeLabelColor,
} from "@/lib/shared/tapeLabels";
import { C } from "@/lib/theme";
import { styles } from "./TapeLabelInput.styles";

type Props = {
  value: TapeLabel[];
  onChange: (labels: TapeLabel[]) => void;
};

// Text field + brand-colour picker for adding one-word (hyphens allowed)
// duct-tape labels to a list. Shared by the spot creation flow and the
// profile editor; each shows its own preview row with remove buttons.
export function TapeLabelInput({ value, onChange }: Props) {
  const [draft, setDraft] = useState("");
  const [color, setColor] = useState<TapeLabelColor>("primary");
  const [error, setError] = useState<string | null>(null);

  const isFull = value.length >= MAX_TAPE_LABELS;

  function handleAdd() {
    const text = finalizeLabelText(draft);
    if (!isValidLabelText(text)) {
      setError("One word — letters, numbers and hyphens only.");
      return;
    }
    if (value.some((l) => l.text === text)) {
      setError("That label's already on this spot.");
      return;
    }
    if (isFull) return;
    onChange([...value, { text, color }]);
    setDraft("");
    setError(null);
  }

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder={isFull ? `Max ${MAX_TAPE_LABELS} labels` : "e.g. kinked-rail"}
          placeholderTextColor={C.muted}
          value={draft}
          onChangeText={(t) => {
            setDraft(sanitizeLabelInput(t));
            setError(null);
          }}
          onSubmitEditing={handleAdd}
          maxLength={MAX_TAPE_LABEL_LENGTH}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          editable={!isFull}
          accessibilityLabel="New label"
        />
        <TouchableOpacity
          style={[
            styles.addBtn,
            { backgroundColor: TAPE_LABEL_COLORS[color].bg },
            (isFull || draft.length === 0) && styles.addBtnDisabled,
          ]}
          onPress={handleAdd}
          disabled={isFull || draft.length === 0}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Add label"
        >
          <Ionicons name="add" size={20} color={TAPE_LABEL_COLORS[color].fg} />
        </TouchableOpacity>
      </View>

      <View style={styles.swatchRow} accessibilityRole="radiogroup" accessibilityLabel="Label colour">
        {TAPE_LABEL_COLOR_KEYS.map((key) => {
          const selected = key === color;
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.swatch,
                { backgroundColor: TAPE_LABEL_COLORS[key].bg },
                selected && styles.swatchSelected,
              ]}
              onPress={() => setColor(key)}
              activeOpacity={0.8}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={TAPE_LABEL_COLORS[key].name}
            >
              {selected && (
                <Ionicons name="checkmark" size={16} color={TAPE_LABEL_COLORS[key].fg} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {error != null && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}
