import { useState } from "react";
import { Text, TextInput, View, type TextInputProps } from "react-native";
import { C } from "@/lib/theme";
import { styles } from "./StoreTextField.styles";

type Props = Omit<TextInputProps, "style"> & {
  label: string;
  hint?: string;
};

// A labelled underline input, matching the Login/SignUp fields.
export function StoreTextField({ label, hint, onFocus, onBlur, ...inputProps }: Props) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...inputProps}
        style={[styles.input, isFocused && styles.inputFocused, inputProps.multiline && styles.inputMultiline]}
        placeholderTextColor={C.muted}
        onFocus={(event) => {
          setIsFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setIsFocused(false);
          onBlur?.(event);
        }}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}
