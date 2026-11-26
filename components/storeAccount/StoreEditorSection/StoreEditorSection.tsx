import { useState, type ReactNode } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "@/lib/theme";
import { styles } from "./StoreEditorSection.styles";

type Props = {
  title: string;
  // One line under the title while closed: what's set now ("Closed Sat…").
  summary?: string;
  // Shown inside once open.
  hint?: string;
  defaultOpen?: boolean;
  // A dot on the header: something here needs the owner.
  attention?: boolean;
  // "card" boxes plain fields. "group" holds children that are cards
  // themselves (the Money tab's panels), so it doesn't add a box around them.
  variant?: "card" | "group";
  children: ReactNode;
};

// A dropdown section of the store's Profile tab: a header that opens and
// closes, so the tab reads as a short list until the owner picks one.
// Closed sections stay mounted, so unsaved edits inside survive.
export function StoreEditorSection({
  title,
  summary,
  hint,
  defaultOpen = false,
  attention = false,
  variant = "card",
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const isGroup = variant === "group";

  return (
    <View style={[styles.section, !isGroup && styles.card]}>
      <TouchableOpacity
        style={[styles.header, isGroup && styles.groupHeader]}
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={attention ? `${title}, needs attention` : title}
      >
        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{title}</Text>
            {attention ? <View style={styles.dot} /> : null}
          </View>
          {summary && !open ? (
            <Text style={styles.summary} numberOfLines={1}>
              {summary}
            </Text>
          ) : null}
        </View>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={C.muted} />
      </TouchableOpacity>

      <View style={[styles.body, isGroup && styles.groupBody, !open && styles.hidden]}>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        {children}
      </View>
    </View>
  );
}
