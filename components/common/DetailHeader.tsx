import { C, F } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  title: string;
  accent: string;
  isFavorited: boolean;
  isTogglingFavorite?: boolean;
  onBack: () => void;
  onToggleFavorite: () => void;
};

export function DetailHeader({
  title,
  accent,
  isFavorited,
  isTogglingFavorite,
  onBack,
  onToggleFavorite,
}: Props) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} hitSlop={12} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color={C.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <TouchableOpacity
        onPress={onToggleFavorite}
        hitSlop={12}
        style={styles.favBtn}
        disabled={isTogglingFavorite}
      >
        <Ionicons
          name={isFavorited ? "heart" : "heart-outline"}
          size={22}
          color={isFavorited ? accent : C.muted}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: C.border,
  },
  backBtn: { width: 30 },
  favBtn: { width: 30, alignItems: "flex-end" },
  headerTitle: { fontFamily: F.mono, fontSize: 11, color: C.muted, letterSpacing: 2 },
});
