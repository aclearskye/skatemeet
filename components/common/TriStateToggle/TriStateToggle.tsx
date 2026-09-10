import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "./TriStateToggle.styles";

type Props = {
  label: string;
  value: boolean | null;
  onChange: (value: boolean | null) => void;
  accent: string;
  onAccent: string;
};

export function TriStateToggle({ label, value, onChange, accent, onAccent }: Props) {
  const options: { key: boolean | null; text: string }[] = [
    { key: null, text: "UNKNOWN" },
    { key: true, text: "YES" },
    { key: false, text: "NO" },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.group}>
        {options.map((option, i) => {
          const selected = value === option.key;
          return (
            <TouchableOpacity
              key={String(option.key)}
              style={[
                styles.segment,
                i < options.length - 1 && styles.segmentDivider,
                selected && { backgroundColor: accent },
              ]}
              onPress={() => onChange(option.key)}
              activeOpacity={0.75}
            >
              <Text style={[styles.segmentText, selected && { color: onAccent }]}>
                {option.text}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
