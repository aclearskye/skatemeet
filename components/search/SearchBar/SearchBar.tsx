import { Ionicons } from "@expo/vector-icons";
import { TextInput, TouchableOpacity, View } from "react-native";
import { C } from "@/lib/theme";
import { styles } from "./SearchBar.styles";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
};

export function SearchBar({ value, onChangeText }: Props) {
  return (
    <View style={styles.searchRow}>
      <Ionicons name="search-outline" size={16} color={C.muted} style={styles.searchIcon} />
      <TextInput
        style={styles.searchInput}
        placeholder="Search skaters…"
        placeholderTextColor={C.muted}
        value={value}
        onChangeText={onChangeText}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText("")} hitSlop={8} activeOpacity={0.7}>
          <Ionicons name="close-circle" size={16} color={C.muted} />
        </TouchableOpacity>
      )}
    </View>
  );
}
