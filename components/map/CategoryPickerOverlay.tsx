import { C, F } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  bottom: number;
  onSelectSpot: () => void;
  onSelectDiy: () => void;
  onSelectStore: () => void;
  onCancel: () => void;
};

export function CategoryPickerOverlay({
  bottom,
  onSelectSpot,
  onSelectDiy,
  onSelectStore,
  onCancel,
}: Props) {
  return (
    <View style={[styles.categoryPicker, { bottom }]}>
      <Text style={styles.categoryTitle}>WHAT ARE YOU ADDING?</Text>
      <View style={styles.categoryOptions}>
        <TouchableOpacity
          style={[styles.categoryOption, { borderColor: C.primary }]}
          onPress={onSelectSpot}
          activeOpacity={0.8}
        >
          <Ionicons name="location-sharp" size={22} color={C.primary} />
          <Text style={[styles.categoryOptionText, { color: C.primary }]}>SKATE SPOT</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.categoryOption, { borderColor: C.tertiary }]}
          onPress={onSelectDiy}
          activeOpacity={0.8}
        >
          <Ionicons name="construct-sharp" size={22} color={C.tertiary} />
          <Text style={[styles.categoryOptionText, { color: C.tertiary }]}>DIY SPOT</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.categoryOption, { borderColor: C.secondary }]}
          onPress={onSelectStore}
          activeOpacity={0.8}
        >
          <Ionicons name="home-sharp" size={22} color={C.secondary} />
          <Text style={[styles.categoryOptionText, { color: C.secondary }]}>SKATE STORE</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.categoryCancel} onPress={onCancel}>
        <Text style={styles.categoryCancelText}>CANCEL</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  categoryPicker: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: C.bgLow,
    borderWidth: 2,
    borderColor: C.border,
    padding: 16,
    gap: 12,
  },
  categoryTitle: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 2,
    textAlign: "center",
  },
  categoryOptions: {
    gap: 8,
  },
  categoryOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 2,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: C.surface,
  },
  categoryOptionText: {
    fontFamily: F.mono,
    fontSize: 12,
    letterSpacing: 1,
  },
  categoryCancel: {
    borderWidth: 2,
    borderColor: C.border,
    paddingVertical: 12,
    alignItems: "center",
  },
  categoryCancelText: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    letterSpacing: 1,
  },
});
