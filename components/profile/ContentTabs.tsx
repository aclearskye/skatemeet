import { C } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity, View } from "react-native";

const TABS: { icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap }[] = [
  { icon: "grid-outline", activeIcon: "grid" }, // My Posts
  { icon: "pricetag-outline", activeIcon: "pricetag" }, // Tagged in
  { icon: "bookmark-outline", activeIcon: "bookmark" }, // Saved
];

type Props = {
  activeTab: number;
  onTabChange: (index: number) => void;
  // Saved (the third tab) is private to the profile's owner.
  showSaved: boolean;
};

// My Posts / Tagged in / Saved.
export default function ContentTabs({ activeTab, onTabChange, showSaved }: Props) {
  const tabs = showSaved ? TABS : TABS.slice(0, 2);
  return (
    <View style={styles.row}>
      {tabs.map((tab, i) => {
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
    borderColor: C.borderVariant,
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
