import { Modal, Platform, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { PhotoSource } from "@/lib/storage";
import { C } from "@/lib/theme";
import { styles } from "./PhotoSourceSheet.styles";

// A little over the fade-out of a Modal with animationType="fade".
const SHEET_DISMISS_MS = 400;

type Props = {
  visible: boolean;
  accent: string;
  onAccent: string;
  onPick: (source: PhotoSource) => void;
  onClose: () => void;
};

// "Take a photo or pick one?" -- native only (web goes straight to the
// browser's file picker). Same bottom sheet as ConfirmDialog.
export function PhotoSourceSheet({ visible, accent, onAccent, onPick, onClose }: Props) {
  const insets = useSafeAreaInsets();

  function choose(source: PhotoSource) {
    onClose();
    // iOS can't present the camera / photo picker while this sheet is still
    // animating out (the picker silently never opens), so wait for it.
    setTimeout(() => onPick(source), Platform.OS === "ios" ? SHEET_DISMISS_MS : 0);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: 24 + insets.bottom }]}>
          <Text style={styles.title}>ADD A PHOTO</Text>
          <TouchableOpacity
            style={[styles.option, { backgroundColor: accent, borderColor: accent }]}
            onPress={() => choose("camera")}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Ionicons name="camera" size={18} color={onAccent} />
            <Text style={[styles.optionText, { color: onAccent }]}>TAKE PHOTO</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.option}
            onPress={() => choose("library")}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Ionicons name="images-outline" size={18} color={C.text} />
            <Text style={styles.optionText}>CHOOSE FROM LIBRARY</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancel} onPress={onClose} activeOpacity={0.75} accessibilityRole="button">
            <Text style={styles.cancelText}>CANCEL</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
