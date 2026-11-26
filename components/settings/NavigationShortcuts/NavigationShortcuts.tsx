import { useState } from "react";
import { Switch, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSetTabShortcuts } from "@/lib/navigation/hooks/useSetTabShortcuts";
import { useTabShortcuts } from "@/lib/navigation/hooks/useTabShortcuts";
import {
  availableShortcuts,
  isScreenTab,
  MAX_TABS,
  MIN_TABS,
  startTab,
  TAB_SHORTCUTS,
  type TabShortcutKey,
} from "@/lib/navigation/types";
import { C } from "@/lib/theme";
import { styles } from "./NavigationShortcuts.styles";

// Settings, Customise navigation (iOS and Android): a dropdown to pick
// which side-drawer items sit in the bottom bar, 2 to 5 of them. They keep
// a fixed order. Saved on this device.
export function NavigationShortcuts() {
  const [open, setOpen] = useState(false);
  const { keys } = useTabShortcuts();
  const summary = TAB_SHORTCUTS.filter((item) => keys.includes(item.key))
    .map((item) => item.label)
    .join(" · ");

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <View style={styles.headerText}>
          <Text style={styles.title}>CUSTOMISE NAVIGATION</Text>
          <Text style={styles.summary} numberOfLines={1}>
            {summary}
          </Text>
        </View>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={C.muted} />
      </TouchableOpacity>

      {open ? <ShortcutPicker /> : null}
    </View>
  );
}

function ShortcutPicker() {
  const { keys, customised, isApprovedStore } = useTabShortcuts();
  const setShortcuts = useSetTabShortcuts();
  const options = availableShortcuts(isApprovedStore);
  const full = keys.length >= MAX_TABS;
  const atMinimum = keys.length <= MIN_TABS;

  const toggle = (key: TabShortcutKey, on: boolean) => {
    const next = on ? [...keys, key] : keys.filter((k) => k !== key);
    // Saved in bar order, whatever order they're picked in.
    setShortcuts.mutate(TAB_SHORTCUTS.map((item) => item.key).filter((k) => next.includes(k)));
  };

  return (
    <View style={styles.body}>
      <Text style={styles.hint}>
        Pick {MIN_TABS} to {MAX_TABS} shortcuts for the bar at the bottom of the screen. Everything is still in the side
        menu. {keys.length} of {MAX_TABS} picked. The app opens on {startTab(keys).label}.
      </Text>

      {options.map((item) => {
        const on = keys.includes(item.key);
        // The last real tab screen stays: the app opens on it.
        const lastScreen = on && isScreenTab(item.key) && keys.filter(isScreenTab).length === 1;
        const locked = on ? atMinimum || lastScreen : full;
        return (
          <View key={item.key} style={styles.row}>
            <Ionicons name={item.icon} size={20} color={on ? C.primary : C.muted} />
            <Text style={[styles.label, !on && styles.labelOff]}>{item.label.toUpperCase()}</Text>
            <Switch
              value={on}
              onValueChange={(value) => toggle(item.key, value)}
              disabled={locked}
              trackColor={{ false: C.surfaceHigh, true: C.primary }}
              thumbColor={C.text}
              accessibilityLabel={`${item.label} in the bottom bar`}
            />
          </View>
        );
      })}

      {full ? <Text style={styles.note}>The bar is full. Turn one off to add another.</Text> : null}
      {customised ? (
        <TouchableOpacity onPress={() => setShortcuts.mutate(null)} activeOpacity={0.7} style={styles.reset}>
          <Ionicons name="refresh-outline" size={16} color={C.muted} />
          <Text style={styles.resetText}>RESET TO DEFAULT</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
