import BurgerButton from "@/components/ui/BurgerButton";
import { C, F } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
};

export function MapSearchBar({ value, onChangeText }: Props) {
  return (
    <View style={styles.searchAndMenu}>
      <View style={[styles.searchRow, { flex: 1 }]}>
        <Ionicons name="search-outline" size={16} color={C.muted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search spots, DIYs, stores…"
          placeholderTextColor={C.muted}
          value={value}
          onChangeText={onChangeText}
          returnKeyType="search"
        />
        {/* clearButtonMode is iOS-only, so Android/web need an explicit button */}
        {value.length > 0 && (
          <TouchableOpacity
            onPress={() => onChangeText("")}
            hitSlop={8}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={16} color={C.muted} />
          </TouchableOpacity>
        )}
      </View>
      <BurgerButton />
    </View>
  );
}

const styles = StyleSheet.create({
  searchAndMenu: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bg,
    borderWidth: 2,
    borderColor: C.border,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    color: C.text,
    fontFamily: F.body,
    fontSize: 14,
    padding: 0,
  },
});
