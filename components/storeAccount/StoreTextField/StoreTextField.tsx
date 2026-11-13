import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View, type TextInputProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "@/lib/theme";
import { styles } from "./StoreTextField.styles";

type Props = Omit<TextInputProps, "style"> & {
  label: string;
  hint?: string;
  // Shows an eye button that calls this. Pair with secureTextEntry; the
  // screen holds the visibility so one toggle can cover a confirm field too.
  onToggleSecureEntry?: () => void;
};

// A labelled underline input, matching the Login/SignUp fields.
export function StoreTextField({ label, hint, onFocus, onBlur, onToggleSecureEntry, ...inputProps }: Props) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.field, isFocused && styles.fieldFocused]}>
        <TextInput
          {...inputProps}
          style={[styles.input, inputProps.multiline && styles.inputMultiline]}
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
        {onToggleSecureEntry ? (
          <TouchableOpacity
            onPress={onToggleSecureEntry}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={inputProps.secureTextEntry ? "Show password" : "Hide password"}
          >
            <Ionicons name={inputProps.secureTextEntry ? "eye-outline" : "eye-off-outline"} size={18} color={C.muted} />
          </TouchableOpacity>
        ) : null}
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}
