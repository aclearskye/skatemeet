import { C, F } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity } from "react-native";

type Props = {
  entityLabel: string;
  onDelete: () => Promise<void>;
};

export function DeleteUnverifiedButton({ entityLabel, onDelete }: Props) {
  const [isDeleting, setIsDeleting] = useState(false);

  function handlePress() {
    Alert.alert(
      `Delete this ${entityLabel}?`,
      "This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: confirmDelete },
      ]
    );
  }

  async function confirmDelete() {
    setIsDeleting(true);
    try {
      await onDelete();
    } catch {
      setIsDeleting(false);
    }
  }

  return (
    <TouchableOpacity
      style={styles.btn}
      onPress={handlePress}
      disabled={isDeleting}
      activeOpacity={0.75}
    >
      <Ionicons name="trash-outline" size={15} color={C.error} />
      <Text style={styles.text}>
        {isDeleting ? "DELETING…" : `DELETE ${entityLabel.toUpperCase()}`}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    marginTop: 4,
    borderWidth: 2,
    borderColor: C.errorBorder,
  },
  text: { fontFamily: F.mono, fontSize: 12, letterSpacing: 1, color: C.error },
});
