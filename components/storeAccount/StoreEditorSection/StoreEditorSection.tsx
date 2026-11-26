import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { styles } from "./StoreEditorSection.styles";

type Props = {
  title: string;
  hint?: string;
  // "card" boxes plain fields. "group" only titles a set of children that
  // are cards themselves (the Money tab's panels).
  variant?: "card" | "group";
  children: ReactNode;
};

// A titled section of the store's Profile tab.
export function StoreEditorSection({ title, hint, variant = "card", children }: Props) {
  return (
    <View style={[styles.section, variant === "card" && styles.card]}>
      <View style={styles.heading}>
        <Text style={styles.title}>{title}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}
