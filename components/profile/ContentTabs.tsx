import { C } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity, View } from "react-native";

const TABS: { icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap }[] = [
  { icon: "grid-outline", activeIcon: "grid" },
  { icon: "pricetag-outline", activeIcon: "pricetag" },
  { icon: "bookmark-outline", activeIcon: "bookmark" },
];

type Props = {
  activeTab: number;
  onTabChange: (index: number) => void;
};

export default function ContentTabs({ activeTab, onTabChange }: Props) {
  return (
    <View style={styles.row}>
      {TABS.map((tab, i) => {
        const isActive = activeTab === i;
        return (
          <TouchableOpacity
            key={i}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => onTabChange(i)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isActive ? tab.activeIcon : tab.icon}
              size={22}
              color={isActive ? C.primary : C.muted}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: C.border,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: C.primary,
  },
});
