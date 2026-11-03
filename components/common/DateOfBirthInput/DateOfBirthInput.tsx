import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import type { DateOfBirth } from "@/lib/auth/ageGate";
import { C } from "@/lib/theme";
import { styles } from "./DateOfBirthInput.styles";

type Field = keyof DateOfBirth;

type Props = {
  value: DateOfBirth;
  onChange: (value: DateOfBirth) => void;
};

// A neutral prompt -- it never states the minimum age, so it can't be
// gamed by reading the rule first. The date itself never leaves the device.
export function DateOfBirthInput({ value, onChange }: Props) {
  const [focused, setFocused] = useState<Field | null>(null);

  function field(name: Field, placeholder: string, maxLength: number, sizeStyle: object) {
    return (
      <TextInput
        style={[styles.field, sizeStyle, focused === name && styles.fieldFocused]}
        value={value[name]}
        onChangeText={(text) => onChange({ ...value, [name]: text.replace(/\D/g, "") })}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        keyboardType="number-pad"
        maxLength={maxLength}
        onFocus={() => setFocused(name)}
        onBlur={() => setFocused(null)}
        accessibilityLabel={`Birth ${name}`}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>DATE OF BIRTH</Text>
      <View style={styles.row}>
        {field("day", "DD", 2, styles.short)}
        {field("month", "MM", 2, styles.short)}
        {field("year", "YYYY", 4, styles.long)}
      </View>
    </View>
  );
}
